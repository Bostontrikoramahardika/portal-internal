// app/api/data/route.ts (v1.5.0 Multi-Site Full Logic - FIXED)

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

const NAME_BASED_TABLES = ['bpjs', 'apd_history', 'attendance_evidences']
const HIDDEN_COLUMNS = ['created_at', 'updated_at', 'id', 'nrp', 'atasan_nrp', 'pjo_nrp', 'employee_nrp', 'uploaded_by']
const PRIORITY_COLUMNS = ['_nama_karyawan', '_jabatan', '_site', '_departemen']
const SECONDARY_COLUMNS = ['_nama_atasan', '_nama_pjo']


// ========================================================
// 🕐 HELPER: Deteksi Shift dari Jam Clock In
// ========================================================
// Aturan Hardcoded (Fase 1):
//   06:00 - 17:59 → SIANG
//   18:00 - 05:59 → MALAM
// TODO Fase 2: Ambil konfigurasi jam per site dari tabel 'sites'
function detectShiftFromClockIn(clockInTime: string, siteConfig?: any): string {
  if (!clockInTime || clockInTime === '00:00' || clockInTime === '--:--') return 'HADIR'
  
  const jam = parseInt(clockInTime.split(':')[0])
  if (isNaN(jam)) return 'HADIR'

  // Ambil referensi jam dari config (fallback ke default Pama 06:00 & 18:00)
  const siangStart = siteConfig?.siang_jam_masuk ? parseInt(siteConfig.siang_jam_masuk.split(':')[0]) : 6
  const malamStart = siteConfig?.malam_jam_masuk ? parseInt(siteConfig.malam_jam_masuk.split(':')[0]) : 18

  // Logic: Jika jam masuk di antara jam siang dan sebelum jam malam
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
    // Memastikan menu yang diambil sesuai dengan salah satu role yang dimiliki user
const menuInfo = menusFound.find((m: any) => 
  rolesLower.some(r => r === (m.role || '').toLowerCase())
)
    if (!menuInfo) return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })

    const { target_table, access_mode, menu_label } = menuInfo
    
    // Flag Role v1.5.0
    const isHrgaAll = rolesLower.some(r => ['hrga_oprek', 'hrga_pusat', 'hrga', 'admin'].includes(r))
    const isHrgaSite = rolesLower.includes('hrga_site') || rolesLower.includes('admin_site')
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

      // v1.6.0: Ambil config shift untuk site user ini
      const { data: siteConfig } = await supabase
        .from('sites_config')
        .select('siang_jam_masuk, malam_jam_masuk')
        .eq('site_name', session.site)
        .single()

      const finalRows = (rosters || []).map(r => {
        const absensi = attendance?.find(a => String(a.tanggal) === String(r.tanggal))
        const buktiSakit = evidences?.find(e => String(e.tanggal) === String(r.tanggal))
        let actual = "-"; let evident = "-"; let keterangan = ""

        // 🎯 PRIORITAS 1: Ada Absensi (aksi nyata mengalahkan roster)
        if (absensi) {
          const jamMasuk = absensi.clock_in?.split('T')[1]?.slice(0,5) || '--:--'
          const jamPulang = absensi.clock_out?.split('T')[1]?.slice(0,5) || '--:--'
          
                    // Auto deteksi SIANG/MALAM dari jam clock in (v1.6.0 Dynamic)
          actual = detectShiftFromClockIn(jamMasuk, siteConfig)
          evident = `${jamMasuk} / ${jamPulang}`
          keterangan = absensi.status === 'TERLAMBAT' ? '⚠️ TERLAMBAT' : '✅ SUKSES'
        } 
        // 🎯 PRIORITAS 2: Ada Bukti Sakit
        else if (buktiSakit) {
          actual = "SAKIT"
          evident = buktiSakit.foto_url
          keterangan = buktiSakit.keterangan || "SAKIT"
        } 
        // 🎯 PRIORITAS 3: Tidak Ada Aktivitas → Fallback ke Roster
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
        const emp = emps?.find(e => e.nrp === k.nrp)
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
        enrichedKpi = enrichedKpi.filter(k => k._site === userSite)
      }

      return NextResponse.json({
        type: menuKey === 'kpi_saya' ? 'kpi_saya' : 'table',
        title: menu_label, rows: enrichedKpi,
        columns: ['nrp', '_nama_karyawan', '_site', 'periode', 'nilai_performa', 'nilai_sistem', 'nilai_akhir', 'pelanggaran'],
        table: 'kpi', access_mode: 'CRUD'
      })
    }

        // ==========================================
    // 🎯 CASE: RIWAYAT APPROVAL SAYA (v1.5.0 FIXED)
    // ==========================================
    if (menuKey === 'riwayat_approval') {
      const bulan = searchParams.get('bulan') || String(new Date().getMonth() + 1).padStart(2, '0')
      const tahun = searchParams.get('tahun') || String(new Date().getFullYear())
      
      const firstDay = `${tahun}-${bulan}-01`
      const lastDay = `${tahun}-${bulan}-31`

      // 1. Ambil semua data yang pernah diproses user
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

      // 2. Gabung Data (FIXED: pakai const untuk hindari ASI error)
      const combined: any[] = []
      const cutiArr = cutiData || []
      const lemburArr = lemburData || []
      const sakitArr = sakitData || []

      // Proses Cuti
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

      // Proses Lembur
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

      // Proses Sakit
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

      // 3. Enrich dengan Nama Karyawan
      const nrpsToFetch = combined.filter(c => c.nrp_karyawan).map(c => String(c.nrp_karyawan))
      const empMap = new Map()
      if (nrpsToFetch.length > 0) {
        const { data: emps } = await supabase.from('employees').select('nrp, nama').in('nrp', nrpsToFetch)
        for (const e of (emps || [])) {
          empMap.set(String(e.nrp), e.nama)
        }
      }

      const finalRows = combined.map(c => ({
        tanggal_aksi: c.tanggal_aksi,
        jenis: c.jenis,
        tahap: c.tahap,
        nama_karyawan: c.nama_karyawan_langsung || empMap.get(String(c.nrp_karyawan)) || c.nrp_karyawan || '-',
        tanggal_pengajuan: c.tanggal_pengajuan,
        status: c.status,
        catatan: c.catatan
      }))

      finalRows.sort((a, b) => new Date(b.tanggal_aksi).getTime() - new Date(a.tanggal_aksi).getTime())

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
    // 🎯 CASE B.2: PENILAIAN BAWAHAN (Bayu GL Logic)
    // ==========================================
    if (menuKey === 'penilaian_bawahan') {
      const userJabatan = (session.jabatan || '').toUpperCase();
      const userDept = (session.departemen || '').toUpperCase();

      let finalEmps = [];

      // A. Jika HRGA / Admin Site
      if (isHrgaAll || isHrgaSite) {
        let q = supabase.from('employees').select('nrp, nama, jabatan, site, departemen').eq('status_karyawan', 'Aktif');
        if (isHrgaSite) q = q.eq('site', userSite);
        const { data } = await q;
        finalEmps = data || [];
      } 
      // B. Logika GL / Admin Plant (Bayu Setiawan MLP)
      else if (userJabatan.includes('GL') || userDept.includes('PLANT') || isAdminPlant) {
        const { data } = await supabase
          .from('employees')
          .select('nrp, nama, jabatan, site, departemen')
          .eq('status_karyawan', 'Aktif')
          .eq('site', userSite)
          .or(`departemen.ilike.%plant%,jabatan.ilike.%mechanic%,jabatan.ilike.%mekanik%,jabatan.ilike.%welder%,jabatan.ilike.%helper%`);
        finalEmps = data || [];
      } 
      // C. Atasan Berdasarkan Matrix
      else {
        const fieldMatrix = rolesLower.includes('pjo') ? 'pjo_nrp' : 'atasan_nrp';
        const { data: matrix } = await supabase.from('approval_matrix').select('employee_nrp').eq(fieldMatrix, session.nrp).eq('active', true);
        const nrps = (matrix || []).map(m => m.employee_nrp);
        if (nrps.length > 0) {
          const { data } = await supabase.from('employees').select('nrp, nama, jabatan, site, departemen').in('nrp', nrps).eq('status_karyawan', 'Aktif');
          finalEmps = data || [];
        }
      }

      const { data: kpiLast } = await supabase.from('kpi').select('nrp, periode, nilai_akhir').order('created_at', { ascending: false });
      const rows = finalEmps.map(e => {
        const lastKpi = kpiLast?.find(k => k.nrp === e.nrp);
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
      'ROLE_MANAGER': 'role_manager', 'EXPORT_ABSENSI': 'export_absensi', 'IMPORT_EXCEL': 'import_excel'
    }

         if (access_mode === 'DASHBOARD') {
      const now = new Date();
      const offset = now.getTimezoneOffset() * 60000;
      const today = new Date(now.getTime() - offset).toISOString().split('T')[0];
      
      const nextMonth = new Date();
      nextMonth.setDate(nextMonth.getDate() + 30);
      const dateLimit = nextMonth.toISOString().split('T')[0];
      const currentMonth = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }).toUpperCase();

      // 1. Hitung Total Karyawan Aktif
      let qTotal = supabase.from('employees').select('nrp', { count: 'exact', head: true }).eq('status_karyawan', 'Aktif')
      if (isHrgaSite || isAdminPlant) {
        qTotal = qTotal.eq('site', userSite)
        if (isAdminPlant) qTotal = qTotal.ilike('departemen', '%plant%')
      }
      const { count: totalKaryawan } = await qTotal;

      // 2. Hitung Kehadiran Hari Ini
      let hadirCount = 0;
      if (isHrgaAll) {
        const { count } = await supabase.from('attendance').select('nrp', { count: 'exact', head: true }).eq('tanggal', today)
        hadirCount = count || 0;
      } else {
        const { data: siteEmps } = await supabase.from('employees').select('nrp').eq('site', userSite);
        const nrps = (siteEmps || []).map(e => e.nrp);
        if (nrps.length > 0) {
          const { count } = await supabase.from('attendance').select('nrp', { count: 'exact', head: true }).eq('tanggal', today).in('nrp', nrps);
          hadirCount = count || 0;
        }
      }

      // 3. Hitung Statistik Departemen (v1.5.0)
      let qDept = supabase.from('employees').select('departemen').eq('status_karyawan', 'Aktif')
      if (isHrgaSite || isAdminPlant) qDept = qDept.eq('site', userSite)
      const { data: deptData } = await qDept;
      const deptMap: Record<string, number> = {};
      (deptData || []).forEach(e => {
        const d = e.departemen || 'LAINNYA';
        deptMap[d] = (deptMap[d] || 0) + 1;
      });
      const deptStats = Object.entries(deptMap).map(([name, count]) => ({
        name, count, percent: totalKaryawan ? Math.round((count / totalKaryawan) * 100) : 0
      })).sort((a, b) => b.count - a.count).slice(0, 5); // Ambil Top 5 saja

      // 4. Hitung Expired (Penyebab Error 500 diperbaiki di sini)
      // Kita ambil datanya dulu baru filter di kode, supaya tidak error "Column not found" di SQL
      const { data: siteEmpsForExp } = await supabase.from('employees').select('nrp').eq('site', userSite);
      const nrpsForExp = (siteEmpsForExp || []).map(e => String(e.nrp));
      
      let expCount = 0;
      if (nrpsForExp.length > 0) {
        const [pkRes, smRes, mcRes, spRes] = await Promise.all([
          supabase.from('pkwt').select('*').in('nrp', nrpsForExp),
          supabase.from('simper').select('*').in('nrp', nrpsForExp),
          supabase.from('mcu').select('*').in('nrp', nrpsForExp),
          supabase.from('sp').select('*').in('nrp', nrpsForExp)
        ]);

        const pkwtExp = (pkRes.data || []).filter(p => (p.tanggal_berakhir || p.berlaku_sampai || p.tgl_akhir) <= dateLimit).length;
        const simpExp = (smRes.data || []).filter(s => (s.tanggal_expired || s.tgl_expired) <= dateLimit).length;
        const mcuExp = (mcRes.data || []).filter(m => (m.tanggal_expired || m.tgl_mcu_berikutnya) <= dateLimit).length;
        const spExp = (spRes.data || []).filter(sp => (sp.berlaku_sampai) <= dateLimit).length;
        
        expCount = pkwtExp + simpExp + mcuExp + spExp;
      }

      return NextResponse.json({ 
        type: 'dashboard', 
        title: menu_label, 
        stats: { 
          total: totalKaryawan || 0, 
          done: 0, // Anda bisa aktifkan kueri KPI jika perlu
          pending: totalKaryawan || 0, 
          hadir: hadirCount,
          expired: expCount,
          deptStats: deptStats,
          periode: currentMonth 
        } 
      })
    }

        // ==========================================
    // 🎯 CASE FORM PENGAJUAN + RIWAYAT PER BULAN (v1.5.0)
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

      return NextResponse.json({ 
        type: access_mode === 'FORM_CUTI' ? 'form_cuti' : 'form_lembur',
        title: menu_label, 
        table: target_table,
        riwayat: riwayat || [],
        periode: new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }).toUpperCase()
      })
    }
    
    // Untuk Menu Evident Sakit (SELF dengan Filter Bulan)
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
    // 🎯 CASE: DATA SAYA (My Identity v1.6.0 Updated)
    // ==========================================
    if (menuKey === 'data_saya') {
      // 1. Ambil data dasar karyawan
      const { data: employeeData, error: empErr } = await supabase
        .from('employees')
        .select('*')
        .eq('nrp', session.nrp)
        .single()

      if (empErr) return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 })

      // 2. Ambil data PKWT terbaru
      const { data: pkwtData } = await supabase
        .from('pkwt')
        .select('mulai_kontrak, akhir_kontrak')
        .eq('nrp', session.nrp)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      // 3. Ambil data BPJS (Jika Anda punya tabel bpjs terpisah)
      const { data: bpjsTable } = await supabase
        .from('bpjs')
        .select('*')
        .eq('nrp', session.nrp)
        .limit(1)
        .single()

      // 4. Cek pengajuan pending
      const { data: lastRequest } = await supabase
        .from('data_change_requests')
        .select('*')
        .eq('nrp', session.nrp)
        .eq('status', 'pending')
        .limit(1)

      // Gabungkan semua data agar bisa dibaca UI
      const finalData = {
        ...employeeData,
        // Jika di tabel employees kosong, ambil dari tabel bpjs
        bpjs_tk: employeeData.bpjs_tk || bpjsTable?.no_bpjs_tk || bpjsTable?.bpjs_ketenagakerjaan,
        bpjs_kes: employeeData.bpjs_kes || bpjsTable?.no_bpjs_kes || bpjsTable?.bpjs_kesehatan,
        pkwt_periode: pkwtData ? `${pkwtData.mulai_kontrak} s/d ${pkwtData.akhir_kontrak}` : '-'
      }

      return NextResponse.json({ 
        type: 'identity_view', 
        data: finalData,
        pending_request: (lastRequest?.length || 0) > 0 
      })
    }

    // ==========================================
    // 🎯 CASE D: TABEL GENERIK (Termasuk Approval Bukti Sakit)
    // ==========================================
    if (!target_table) return NextResponse.json({ error: 'Tabel target tidak terdefinisi' }, { status: 400 })
    let query = supabase.from(target_table).select('*')

    if (access_mode === 'SELF') {
      if (NAME_BASED_TABLES.includes(target_table)) query = query.ilike('nama_karyawan', session.nama)
      else query = query.eq('nrp', session.nrp)
    } 
    else if (access_mode === 'TEAM_ATASAN' || access_mode === 'APPROVAL_ATASAN') {
      // 🌟 UPDATE: Tambahkan attendance_evidences ke daftar approval
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
          let empQ = supabase.from('employees').select('nrp').eq('site', userSite)
          if (isAdminPlant) empQ = empQ.ilike('departemen', '%plant%')
          const { data: emps } = await empQ
          const nrps = (emps || []).map(e => e.nrp)
          if (nrps.length === 0) return NextResponse.json({ type: 'table', rows: [] })
          query = query.in('nrp', nrps)
        }
      } else {
        if (approvalTables.includes(target_table) && access_mode === 'APPROVAL_ATASAN') {
          query = query.eq('atasan_nrp', session.nrp).eq('status_atasan', 'PENDING')
        } else {
          const { data: matrix } = await supabase.from('approval_matrix').select('employee_nrp').eq('atasan_nrp', session.nrp).eq('active', true)
          const nrps = (matrix || []).map(m => m.employee_nrp)
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

  rows.forEach(r => {
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
  const visibleKeys = Object.keys(rows[0]).filter(k => !HIDDEN_COLUMNS.includes(k))
  const priority = PRIORITY_COLUMNS.filter(c => visibleKeys.includes(c))
  const other = visibleKeys.filter(k => !PRIORITY_COLUMNS.includes(k) && !SECONDARY_COLUMNS.includes(k) && !k.startsWith('_'))
  const secondary = SECONDARY_COLUMNS.filter(c => visibleKeys.includes(c))
  return [...priority, ...other, ...secondary]
}