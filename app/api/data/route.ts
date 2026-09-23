// app/api/data/route.ts
// v2.0 - Chat 30 FINAL: Multi-timezone support
// - Semua timestamp display pakai timezone SITE (dari sites_config)
// - Zero manual offset math
// - Backward compatible dengan semua menu existing

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'
import { hasPermission } from '@/app/lib/permissions'
import { getTablePermissions } from '@/app/lib/tablePermissions'
import { 
  getSiteDate,
  getSiteMonth,
  getSiteYear,
  formatSiteTime,
  formatSiteMonthYear,
  detectShiftFromClockIn,
  Timezone,
  DEFAULT_TIMEZONE
} from '@/app/lib/timezone'

const NAME_BASED_TABLES = ['bpjs', 'apd_history', 'attendance_evidences']
const HIDDEN_COLUMNS = [
  'created_at', 'updated_at', 'id',
  'nrp', 'atasan_nrp', 'pjo_nrp', 'employee_nrp', 'uploaded_by', 'nrp_login',
  'password', 'password_last_changed', 'is_super_admin',
  'nama_istri', 'nama_anak', 'no_darurat', 'no_kk',
  'bpjs_tk', 'bpjs_kes', 'bpjs_istri', 'bpjs_anak1', 'bpjs_anak2', 'bpjs_anak3',
  'no_simpol', 'exp_simpol', 'exp_simper', 'exp_mcu',
  'tempat_lahir', 'tmpt_lahir', 'tanggal_lahir', 'status_pernikahan', 'alamat',
  'foto_url', 'tgl_masuk', 'eligible_tiket_pesawat',
  'alasan_resign', 'resign_by',
]
const PRIORITY_COLUMNS = ['_nama_karyawan', '_jabatan', '_site', '_departemen']
const SECONDARY_COLUMNS = ['_nama_atasan', '_nama_pjo']

// ═══════════════════════════════════════════════════════════
// HELPER: Ambil timezone site (cached per request)
// ═══════════════════════════════════════════════════════════
async function getSiteTimezone(siteName: string): Promise<Timezone> {
  if (!siteName) return DEFAULT_TIMEZONE
  
  const { data } = await supabase
    .from('sites_config')
    .select('timezone')
    .eq('nama_site', siteName)
    .eq('active', true)
    .maybeSingle()
  
  return (data?.timezone || DEFAULT_TIMEZONE) as Timezone
}

// ═══════════════════════════════════════════════════════════
// HELPER: Deteksi shift (SIANG/MALAM) dari jam WITA/WIB/WIT
// ═══════════════════════════════════════════════════════════
function detectShiftFromLocalHour(jamStr: string, siteConfig?: any): string {
  if (!jamStr || jamStr === '00:00' || jamStr === '--:--') return 'HADIR'
  
  const jam = parseInt(jamStr.split(':')[0])
  if (isNaN(jam)) return 'HADIR'

  // 05:00 - 16:59 → SIANG
  // 17:00 - 04:59 → MALAM
  // (sesuai aturan: siang 06:00-17:00, malam 18:00-05:00)
  return (jam >= 5 && jam < 17) ? 'SIANG' : 'MALAM'
}

// ═══════════════════════════════════════════════════════════
// HELPER: Normalize date ke YYYY-MM-DD (handle ISO string & Date object)
// ═══════════════════════════════════════════════════════════
function normalizeDate(d: any): string {
  if (!d) return ''
  if (typeof d === 'string') return d.split('T')[0].split('+')[0].trim()
  if (d instanceof Date) return d.toISOString().split('T')[0]
  return String(d).split('T')[0]
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
    
    // ⭐ FIX: Prioritas access_mode yang lebih luas (ALL/CRUD > TEAM_ATASAN > SELF)
const priorityScore = (m: any): number => {
  const mode = (m.access_mode || '').toUpperCase()
  if (mode === 'ALL' || mode === 'CRUD') return 3
  if (mode === 'TEAM_ATASAN' || mode === 'APPROVAL_ATASAN') return 2
  if (mode === 'SELF') return 1
  return 0
}

const menuInfo = isSuperAdmin 
  ? [...menusFound].sort((a: any, b: any) => priorityScore(b) - priorityScore(a))[0]
  : [...menusFound]
      .filter((m: any) => rolesLower.some((r: string) => r === (m.role || '').toLowerCase()))
      .sort((a: any, b: any) => priorityScore(b) - priorityScore(a))[0]
    
    if (!menuInfo) return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })

    const { target_table, access_mode, menu_label } = menuInfo
    
    const isHrgaAll = isSuperAdmin || rolesLower.some((r: string) => ['hr_ho', 'hrga_oprek', 'hrga_pusat', 'hrga', 'admin'].includes(r))
    const isHrgaSite = rolesLower.some((r: string) => ['hr_site', 'hrga_site', 'admin_site'].includes(r))
    const isAdminPlant = rolesLower.includes('admin_plant')
    const isSiteScoped = isHrgaSite || isAdminPlant
    const userSite = session.scope_site || session.site || '_'

    // ⭐ CHAT 30: Ambil timezone site user
    const userSiteTz = await getSiteTimezone(session.site || userSite)

    // ==========================================
    // 🎯 CASE A: RIWAYAT ABSENSI SAYA (✅ FIXED Chat 30 - Multi-TZ)
    // ==========================================
    if (menuKey === 'riwayat_absensi' || menuKey === 'roster_saya') {
      const nrpString = String(session.nrp).trim()
      const nrpWithZero = nrpString.startsWith('0') ? nrpString : '0' + nrpString

      const { data: siteConfig } = await supabase
        .from('sites_config')
        .select('siang_jam_masuk, malam_jam_masuk, timezone')
        .eq('nama_site', session.site)
        .single()

      const siteTz = (siteConfig?.timezone || DEFAULT_TIMEZONE) as Timezone
      const todaySite = getSiteDate(null, siteTz) // YYYY-MM-DD

      const now = new Date(todaySite + 'T00:00:00')
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth() + 1
      const currentDate = now.getDate()

      let startDateStr = ''
      if (currentDate <= 7) {
        // Tanggal 1-7: Tampilkan 7 hari sebelum tanggal 1 bulan berjalan
        const prevH7 = new Date(currentYear, currentMonth - 1, 1 - 7)
        const y = prevH7.getFullYear()
        const m = String(prevH7.getMonth() + 1).padStart(2, '0')
        const d = String(prevH7.getDate()).padStart(2, '0')
        startDateStr = y + '-' + m + '-' + d
      } else {
        // Lewat H7: Tampilkan dari tanggal 1 bulan berjalan
        const m = String(currentMonth).padStart(2, '0')
        startDateStr = currentYear + '-' + m + '-01'
      }

      // Tanggal akhir bulan berjalan (anti tgl 31 September)
      const lastDayObj = new Date(currentYear, currentMonth, 0)
      const lastD = String(lastDayObj.getDate()).padStart(2, '0')
      const mStr = String(currentMonth).padStart(2, '0')
      const endDateStr = currentYear + '-' + mStr + '-' + lastD

      // Ambil Roster hanya dalam rentang tanggal
      const { data: rosters } = await supabase
        .from('rosters')
        .select('*')
        .in('nrp', [nrpString, nrpWithZero])
        .gte('tanggal', startDateStr)
        .lte('tanggal', endDateStr)
        .order('tanggal', { ascending: false })

      // Ambil Attendance hanya dalam rentang tanggal
      const { data: attendance } = await supabase
        .from('attendance')
        .select('*')
        .in('nrp', [nrpString, nrpWithZero])
        .gte('tanggal', startDateStr)
        .lte('tanggal', endDateStr)
        .order('tanggal', { ascending: false })

      // Ambil Evidence hanya dalam rentang tanggal
      const { data: evidences } = await supabase
        .from('attendance_evidences')
        .select('*')
        .or('nrp.eq.' + nrpString + ',nrp.eq.' + nrpWithZero + ',nama_karyawan.ilike.%' + session.nama + '%')
        .gte('tanggal', startDateStr)
        .lte('tanggal', endDateStr)

      const finalRows = (rosters || []).map((r) => {
        const absensi = attendance?.find((a) => normalizeDate(a.tanggal) === normalizeDate(r.tanggal))
        const buktiSakit = evidences?.find((e) => normalizeDate(e.tanggal) === normalizeDate(r.tanggal))
        let actual = '-'
        let evident = '-'
        let keterangan = ''

        if (absensi) {
          const jamMasuk = absensi.clock_in ? formatSiteTime(absensi.clock_in, siteTz) : '--:--'
          const jamPulang = absensi.clock_out ? formatSiteTime(absensi.clock_out, siteTz) : '--:--'
          actual = detectShiftFromLocalHour(jamMasuk, siteConfig)
          evident = jamMasuk + ' / ' + jamPulang
          keterangan = absensi.status === 'TERLAMBAT' ? '?? TERLAMBAT' : '? SUKSES'
        } else if (buktiSakit) {
          actual = 'SAKIT'
          evident = buktiSakit.foto_url
          keterangan = buktiSakit.keterangan || 'SAKIT'
        } else {
          if (r.shift_code === 'OFF') {
            actual = 'OFF'
            keterangan = '-'
          } else if (['S', 'M', 'P', 'L'].includes(r.shift_code)) {
            if (String(r.tanggal) > todaySite) {
              actual = r.shift_code === 'M' ? 'MALAM' : 'SIANG'
              keterangan = 'BELUM ABSEN'
            } else {
              actual = 'MANGKIR'
              keterangan = 'TIDAK ADA ABSENSI'
            }
          } else {
            actual = r.shift_code || '-'
            keterangan = 'IZIN / CUTI'
          }
        }
        return {
          tanggal: r.tanggal,
          roster: r.shift_code,
          actual,
          evident,
          keterangan,
          is_foto: !!buktiSakit,
        }
      })

      return NextResponse.json({
        columns: [
          { key: 'tanggal', label: 'Tanggal' },
          { key: 'roster', label: 'Roster' },
          { key: 'actual', label: 'Actual Shift' },
          { key: 'evident', label: 'Jam / Bukti' },
          { key: 'keterangan', label: 'Keterangan' },
        ],
        title: menu_label,
        rows: finalRows,
      })
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
    // 🎯 CASE: RIWAYAT APPROVAL SAYA (✅ FIXED Chat 30 - TZ Aware)
    // ==========================================
    if (menuKey === 'riwayat_approval') {
      const witaMonth = getSiteMonth(null, userSiteTz)
      const witaYear = getSiteYear(null, userSiteTz)
      const bulan = searchParams.get('bulan') || String(witaMonth).padStart(2, '0')
      const tahun = searchParams.get('tahun') || String(witaYear)
      
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
    // 🎯 CASE B.2: KPI & PENILAIAN BAWAHAN (✅ FIXED Chat 30 - TZ Aware)
    // ==========================================
    if (menuKey === 'penilaian_bawahan' || menuKey === 'kpi_bawahan') {
      let finalEmps: any[] = [];

      const isPJO = rolesLower.some((r: string) => ['pjo_site', 'pjo'].includes(r));
      const isGLPlant = rolesLower.some((r: string) => ['gl_plant'].includes(r));
      const isGLProduksi = rolesLower.some((r: string) => ['gl_produksi'].includes(r));
      const isGL = isGLPlant || isGLProduksi || rolesLower.includes('atasan');
      const isHRSite = rolesLower.some((r: string) => ['hr_site', 'hrga_site'].includes(r));
      const isHRHO = rolesLower.some((r: string) => ['hr_ho', 'hrga', 'hrga_pusat', 'admin'].includes(r));

      const witaMonth = getSiteMonth(null, userSiteTz)
      const witaYear = getSiteYear(null, userSiteTz)
      const currentMonth = String(witaMonth).padStart(2, '0');
      const currentYear = String(witaYear);
      const bulan = searchParams.get('bulan') || currentMonth;
      const tahun = searchParams.get('tahun') || currentYear;

      const bulanNama = ['JANUARI','FEBRUARI','MARET','APRIL','MEI','JUNI',
                         'JULI','AGUSTUS','SEPTEMBER','OKTOBER','NOVEMBER','DESEMBER'];
      const periodeFilter = `${bulanNama[parseInt(bulan) - 1]} ${tahun}`;

      if (isSuperAdmin || isHRHO) {
        const filterSite = searchParams.get('filter_site') || ''
        let q = supabase
          .from('employees')
          .select('nrp, nama, jabatan, site, departemen')
          .eq('status_karyawan', 'Aktif')
          .order('nama');
        if (filterSite && filterSite !== 'ALL') {
          q = q.eq('site', filterSite)
        }
        const { data } = await q;
        finalEmps = data || [];
      }
      else if (isHRSite) {
        const { data } = await supabase
          .from('employees')
          .select('nrp, nama, jabatan, site, departemen')
          .eq('status_karyawan', 'Aktif')
          .eq('site', userSite)
          .order('nama');
        finalEmps = data || [];
      }
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
            .eq('status_karyawan', 'Aktif')
            .order('nama');
          finalEmps = data || [];
        }
      }
      else if (isGLPlant) {
        const scopeSite = (session as any).scope_site || session.site;
        const { data } = await supabase
          .from('employees')
          .select('nrp, nama, jabatan, site, departemen')
          .eq('site', scopeSite)
          .eq('status_karyawan', 'Aktif')
          .is('tanggal_resign', null)
          .or([
            'jabatan.ilike.%mekanik%',
            'jabatan.ilike.%mechanic%',
            'jabatan.ilike.%welder%',
            'jabatan.ilike.%tyreman%',
            'jabatan.ilike.%electric%',
            'jabatan.ilike.%helper plant%',
            'jabatan.ilike.%admin plant%',
            'departemen.ilike.%plant%'
          ].join(','))
          .order('nama');
        finalEmps = data || [];
      }
      else if (isGLProduksi) {
        const scopeSite = (session as any).scope_site || session.site;
        const { data } = await supabase
          .from('employees')
          .select('nrp, nama, jabatan, site, departemen')
          .eq('site', scopeSite)
          .eq('status_karyawan', 'Aktif')
          .is('tanggal_resign', null)
          .or([
            'jabatan.ilike.%operator%',
            'jabatan.ilike.%driver%',
            'jabatan.ilike.%huler%'
          ].join(','))
          .order('nama');
        finalEmps = data || [];
      }
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
            .eq('status_karyawan', 'Aktif')
            .order('nama');
          finalEmps = data || [];
        }
      }
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
            .eq('status_karyawan', 'Aktif')
            .order('nama');
          finalEmps = data || [];
        }
      }

      const bawahaNrps = finalEmps.map(e => e.nrp);
      let allKpi: any[] = [];
      if (bawahaNrps.length > 0) {
        const { data } = await supabase
          .from('kpi')
          .select('nrp, periode, penilai_nrp, cat_kinerja, cat_sikap, cat_disiplin, nilai_performa, nilai_otomatis, catatan, created_at, id')
          .in('nrp', bawahaNrps)
          .eq('periode', periodeFilter);
        allKpi = data || [];
      }

      const penilaiNrps = [...new Set(allKpi.map(k => k.penilai_nrp).filter(Boolean))];
      let penilaiMap = new Map();
      if (penilaiNrps.length > 0) {
        const { data: penilaiEmps } = await supabase
          .from('employees')
          .select('nrp, nama')
          .in('nrp', penilaiNrps);
        penilaiMap = new Map((penilaiEmps || []).map((p: any) => [p.nrp, p.nama]));
      }

      const rows = finalEmps.map((e: any) => {
        const empKpi = allKpi.filter(k => k.nrp === e.nrp);
        const kpiSaya = empKpi.find(k => k.penilai_nrp === session.nrp);

        const listPenilai = empKpi.map(k => {
          const totalPerforma = (Number(k.cat_kinerja) || 0) + (Number(k.cat_sikap) || 0) + (Number(k.cat_disiplin) || 0);
          return {
            id: k.id,
            penilai_nrp: k.penilai_nrp,
            penilai_nama: penilaiMap.get(k.penilai_nrp) || k.penilai_nrp || 'Unknown',
            nilai_performa: totalPerforma,
            nilai_otomatis: Number(k.nilai_otomatis) || 0,
            nilai_total: totalPerforma + (Number(k.nilai_otomatis) || 0),
            catatan: k.catatan,
            is_saya: k.penilai_nrp === session.nrp,
            created_at: k.created_at
          };
        });

        const nilaiRataRata = listPenilai.length > 0
          ? listPenilai.reduce((sum, p) => sum + p.nilai_total, 0) / listPenilai.length
          : 0;

        let nilaiSaya = null;
        if (kpiSaya) {
          const totalPerforma = (Number(kpiSaya.cat_kinerja) || 0) + (Number(kpiSaya.cat_sikap) || 0) + (Number(kpiSaya.cat_disiplin) || 0);
          nilaiSaya = totalPerforma + (Number(kpiSaya.nilai_otomatis) || 0);
        }

        return {
          ...e,
          dinilai_oleh_saya: !!kpiSaya,
          kpi_saya_id: kpiSaya?.id || null,
          nilai_saya: nilaiSaya,
          nilai_rata_rata: Math.round(nilaiRataRata * 10) / 10,
          total_penilai: listPenilai.length,
          list_penilai: listPenilai
        };
      });

      const totalSudahDinilai = rows.filter(r => r.total_penilai > 0).length;
      const totalBelumDinilai = rows.length - totalSudahDinilai;
      const avgNilai = totalSudahDinilai > 0
        ? Math.round((rows.filter(r => r.total_penilai > 0).reduce((sum, r) => sum + r.nilai_rata_rata, 0) / totalSudahDinilai) * 10) / 10
        : 0;

      let sitesList: string[] = []
      if (isSuperAdmin || isHRHO) {
        const { data: siteData } = await supabase
          .from('sites_config')
          .select('nama_site')
          .eq('active', true)
          .order('nama_site')
        sitesList = (siteData || []).map((s: any) => s.nama_site)
      }

      return NextResponse.json({
        type: 'penilaian_tim',
        title: menu_label,
        rows,
        periode: periodeFilter,
        bulan,
        tahun,
        view_only: isHRHO && !isSuperAdmin,
        can_edit: isSuperAdmin || isPJO || isGL || isHRSite,
        can_filter_site: isSuperAdmin || isHRHO,
        sites_list: sitesList,
        filter_site: searchParams.get('filter_site') || 'ALL',
        summary: {
          total: rows.length,
          sudah_dinilai: totalSudahDinilai,
          belum_dinilai: totalBelumDinilai,
          nilai_rata_rata: avgNilai
        }
      });
    }

    // ==========================================
    // 🎯 CASE C: DASHBOARD & SPECIAL (✅ FIXED Chat 30 - TZ Aware)
    // ==========================================
    const specialModes: Record<string, string> = {
      'DASHBOARD': 'dashboard', 'FORM_CUTI': 'form_cuti', 'FORM_LEMBUR': 'form_lembur',
      'ROSTER_VIEW': 'roster_view', 'ROSTER_UPLOAD': 'roster_upload',
      'CHANGE_LOGIN': 'change_login', 'ABSENSI_CLOCK': 'absensi_clock',
      'ROLE_MANAGER': 'role_manager', 'EXPORT_ABSENSI': 'export_absensi', 'IMPORT_EXCEL': 'import_excel',
      'CHANGE_PASSWORD': 'change_password'
    }

    if (access_mode === 'DASHBOARD') {
      // ⭐ CHAT 30: Pakai timezone site user
      const today = getSiteDate(null, userSiteTz)
      const now = new Date()
      const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      const dateLimit = getSiteDate(nextMonth, userSiteTz)
      const currentMonth = formatSiteMonthYear(null, userSiteTz)

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

      let nrpsForExp: string[] = []

      if (isHrgaAll) {
        const { data: allEmps } = await supabase.from('employees').select('nrp').eq('status_karyawan', 'Aktif')
        nrpsForExp = (allEmps || []).map((e: any) => String(e.nrp))
      } 
      else if (isHrgaSite || isAdminPlant) {
        const { data: siteEmpsForExp } = await supabase.from('employees').select('nrp').eq('site', userSite)
        nrpsForExp = (siteEmpsForExp || []).map((e: any) => String(e.nrp))
      } 
      else {
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
    // 🎯 CASE FORM PENGAJUAN (Cuti, Lembur, Sakit/Izin)
    // ==========================================
    if (['FORM_CUTI', 'FORM_LEMBUR'].includes(access_mode) || ['cuti_saya', 'lembur_saya', 'form_cuti', 'form_lembur'].includes(menuKey)) {
      const currentMonth = getSiteMonth(null, userSiteTz)
      const currentYear = getSiteYear(null, userSiteTz)
      const firstDay = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`
      const lastDayObj = new Date(currentYear, currentMonth, 0); const lastDay = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(lastDayObj.getDate()).padStart(2, '0')}`

      const isCuti = access_mode === 'FORM_CUTI' || ['cuti_saya', 'form_cuti'].includes(menuKey)
      const tblName = isCuti ? 'leave_requests' : 'overtime_requests'
      const dateField = isCuti ? 'tanggal_mulai' : 'tanggal'

      const { data: riwayat } = await supabase
        .from(tblName)
        .select('*')
        .eq('nrp', session.nrp)
        .gte(dateField, firstDay)
        .lte(dateField, lastDay)
        .order(dateField, { ascending: false })

      let eligibleTiket = false
      let sisaCutiTahunan = 0
      let tahunCuti = currentYear

      if (isCuti) {
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
        type: isCuti ? 'form_cuti' : 'form_lembur',
        title: menu_label || (isCuti ? 'Pengajuan Cuti' : 'Pengajuan Lembur'), 
        table: target_table || tblName,
        riwayat: riwayat || [],
        rows: riwayat || [],
        periode: formatSiteMonthYear(null, userSiteTz),
        eligible_tiket_pesawat: eligibleTiket,
        sisa_cuti_tahunan: sisaCutiTahunan,
        tahun_cuti: tahunCuti
      })
    }
    
    if (menuKey === 'evident_sakit' || access_mode === 'FORM_SAKIT') {
      const currentMonth = getSiteMonth(null, userSiteTz)
      const currentYear = getSiteYear(null, userSiteTz)
      const firstDay = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`
      const lastDayObj = new Date(currentYear, currentMonth, 0); const lastDay = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(lastDayObj.getDate()).padStart(2, '0')}`

      // 🌟 FIX: Cari berdasarkan NRP OR nama_karyawan
      const { data: rows } = await supabase
        .from('attendance_evidences')
        .select('*')
        .or(`nrp.eq.${session.nrp},nama_karyawan.ilike.%${session.nama}%`)
        .gte('tanggal', firstDay)
        .lte('tanggal', lastDay)
        .order('tanggal', { ascending: false })

      return NextResponse.json({ 
        type: 'form_sakit', 
        title: menu_label || 'Pengajuan Sakit/Izin', 
        rows: rows || [], 
        riwayat: rows || [],
        table: 'attendance_evidences',
        periode: formatSiteMonthYear(null, userSiteTz)
      })
    }
    
    if (menuKey === 'evident_sakit') {
      const currentMonth = getSiteMonth(null, userSiteTz)
      const currentYear = getSiteYear(null, userSiteTz)
      const firstDay = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`
      const lastDayObj = new Date(currentYear, currentMonth, 0); const lastDay = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(lastDayObj.getDate()).padStart(2, '0')}`

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
        periode: formatSiteMonthYear(null, userSiteTz)
      })
    }


    if (specialModes[access_mode]) return NextResponse.json({ type: specialModes[access_mode], title: menu_label, table: target_table })

    // ==========================================
    // 🎯 CASE: DATA SAYA (My Identity)
    // ==========================================
    if (menuKey === 'data_saya') {
      const nrpStr = String(session.nrp).trim();
      const nrpWithZero = nrpStr.startsWith('0') ? nrpStr : '0' + nrpStr;
      const today = getSiteDate(null, userSiteTz);

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

      const { data: mcuLatest } = await supabase
        .from('mcu')
        .select('tanggal_expired, tanggal_mcu, status_mcu, rumah_sakit')
        .in('nrp', [nrpStr, nrpWithZero])
        .not('tanggal_expired', 'is', null)
        .order('tanggal_expired', { ascending: false })
        .limit(1)
        .maybeSingle()

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
        exp_mcu: mcuLatest?.tanggal_expired || employeeData.exp_mcu || null,
        exp_simper: simperLatest?.tanggal_expired || employeeData.exp_simper || null,
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
    // 🎯 CASE: MONITORING EXPIRED (✅ FIXED Chat 30 - TZ Aware)
    // ==========================================
    if (menuKey === 'monitoring_expired') {
      const now = new Date()
      const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      const limitDate = getSiteDate(nextMonth, userSiteTz)

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

    if (access_mode !== 'SELF' && !isSuperAdmin) {
      const tablePerm = getTablePermissions(target_table)
      if (tablePerm?.view_all) {
        const viewAllPerm = tablePerm.view_all
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
      const isGLPlant = rolesLower.includes('gl_plant');
      const isGLProduksi = rolesLower.includes('gl_produksi');
      
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

          if (NAME_BASED_TABLES.includes(target_table)) {
            const names = emps.map((e: any) => e.nama).filter(Boolean)
            if (names.length === 0) return NextResponse.json({ type: 'table', rows: [] })
            query = query.in('nama_karyawan', names)
          } else {
            const nrps = emps.map((e: any) => e.nrp)
            query = query.in('nrp', nrps)
          }
        }
      } 
      else if (isGLPlant || isGLProduksi) {
        const scopeSite = (session as any).scope_site || session.site;
        let empQ = supabase
          .from('employees')
          .select('nrp, nama')
          .eq('site', scopeSite)
          .eq('status_karyawan', 'Aktif')
          .is('tanggal_resign', null);
        
        if (isGLPlant) {
          empQ = empQ.or([
            'jabatan.ilike.%mekanik%',
            'jabatan.ilike.%mechanic%',
            'jabatan.ilike.%welder%',
            'jabatan.ilike.%tyreman%',
            'jabatan.ilike.%electric%',
            'jabatan.ilike.%helper plant%',
            'jabatan.ilike.%admin plant%',
            'departemen.ilike.%plant%'
          ].join(','));
        } else {
          empQ = empQ.or([
            'jabatan.ilike.%operator%',
            'jabatan.ilike.%driver%',
            'jabatan.ilike.%huler%'
          ].join(','));
        }
        
        const { data: emps } = await empQ;
        if (!emps || emps.length === 0) return NextResponse.json({ type: 'table', rows: [] })
        
        if (target_table === 'employees') {
          const nrps = emps.map((e: any) => e.nrp)
          query = query.in('nrp', nrps)
        }
        else if (approvalTables.includes(target_table) && access_mode === 'APPROVAL_ATASAN') {
          query = query.eq('atasan_nrp', session.nrp).eq('status_atasan', 'PENDING')
        }
        else {
          if (NAME_BASED_TABLES.includes(target_table)) {
            const names = emps.map((e: any) => e.nama).filter(Boolean)
            query = query.in('nama_karyawan', names)
          } else {
            const nrps = emps.map((e: any) => e.nrp)
            query = query.in('nrp', nrps)
          }
        }
      }
      else {
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
    const columns = getColumns(enriched, target_table)

    return NextResponse.json({ type: 'table', title: menu_label, table: target_table, access_mode, columns, rows: enriched, total: enriched.length })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

async function enrichWithNames(rows: any[], table: string): Promise<any[]> {
  if (!rows || rows.length === 0) return rows
  const isNameBased = NAME_BASED_TABLES.includes(table)
  const mainNrpField = table === 'approval_matrix' ? 'employee_nrp' : 'nrp'
  
  const employeeNrps = new Set<string>()
  rows.forEach((r: any) => {
    if (!isNameBased && r[mainNrpField]) employeeNrps.add(String(r[mainNrpField]))
    if (r.atasan_nrp) employeeNrps.add(String(r.atasan_nrp))
    if (r.pjo_nrp) employeeNrps.add(String(r.pjo_nrp))
  })

  const matrixMap = new Map<string, { atasan_nrp: string; pjo_nrp: string }>()
  if (table === 'employees' && employeeNrps.size > 0) {
    const { data: matrix } = await supabase
      .from('approval_matrix')
      .select('employee_nrp, atasan_nrp, pjo_nrp')
      .in('employee_nrp', Array.from(employeeNrps))
      .eq('active', true)

    for (const m of (matrix || [])) {
      matrixMap.set(String(m.employee_nrp), {
        atasan_nrp: m.atasan_nrp,
        pjo_nrp: m.pjo_nrp
      })
      if (m.atasan_nrp) employeeNrps.add(String(m.atasan_nrp))
      if (m.pjo_nrp) employeeNrps.add(String(m.pjo_nrp))
    }
  }

  let employees: any[] = []
  if (employeeNrps.size > 0) {
    const { data } = await supabase
      .from('employees')
      .select('nrp, nama, jabatan, departemen, site')
      .in('nrp', Array.from(employeeNrps))
    employees = data || []
  }

  const empMapNrp = new Map(employees.map((e: any) => [String(e.nrp), e]))

  return rows.map((r: any) => {
    const emp = empMapNrp.get(String(r[mainNrpField]))
    
    const matrixEntry = matrixMap.get(String(r[mainNrpField]))
    const atasanNrp = matrixEntry?.atasan_nrp || r.atasan_nrp
    const pjoNrp    = matrixEntry?.pjo_nrp    || r.pjo_nrp

    const atasanEmp = atasanNrp ? empMapNrp.get(String(atasanNrp)) : null
    const pjoEmp    = pjoNrp    ? empMapNrp.get(String(pjoNrp))    : null
    
    const result: any = { ...r }
    
    // Skip _nama_karyawan untuk employees (biar tidak duplikat)
    if (table !== 'employees') {
      result._nama_karyawan = emp?.nama || r.nama_karyawan || r.nrp || '-'
      result._jabatan       = emp?.jabatan || '-'
      result._site          = emp?.site || '-'
    }
    
    // 🆕 MASA KERJA (untuk table employees)
    if (table === 'employees') {
      const tglMasuk = r.tanggal_masuk || r.tgl_masuk
      const tglResign = r.tanggal_resign
      
      if (tglMasuk) {
        const start = new Date(tglMasuk)
        const end = tglResign ? new Date(tglResign) : new Date()
        
        if (!isNaN(start.getTime())) {
          const diffMs = end.getTime() - start.getTime()
          const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
          const years = Math.floor(totalDays / 365)
          const months = Math.floor((totalDays % 365) / 30)
          
          if (years > 0 && months > 0) {
            result._masa_kerja = `${years} Th ${months} Bln`
          } else if (years > 0) {
            result._masa_kerja = `${years} Tahun`
          } else if (months > 0) {
            result._masa_kerja = `${months} Bulan`
          } else {
            result._masa_kerja = `${totalDays} Hari`
          }
        } else {
          result._masa_kerja = '-'
        }
      } else {
        result._masa_kerja = '-'
      }
      
      // 🆕 STATUS RESIGN
      if (tglResign) {
        result._status = `🚪 Resign (${tglResign})`
      } else {
        result._status = '✅ Aktif'
      }
    }
    
    result._nama_atasan = atasanEmp?.nama || (atasanNrp ? String(atasanNrp) : 'Belum diset')
    result._nama_pjo    = pjoEmp?.nama    || (pjoNrp    ? String(pjoNrp)    : 'Belum diset')
    
    return result
  })
}

function getColumns(rows: any[], table?: string): string[] {
  if (!rows || rows.length === 0) return []
  const visibleKeys = Object.keys(rows[0]).filter((k: string) => !HIDDEN_COLUMNS.includes(k))
  
  // 🆕 Custom column order untuk table employees
  if (table === 'employees') {
    const preferredOrder = [
      'nama', 'jabatan', 'departemen', 'site', 
      'tanggal_masuk', '_masa_kerja', 'poh', 'tanggal_resign',
      '_status', 'alasan_resign',
      'no_hp', 'email', 'status_karyawan'
    ]
    const orderedKeys = preferredOrder.filter(k => visibleKeys.includes(k))
    const restKeys = visibleKeys.filter(k => 
      !preferredOrder.includes(k) && 
      !k.startsWith('_') &&
      k !== 'resign_by' // hide resign_by dari view
    )
    return [...orderedKeys, ...restKeys]
  }
  
  const priority = PRIORITY_COLUMNS.filter((c: string) => visibleKeys.includes(c))
  const other = visibleKeys.filter((k: string) => !PRIORITY_COLUMNS.includes(k) && !SECONDARY_COLUMNS.includes(k) && !k.startsWith('_'))
  const secondary = SECONDARY_COLUMNS.filter((c: string) => visibleKeys.includes(c))
  return [...priority, ...other, ...secondary]
}