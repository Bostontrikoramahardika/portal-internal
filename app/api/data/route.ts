// app/api/data/route.ts (v1.5.1 - Fix TypeScript warnings)

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'
import { hasPermission } from '@/app/lib/permissions'
import { getTablePermissions } from '@/app/lib/tablePermissions'
import { getWitaToday } from '@/app/lib/timezone'

const NAME_BASED_TABLES = ['bpjs', 'apd_history', 'attendance_evidences']
const HIDDEN_COLUMNS = ['created_at', 'updated_at', 'id', 'nrp', 'atasan_nrp', 'pjo_nrp', 'employee_nrp', 'uploaded_by']
const PRIORITY_COLUMNS = ['_nama_karyawan', '_jabatan', '_site', '_departemen']
const SECONDARY_COLUMNS = ['_nama_atasan', '_nama_pjo']


// ========================================================
// 🕐 HELPER: Deteksi Shift dari Jam Clock In
// ========================================================
function detectShiftFromClockIn(clockInTime: string, siteConfig?: any): string {
  if (!clockInTime || clockInTime === '00:00' || clockInTime === '--:--') return 'HADIR'
  
  const jam = parseInt(clockInTime.split(':')[0])
  if (isNaN(jam)) return 'HADIR'

  const siangStart = siteConfig?.siang_jam_masuk ? parseInt(siteConfig.siang_jam_masuk.split(':')[0]) : 6
  const malamStart = siteConfig?.malam_jam_masuk ? parseInt(siteConfig.malam_jam_masuk.split(':')[0]) : 18

  if (jam >= siangStart && jam < malamStart) {
    return 'SIANG'
  }
  return 'MALAM'
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const menuKey = searchParams.get('menu') || ''

    const { data: menusFound } = await supabase.from('menus').select('*').eq('menu_key', menuKey).eq('active', true)
    if (!menusFound || menusFound.length === 0) return NextResponse.json({ error: 'Menu tidak ditemukan' }, { status: 404 })

    const rolesLower = (session.roles || []).map((r: string) => r.toLowerCase())
    const isSuperAdmin = session.is_super_admin || false
    
    const menuInfo = isSuperAdmin 
      ? menusFound[0] 
      : menusFound.find((m: any) => rolesLower.some((r: string) => r === (m.role || '').toLowerCase()))
    
    if (!menuInfo) return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })

    const { target_table, access_mode, menu_label } = menuInfo
    
  const isHrgaAll = isSuperAdmin || rolesLower.some((r: string) => ['hr_ho', 'hrga_oprek', 'hrga_pusat', 'hrga', 'admin'].includes(r))
const isHrgaSite = rolesLower.some((r: string) => ['hr_site', 'hrga_site', 'admin_site'].includes(r))
    const isAdminPlant = rolesLower.includes('admin_plant')
    const isSiteScoped = isHrgaSite || isAdminPlant
    const userSite = session.scope_site || session.site || '_'

    // ==========================================
    // 🎯 CASE A: RIWAYAT ABSENSI SAYA
    // ==========================================
    if (menuKey === 'riwayat_absensi' || menuKey === 'roster_saya') {
      const nrpString = String(session.nrp).trim()
      const nrpWithZero = nrpString.startsWith('0') ? nrpString : '0' + nrpString

      const { data: rosters } = await supabase.from('rosters').select('*').in('nrp', [nrpString, nrpWithZero]).order('tanggal', { ascending: false }).limit(62)
      const { data: attendance } = await supabase.from('attendance').select('*').in('nrp', [nrpString, nrpWithZero])
      const { data: evidences } = await supabase.from('attendance_evidences').select('*').ilike('nama_karyawan', session.nama)

      const { data: siteConfig } = await supabase
        .from('sites_config')
        .select('siang_jam_masuk, malam_jam_masuk')
        .eq('nama_site', session.site)
        .single()

      const finalRows = (rosters || []).map((r: any) => {
        const absensi = attendance?.find((a: any) => String(a.tanggal) === String(r.tanggal))
        const buktiSakit = evidences?.find((e: any) => String(e.tanggal) === String(r.tanggal))
        let actual = "-"; let evident = "-"; let keterangan = ""

        if (absensi) {
          const jamMasuk = absensi.clock_in?.split('T')[1]?.slice(0,5) || '--:--'
          const jamPulang = absensi.clock_out?.split('T')[1]?.slice(0,5) || '--:--'
          actual = detectShiftFromClockIn(jamMasuk, siteConfig)
          evident = `${jamMasuk} / ${jamPulang}`
          keterangan = absensi.status === 'TERLAMBAT' ? '⚠️ TERLAMBAT' : '✅ SUKSES'
        } 
        else if (buktiSakit) {
          actual = "SAKIT"
          evident = buktiSakit.foto_url
          keterangan = buktiSakit.keterangan || "SAKIT"
        } 
        else {
          if (r.shift_code === 'OFF') { 
            actual = "OFF"; keterangan = "-" 
          }
          else if (['S', 'M', 'P', 'L'].includes(r.shift_code)) { 
            actual = "MANGKIR"; keterangan = "TIDAK ADA ABSENSI" 
          }
          else { 
            actual = r.shift_code || "-"; keterangan = "IZIN / CUTI" 
          }
        }
        return { tanggal: r.tanggal, roster: r.shift_code, actual, evident, keterangan, is_foto: !!buktiSakit }
      })
      return NextResponse.json({ type: 'riwayat_absensi_custom', title: menu_label, rows: finalRows })
    }

    // ==========================================
    // 🎯 CASE B: KPI RAPORT (70/30)
    // ==========================================
    if (menuKey === 'kpi' || menuKey === 'kelola_kpi' || menuKey === 'kpi_saya') {
      let q = supabase.from('kpi').select('*').order('created_at', { ascending: false })
      if (menuKey === 'kpi_saya') q = q.eq('nrp', session.nrp)

      const { data: kpiRows } = await q
      const { data: emps } = await supabase.from('employees').select('nrp, nama, site, jabatan')
      
      let enrichedKpi = (kpiRows || []).map((k: any) => {
        const emp = emps?.find((e: any) => e.nrp === k.nrp)
        const totalPerforma = (Number(k.cat_kinerja) || 0) + (Number(k.cat_sikap) || 0) + (Number(k.cat_disiplin) || 0)
        return {
          ...k,
          _nama_karyawan: emp?.nama || k.nrp,
          _jabatan: emp?.jabatan || '-',
          _site: emp?.site || '-',
          nilai_sistem: Math.round((k.nilai_sistem || 0) * 10) / 10,
          nilai_performa: totalPerforma,
          nilai_akhir: Math.round(((Number(k.nilai_sistem) || 0) + totalPerforma) * 10) / 10,
          pelanggaran: k.pelanggaran || '-'
        }
      })

      if (menuKey !== 'kpi_saya' && isSiteScoped) {
        enrichedKpi = enrichedKpi.filter((k: any) => k._site === userSite)
      }

      return NextResponse.json({
        type: menuKey === 'kpi_saya' ? 'kpi_saya' : 'table',
        title: menu_label, rows: enrichedKpi,
        columns: ['nrp', '_nama_karyawan', '_site', 'periode', 'nilai_performa', 'nilai_sistem', 'nilai_akhir', 'pelanggaran'],
        table: 'kpi', access_mode: 'CRUD'
      })
    }

    // ==========================================
    // 🎯 CASE: RIWAYAT APPROVAL SAYA
    // ==========================================
    if (menuKey === 'riwayat_approval') {
      const bulan = searchParams.get('bulan') || String(new Date().getMonth() + 1).padStart(2, '0')
      const tahun = searchParams.get('tahun') || String(new Date().getFullYear())
      
      const firstDay = `${tahun}-${bulan}-01`
      const lastDay = `${tahun}-${bulan}-31`

      const { data: cutiData } = await supabase
        .from('leave_requests')
        .select('*')
        .or(`atasan_nrp.eq.${session.nrp},pjo_nrp.eq.${session.nrp}`)
        .gte('updated_at', firstDay)
        .lte('updated_at', lastDay + 'T23:59:59')
        .order('updated_at', { ascending: false })

      const { data: lemburData } = await supabase
        .from('overtime_requests')
        .select('*')
        .or(`atasan_nrp.eq.${session.nrp},pjo_nrp.eq.${session.nrp}`)
        .gte('updated_at', firstDay)
        .lte('updated_at', lastDay + 'T23:59:59')
        .order('updated_at', { ascending: false })

      const { data: sakitData } = await supabase
        .from('attendance_evidences')
        .select('*')
        .eq('atasan_nrp', session.nrp)
        .neq('status_atasan', 'PENDING')
        .gte('tanggal', firstDay)
        .lte('tanggal', lastDay)
        .order('tanggal', { ascending: false })

      const combined: any[] = []
      const cutiArr = cutiData || []
      const lemburArr = lemburData || []
      const sakitArr = sakitData || []

      for (const c of cutiArr) {
        if (c.atasan_nrp === session.nrp && c.status_atasan !== 'PENDING') {
          combined.push({
            id: c.id,
            tanggal_aksi: c.tanggal_approval_atasan || c.updated_at,
            jenis: '🌴 CUTI',
            tahap: 'ATASAN',
            nrp_karyawan: c.nrp,
            tanggal_pengajuan: c.tanggal_mulai,
            status: c.status_atasan,
            catatan: c.catatan_atasan || '-'
          })
        }
        if (c.pjo_nrp === session.nrp && c.status_pjo !== 'PENDING') {
          combined.push({
            id: c.id + '_pjo',
            tanggal_aksi: c.tanggal_approval_pjo || c.updated_at,
            jenis: '🌴 CUTI',
            tahap: 'PJO',
            nrp_karyawan: c.nrp,
            tanggal_pengajuan: c.tanggal_mulai,
            status: c.status_pjo,
            catatan: c.catatan_pjo || '-'
          })
        }
      }

      for (const l of lemburArr) {
        if (l.atasan_nrp === session.nrp && l.status_atasan !== 'PENDING') {
          combined.push({
            id: l.id,
            tanggal_aksi: l.tanggal_approval_atasan || l.updated_at,
            jenis: '⏰ LEMBUR',
            tahap: 'ATASAN',
            nrp_karyawan: l.nrp,
            tanggal_pengajuan: l.tanggal,
            status: l.status_atasan,
            catatan: l.catatan_atasan || '-'
          })
        }
        if (l.pjo_nrp === session.nrp && l.status_pjo !== 'PENDING') {
          combined.push({
            id: l.id + '_pjo',
            tanggal_aksi: l.tanggal_approval_pjo || l.updated_at,
            jenis: '⏰ LEMBUR',
            tahap: 'PJO',
            nrp_karyawan: l.nrp,
            tanggal_pengajuan: l.tanggal,
            status: l.status_pjo,
            catatan: l.catatan_pjo || '-'
          })
        }
      }

      for (const s of sakitArr) {
        combined.push({
          id: s.id,
          tanggal_aksi: s.created_at,
          jenis: '🤒 SAKIT',
          tahap: 'ATASAN',
          nrp_karyawan: null,
          nama_karyawan_langsung: s.nama_karyawan,
          tanggal_pengajuan: s.tanggal,
          status: s.status_atasan,
          catatan: s.catatan_atasan || '-'
        })
      }

      const nrpsToFetch = combined.filter((c: any) => c.nrp_karyawan).map((c: any) => String(c.nrp_karyawan))
      const empMap = new Map()
      if (nrpsToFetch.length > 0) {
        const { data: emps } = await supabase.from('employees').select('nrp, nama').in('nrp', nrpsToFetch)
        for (const e of (emps || [])) {
          empMap.set(String(e.nrp), e.nama)
        }
      }

      const finalRows = combined.map((c: any) => ({
        tanggal_aksi: c.tanggal_aksi,
        jenis: c.jenis,
        tahap: c.tahap,
        nama_karyawan: c.nama_karyawan_langsung || empMap.get(String(c.nrp_karyawan)) || c.nrp_karyawan || '-',
        tanggal_pengajuan: c.tanggal_pengajuan,
        status: c.status,
        catatan: c.catatan
      }))

      finalRows.sort((a: any, b: any) => new Date(b.tanggal_aksi).getTime() - new Date(a.tanggal_aksi).getTime())

      return NextResponse.json({
        type: 'riwayat_approval',
        title: menu_label,
        rows: finalRows,
        periode: `${bulan}/${tahun}`,
        bulan,
        tahun
      })
    }


    // ==========================================
    // 🎯 CASE B.2: PENILAIAN BAWAHAN (v2.0 - Support role baru)
    // ==========================================
    if (menuKey === 'penilaian_bawahan') {
      let finalEmps: any[] = [];

      // Role baru: cek berdasarkan hierarchy
      const isPJO = rolesLower.some((r: string) => ['pjo_site', 'pjo'].includes(r));
      const isGL = rolesLower.some((r: string) => ['gl_produksi', 'gl_plant', 'atasan'].includes(r));
      const isHRSite = rolesLower.some((r: string) => ['hr_site', 'hrga_site'].includes(r));
      const isHRHO = rolesLower.some((r: string) => ['hr_ho', 'hrga', 'hrga_pusat', 'admin'].includes(r));

      // ─── PRIORITAS 1: Super Admin / HR HO → semua karyawan ───
      if (isSuperAdmin || isHRHO) {
        const { data } = await supabase
          .from('employees')
          .select('nrp, nama, jabatan, site, departemen')
          .eq('status_karyawan', 'Aktif');
        finalEmps = data || [];
      }
      // ─── PRIORITAS 2: HR Site → semua di site sendiri ───
      else if (isHRSite) {
        const { data } = await supabase
          .from('employees')
          .select('nrp, nama, jabatan, site, departemen')
          .eq('status_karyawan', 'Aktif')
          .eq('site', userSite);
        finalEmps = data || [];
      }
      // ─── PRIORITAS 3: PJO → semua bawahan via pjo_nrp ───
      else if (isPJO) {
        const { data: matrix } = await supabase
          .from('approval_matrix')
          .select('employee_nrp')
          .eq('pjo_nrp', session.nrp)
          .eq('active', true);
        const nrps = (matrix || []).map((m: any) => m.employee_nrp);
        if (nrps.length > 0) {
          const { data } = await supabase
            .from('employees')
            .select('nrp, nama, jabatan, site, departemen')
            .in('nrp', nrps)
            .eq('status_karyawan', 'Aktif');
          finalEmps = data || [];
        }
      }
      // ─── PRIORITAS 4: GL (Plant/Produksi) → bawahan via atasan_nrp ───
      else if (isGL) {
        const { data: matrix } = await supabase
          .from('approval_matrix')
          .select('employee_nrp')
          .eq('atasan_nrp', session.nrp)
          .eq('active', true);
        const nrps = (matrix || []).map((m: any) => m.employee_nrp);
        if (nrps.length > 0) {
          const { data } = await supabase
            .from('employees')
            .select('nrp, nama, jabatan, site, departemen')
            .in('nrp', nrps)
            .eq('status_karyawan', 'Aktif');
          finalEmps = data || [];
        }
      }
      // ─── FALLBACK: Cek matrix apapun ───
      else {
        const { data: matrix } = await supabase
          .from('approval_matrix')
          .select('employee_nrp')
          .or(`atasan_nrp.eq.${session.nrp},pjo_nrp.eq.${session.nrp}`)
          .eq('active', true);
        const nrps = (matrix || []).map((m: any) => m.employee_nrp);
        if (nrps.length > 0) {
          const { data } = await supabase
            .from('employees')
            .select('nrp, nama, jabatan, site, departemen')
            .in('nrp', nrps)
            .eq('status_karyawan', 'Aktif');
          finalEmps = data || [];
        }
      }

      const { data: kpiLast } = await supabase.from('kpi').select('nrp, periode, nilai_akhir').order('created_at', { ascending: false });
      const rows = finalEmps.map((e: any) => {
        const lastKpi = kpiLast?.find((k: any) => k.nrp === e.nrp);
        return { ...e, last_periode: lastKpi?.periode || '-', last_score: lastKpi?.nilai_akhir || 0 };
      });

      return NextResponse.json({ type: 'penilaian_tim', title: menu_label, rows });
    }

    // ==========================================
    // 🎯 CASE C: DASHBOARD & SPECIAL
    // ==========================================
    const specialModes: Record<string, string> = {
      'DASHBOARD': 'dashboard', 'FORM_CUTI': 'form_cuti', 'FORM_LEMBUR': 'form_lembur',
      'ROSTER_VIEW': 'roster_view', 'ROSTER_UPLOAD': 'roster_upload',
      'CHANGE_LOGIN': 'change_login', 'ABSENSI_CLOCK': 'absensi_clock',
      'ROLE_MANAGER': 'role_manager', 'EXPORT_ABSENSI': 'export_absensi', 'IMPORT_EXCEL': 'import_excel',
      'CHANGE_PASSWORD': 'change_password'
    }

    if (access_mode === 'DASHBOARD') {
      const now = new Date();
      const offset = now.getTimezoneOffset() * 60000;
      const today = new Date(now.getTime() - offset).toISOString().split('T')[0];
      
      const nextMonth = new Date();
      nextMonth.setDate(nextMonth.getDate() + 30);
      const dateLimit = nextMonth.toISOString().split('T')[0];
      const currentMonth = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }).toUpperCase();

      let qTotal = supabase.from('employees').select('nrp', { count: 'exact', head: true }).eq('status_karyawan', 'Aktif')
      if (isHrgaSite || isAdminPlant) {
        qTotal = qTotal.eq('site', userSite)
        if (isAdminPlant) qTotal = qTotal.ilike('departemen', '%plant%')
      }
      const { count: totalKaryawan } = await qTotal;

      let hadirCount = 0;
      if (isHrgaAll) {
        const { count } = await supabase.from('attendance').select('nrp', { count: 'exact', head: true }).eq('tanggal', today)
        hadirCount = count || 0;
      } else {
        const { data: siteEmps } = await supabase.from('employees').select('nrp').eq('site', userSite);
        const nrps = (siteEmps || []).map((e: any) => e.nrp);
        if (nrps.length > 0) {
          const { count } = await supabase.from('attendance').select('nrp', { count: 'exact', head: true }).eq('tanggal', today).in('nrp', nrps);
          hadirCount = count || 0;
        }
      }

      let qDept = supabase.from('employees').select('departemen').eq('status_karyawan', 'Aktif')
      if (isHrgaSite || isAdminPlant) qDept = qDept.eq('site', userSite)
      const { data: deptData } = await qDept;
      const deptMap: Record<string, number> = {};
      (deptData || []).forEach((e: any) => {
        const d = e.departemen || 'LAINNYA';
        deptMap[d] = (deptMap[d] || 0) + 1;
      });
      const deptStats = Object.entries(deptMap).map(([name, count]) => ({
        name, count, percent: totalKaryawan ? Math.round((count / totalKaryawan) * 100) : 0
      })).sort((a: any, b: any) => b.count - a.count).slice(0, 5);

      // 🌟 v2.4: Tentukan scope berdasarkan role
      // - Super Admin / HRGA HO → semua site
      // - HRGA Site / PJO / Admin → semua karyawan di site sendiri
      // - Karyawan biasa → HANYA dirinya sendiri
      let nrpsForExp: string[] = []

      if (isHrgaAll) {
        // HRGA HO / Super Admin → semua karyawan
        const { data: allEmps } = await supabase.from('employees').select('nrp').eq('status_karyawan', 'Aktif')
        nrpsForExp = (allEmps || []).map((e: any) => String(e.nrp))
      } 
      else if (isHrgaSite || isAdminPlant) {
        // HRGA Site / Admin Plant → semua karyawan di site sendiri
        const { data: siteEmpsForExp } = await supabase.from('employees').select('nrp').eq('site', userSite)
        nrpsForExp = (siteEmpsForExp || []).map((e: any) => String(e.nrp))
      } 
      else {
        // Karyawan biasa → hanya dirinya sendiri
        const nrpStr = String(session.nrp).trim()
        const nrpWithZero = nrpStr.startsWith('0') ? nrpStr : '0' + nrpStr
        nrpsForExp = [nrpStr, nrpWithZero]
      }
      
      let expCount = 0;
      if (nrpsForExp.length > 0) {
        const [pkRes, smRes, mcRes, spRes] = await Promise.all([
          supabase.from('pkwt').select('*').in('nrp', nrpsForExp),
          supabase.from('simper').select('*').in('nrp', nrpsForExp),
          supabase.from('mcu').select('*').in('nrp', nrpsForExp),
          supabase.from('sp').select('*').in('nrp', nrpsForExp)
        ]);

        const pkwtExp = (pkRes.data || []).filter((p: any) => (p.tanggal_berakhir || p.berlaku_sampai || p.tgl_akhir) <= dateLimit).length;
        const simpExp = (smRes.data || []).filter((s: any) => (s.tanggal_expired || s.tgl_expired) <= dateLimit).length;
        const mcuExp = (mcRes.data || []).filter((m: any) => (m.tanggal_expired || m.tgl_mcu_berikutnya) <= dateLimit).length;
        const spExp = (spRes.data || []).filter((sp: any) => (sp.berlaku_sampai) <= dateLimit).length;
        
        expCount = pkwtExp + simpExp + mcuExp + spExp;
      }

      return NextResponse.json({ 
        type: 'dashboard', 
        title: menu_label, 
        stats: { 
          total: totalKaryawan || 0, 
          done: 0,
          pending: totalKaryawan || 0, 
          hadir: hadirCount,
          expired: expCount,
          deptStats: deptStats,
          periode: currentMonth 
        } 
      })
    }

    // ==========================================
    // 🎯 CASE FORM PENGAJUAN + RIWAYAT PER BULAN
    // ==========================================
    if (['FORM_CUTI', 'FORM_LEMBUR'].includes(access_mode)) {
      const currentMonth = new Date().getMonth() + 1
      const currentYear = new Date().getFullYear()
      const firstDay = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`
      const lastDay = `${currentYear}-${String(currentMonth).padStart(2, '0')}-31`

      const tblName = access_mode === 'FORM_CUTI' ? 'leave_requests' : 'overtime_requests'
      const dateField = access_mode === 'FORM_CUTI' ? 'tanggal_mulai' : 'tanggal'

      const { data: riwayat } = await supabase
        .from(tblName)
        .select('*')
        .eq('nrp', session.nrp)
        .gte(dateField, firstDay)
        .lte(dateField, lastDay)
        .order(dateField, { ascending: false })

      // Enrich khusus FORM_CUTI: eligible tiket & sisa cuti tahunan
      let eligibleTiket = false
      let sisaCutiTahunan = 0
      let tahunCuti = currentYear

      if (access_mode === 'FORM_CUTI') {
        const { data: empRow } = await supabase
          .from('employees')
          .select('eligible_tiket_pesawat')
          .eq('nrp', session.nrp)
          .maybeSingle()

        eligibleTiket = !!empRow?.eligible_tiket_pesawat

        const { data: balanceRow } = await supabase
          .from('annual_leave_balances')
          .select('hak_awal, terpakai, penyesuaian')
          .eq('nrp', session.nrp)
          .eq('tahun', tahunCuti)
          .maybeSingle()

        sisaCutiTahunan = Math.max(
          0,
          balanceRow
            ? Number(balanceRow.hak_awal || 12) +
                Number(balanceRow.penyesuaian || 0) -
                Number(balanceRow.terpakai || 0)
            : 12
        )
      }

      return NextResponse.json({ 
        type: access_mode === 'FORM_CUTI' ? 'form_cuti' : 'form_lembur',
        title: menu_label, 
        table: target_table,
        riwayat: riwayat || [],
        periode: new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }).toUpperCase(),
        eligible_tiket_pesawat: eligibleTiket,
        sisa_cuti_tahunan: sisaCutiTahunan,
        tahun_cuti: tahunCuti
      })
    }
    
    if (menuKey === 'evident_sakit') {
      const currentMonth = new Date().getMonth() + 1
      const currentYear = new Date().getFullYear()
      const firstDay = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`
      const lastDay = `${currentYear}-${String(currentMonth).padStart(2, '0')}-31`

      const { data: rows } = await supabase
        .from('attendance_evidences')
        .select('*')
        .ilike('nama_karyawan', session.nama)
        .gte('tanggal', firstDay)
        .lte('tanggal', lastDay)
        .order('tanggal', { ascending: false })

      return NextResponse.json({ 
        type: 'form_sakit', 
        title: menu_label, 
        rows: rows || [], 
        table: 'attendance_evidences',
        periode: new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }).toUpperCase()
      })
    }


    if (specialModes[access_mode]) return NextResponse.json({ type: specialModes[access_mode], title: menu_label, table: target_table })

    // ==========================================
    // 🎯 CASE: DATA SAYA (My Identity)
    // ==========================================
        if (menuKey === 'data_saya') {
      const nrpStr = String(session.nrp).trim();
      const nrpWithZero = nrpStr.startsWith('0') ? nrpStr : '0' + nrpStr;
      const today = getWitaToday();

      const { data: employeeData } = await supabase.from('employees').select('*').in('nrp', [nrpStr, nrpWithZero]).single()
      if (!employeeData) return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 })

      const { data: pkwtData } = await supabase.from('pkwt').select('*').in('nrp', [nrpStr, nrpWithZero]).order('created_at', { ascending: false }).limit(1).single()

      const { data: bpjsTable } = await supabase.from('bpjs').select('*').ilike('nama_karyawan', session.nama).limit(1).single()

      const { data: spData } = await supabase
        .from('sp')
        .select('*')
        .in('nrp', [nrpStr, nrpWithZero])
        .gte('berlaku_sampai', today)
        .order('created_at', { ascending: false })

      // ═══ CHAT 25: Ambil MCU terbaru (tanggal_expired paling akhir) ═══
      const { data: mcuLatest } = await supabase
        .from('mcu')
        .select('tanggal_expired, tanggal_mcu, status_mcu, rumah_sakit')
        .in('nrp', [nrpStr, nrpWithZero])
        .not('tanggal_expired', 'is', null)
        .order('tanggal_expired', { ascending: false })
        .limit(1)
        .maybeSingle()

      // ═══ CHAT 25: Ambil SIMPER terbaru (tanggal_expired paling akhir) ═══
      const { data: simperLatest } = await supabase
        .from('simper')
        .select('tanggal_expired, jenis_simper, nomor_simper')
        .in('nrp', [nrpStr, nrpWithZero])
        .not('tanggal_expired', 'is', null)
        .order('tanggal_expired', { ascending: false })
        .limit(1)
        .maybeSingle()

      const finalData = {
        ...employeeData,
        // ═══ CHAT 25: Override kolom expired dengan data terbaru dari tabel MCU/SIMPER ═══
        exp_mcu: mcuLatest?.tanggal_expired || employeeData.exp_mcu || null,
        exp_simper: simperLatest?.tanggal_expired || employeeData.exp_simper || null,
        // === END CHAT 25 ===
        pkwt_periode: pkwtData ? `${pkwtData.mulai_kontrak} s/d ${pkwtData.akhir_kontrak}` : '-',
        punishments: spData || [],
        bpjs_tk_no: bpjsTable?.bpjs_ketenagakerjaan || '-',
        bpjs_tk_nama: session.nama, 
        bpjs_kes_no: bpjsTable?.bpjs_kesehatan || '-',
        bpjs_kes_nama: session.nama,
        bpjs_istri_no: bpjsTable?.istri_bpjs || '-',
        bpjs_istri_nama: bpjsTable?.istri_nama || '-',
        bpjs_anak1_no: bpjsTable?.anak1_bpjs || '-',
        bpjs_anak1_nama: bpjsTable?.anak1_nama || '-',
        bpjs_anak2_no: bpjsTable?.anak2_bpjs || '-',
        bpjs_anak2_nama: bpjsTable?.anak2_nama || '-',
        bpjs_anak3_no: bpjsTable?.anak3_bpjs || '-',
        bpjs_anak3_nama: bpjsTable?.anak3_nama || '-',
      }

      return NextResponse.json({ type: 'identity_view', data: finalData })
    }

    // ==========================================
    // 🎯 CASE: MONITORING EXPIRED
    // ==========================================
    if (menuKey === 'monitoring_expired') {
      const today = new Date();
      const nextMonth = new Date();
      nextMonth.setDate(nextMonth.getDate() + 30);
      const limitDate = nextMonth.toISOString().split('T')[0];

      const { data: emps } = await supabase.from('employees').select('nrp, nama, site, jabatan, exp_simpol')
      
      const [pkRes, smRes, mcRes] = await Promise.all([
        supabase.from('pkwt').select('*'),
        supabase.from('simper').select('*'),
        supabase.from('mcu').select('*')
      ])

      const expiredRows: any[] = []

      ;(emps || []).forEach((e: any) => {
        if (e.exp_simpol && e.exp_simpol <= limitDate) {
          expiredRows.push({ nrp: e.nrp, _nama_karyawan: e.nama, _site: e.site, jenis_dokumen: '🪪 SIMPOL', tanggal_expired: e.exp_simpol })
        }
      })

      ;(pkRes.data || []).forEach((p: any) => {
        const tgl = p.tanggal_berakhir || p.berlaku_sampai || p.tgl_akhir
        if (tgl && tgl <= limitDate) {
          const emp = emps?.find((e: any) => e.nrp === p.nrp)
          expiredRows.push({ nrp: p.nrp, id: p.id, _nama_karyawan: emp?.nama || p.nrp, _site: emp?.site || '-', jenis_dokumen: '📄 PKWT', tanggal_expired: tgl })
        }
      })

      ;(smRes.data || []).forEach((s: any) => {
        const tgl = s.tanggal_expired || s.tgl_expired
        if (tgl && tgl <= limitDate) {
          const emp = emps?.find((e: any) => e.nrp === s.nrp)
          expiredRows.push({ nrp: s.nrp, id: s.id, _nama_karyawan: emp?.nama || s.nrp, _site: emp?.site || '-', jenis_dokumen: '🎖️ SIMPER', tanggal_expired: tgl })
        }
      })

      ;(mcRes.data || []).forEach((m: any) => {
        const tgl = m.tanggal_expired || m.tgl_mcu_berikutnya
        if (tgl && tgl <= limitDate) {
          const emp = emps?.find((e: any) => e.nrp === m.nrp)
          expiredRows.push({ nrp: m.nrp, id: m.id, _nama_karyawan: emp?.nama || m.nrp, _site: emp?.site || '-', jenis_dokumen: '🏥 MCU', tanggal_expired: tgl })
        }
      })

      expiredRows.sort((a: any, b: any) => new Date(a.tanggal_expired).getTime() - new Date(b.tanggal_expired).getTime())

      return NextResponse.json({
        type: 'table',
        title: '⚠️ Monitoring Dokumen Expired',
        rows: expiredRows,
        columns: ['nrp', '_nama_karyawan', '_site', 'jenis_dokumen', 'tanggal_expired'],
        table: 'monitoring_expired', 
        access_mode: 'VIEW_ONLY'
      })
    }

    // ==========================================
    // 🎯 CASE D: TABEL GENERIK
    // ==========================================
    if (!target_table) return NextResponse.json({ error: 'Tabel target tidak terdefinisi' }, { status: 400 })

    // 🔐 Cek permission VIEW untuk tabel generik
    // Skip jika SELF (data sendiri) atau Super Admin
    if (access_mode !== 'SELF' && !isSuperAdmin) {
      const tablePerm = getTablePermissions(target_table)
      if (tablePerm?.view_all) {
        // 🌟 FIX: Cascade permission check
        // HRGA Site cukup punya view_site / view_team, tidak wajib view_all_sites
        const viewAllPerm = tablePerm.view_all  // ex: 'karyawan_view_all_sites'
        const viewSitePerm = viewAllPerm.replace('_all_sites', '_site').replace('_all', '_site')
        const viewTeamPerm = viewAllPerm.replace('_all_sites', '_team').replace('_all', '_team')
        const viewOwnSitePerm = viewAllPerm.replace('_all_sites', '_own_site').replace('_all', '_own_site')

        const canView = 
          hasPermission(session, viewAllPerm) ||
          hasPermission(session, viewSitePerm) ||
          hasPermission(session, viewTeamPerm) ||
          hasPermission(session, viewOwnSitePerm)

        if (!canView) {
          return NextResponse.json(
            { error: `Akses ditolak. Butuh permission: ${viewAllPerm} / ${viewSitePerm}` },
            { status: 403 }
          )
        }
      }
    }

    let query = supabase.from(target_table).select('*')

    if (access_mode === 'SELF') {
      if (NAME_BASED_TABLES.includes(target_table)) query = query.ilike('nama_karyawan', session.nama)
      else query = query.eq('nrp', session.nrp)
    } 
    else if (access_mode === 'TEAM_ATASAN' || access_mode === 'APPROVAL_ATASAN') {
      const approvalTables = ['overtime_requests', 'leave_requests', 'attendance_evidences'];
      
      if (isSiteScoped) {
        if (target_table === 'employees') {
          query = query.eq('site', userSite)
          if (isAdminPlant) query = query.ilike('departemen', '%plant%')
        } 
        else if (approvalTables.includes(target_table) && access_mode === 'APPROVAL_ATASAN') {
          query = query.eq('atasan_nrp', session.nrp).eq('status_atasan', 'PENDING')
        }
        else {
          let empQ = supabase.from('employees').select('nrp, nama').eq('site', userSite)
          if (isAdminPlant) empQ = empQ.ilike('departemen', '%plant%')
          const { data: emps } = await empQ
          if (!emps || emps.length === 0) return NextResponse.json({ type: 'table', rows: [] })

          // 🌟 FIX: Handle tabel yg pakai nama_karyawan (BPJS, APD, dll)
          if (NAME_BASED_TABLES.includes(target_table)) {
            const names = emps.map((e: any) => e.nama).filter(Boolean)
            if (names.length === 0) return NextResponse.json({ type: 'table', rows: [] })
            query = query.in('nama_karyawan', names)
          } else {
            const nrps = emps.map((e: any) => e.nrp)
            query = query.in('nrp', nrps)
          }
        }
      } else {
        if (approvalTables.includes(target_table) && access_mode === 'APPROVAL_ATASAN') {
          query = query.eq('atasan_nrp', session.nrp).eq('status_atasan', 'PENDING')
        } else {
          const { data: matrix } = await supabase.from('approval_matrix').select('employee_nrp').eq('atasan_nrp', session.nrp).eq('active', true)
          const nrps = (matrix || []).map((m: any) => m.employee_nrp)
          if (nrps.length === 0) return NextResponse.json({ type: 'table', rows: [] })
          query = query.in('nrp', nrps)
        }
      }
    }

    const { data: rows, error: qErr } = await query.order('created_at', { ascending: false }).limit(2000)
    if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 })
    
    const enriched = await enrichWithNames(rows || [], target_table)
    const columns = getColumns(enriched)

    return NextResponse.json({ type: 'table', title: menu_label, table: target_table, access_mode, columns, rows: enriched, total: enriched.length })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

async function enrichWithNames(rows: any[], table: string): Promise<any[]> {
  if (!rows || rows.length === 0) return rows
  const isNameBased = NAME_BASED_TABLES.includes(table)
  const mainNrpField = table === 'approval_matrix' ? 'employee_nrp' : 'nrp'
  const allNrps = new Set<string>()

  rows.forEach((r: any) => {
    if (!isNameBased && r[mainNrpField]) allNrps.add(String(r[mainNrpField]))
    if (r.atasan_nrp) allNrps.add(String(r.atasan_nrp))
    if (r.pjo_nrp) allNrps.add(String(r.pjo_nrp))
  })

  let employees: any[] = []
  if (allNrps.size > 0) {
    const { data } = await supabase.from('employees').select('nrp, nama, jabatan, departemen, site').in('nrp', Array.from(allNrps))
    employees = data || []
  }

  const empMapNrp = new Map(employees.map((e: any) => [String(e.nrp), e]))

  return rows.map((r: any) => {
    const emp = empMapNrp.get(String(r[mainNrpField]))
    return {
      ...r,
      _nama_karyawan: emp?.nama || r.nama_karyawan || r.nrp || '-',
      _jabatan: emp?.jabatan || '-',
      _site: emp?.site || '-',
      _nama_atasan: empMapNrp.get(String(r.atasan_nrp))?.nama || r.atasan_nrp || '-',
      _nama_pjo: empMapNrp.get(String(r.pjo_nrp))?.nama || r.pjo_nrp || '-'
    }
  })
}

function getColumns(rows: any[]): string[] {
  if (!rows || rows.length === 0) return []
  const visibleKeys = Object.keys(rows[0]).filter((k: string) => !HIDDEN_COLUMNS.includes(k))
  const priority = PRIORITY_COLUMNS.filter((c: string) => visibleKeys.includes(c))
  const other = visibleKeys.filter((k: string) => !PRIORITY_COLUMNS.includes(k) && !SECONDARY_COLUMNS.includes(k) && !k.startsWith('_'))
  const secondary = SECONDARY_COLUMNS.filter((c: string) => visibleKeys.includes(c))
  return [...priority, ...other, ...secondary]
}