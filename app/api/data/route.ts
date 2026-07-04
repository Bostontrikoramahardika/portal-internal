import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

// Tabel yang punya kolom NRP (untuk enrich dengan nama karyawan)
const NRP_TABLES = [
  'kpi', 'apd', 'pkwt', 'sp', 'roster', 'attendance',
  'overtime_requests', 'leave_requests', 'roles', 'approval_matrix'
]

// Kolom yang selalu di-hide di tampilan tabel
const HIDDEN_COLUMNS = [
  'created_at', 'updated_at', 'id',
  // Kolom teknis yang tidak perlu ditampilkan ke user
  'nrp',           // sudah diganti dengan _nama_karyawan
  'atasan_nrp',    // sudah diganti dengan _nama_atasan
  'pjo_nrp',       // sudah diganti dengan _nama_pjo
  'employee_nrp',  // sudah diganti dengan _nama_karyawan
  'uploaded_by',   // teknis
  'is_offline_sync',
  'synced_at',
]

// Kolom prioritas — ini tampil DULUAN
const PRIORITY_COLUMNS = [
  '_nama_karyawan',   // Nama karyawan (utama)
  '_jabatan',         // Jabatan
  '_site',            // Site
  '_departemen',      // Departemen
]

// Kolom sekunder — tampil setelah kolom biasa
const SECONDARY_COLUMNS = [
  '_nama_atasan',     // Nama atasan
  '_nama_pjo',        // Nama PJO
]

export async function GET(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const menuKey = searchParams.get('menu') || ''

  if (!menuKey) return NextResponse.json({ error: 'Menu key required' }, { status: 400 })

  const { data: menuInfo } = await supabase
    .from('menus')
    .select('*')
    .eq('menu_key', menuKey)
    .in('role', session.roles)
    .single()

  if (!menuInfo) {
    return NextResponse.json({ error: 'Menu tidak ditemukan atau tidak diizinkan' }, { status: 403 })
  }

  const { target_table, access_mode, menu_label } = menuInfo

  // Handle jenis khusus
  if (access_mode === 'DASHBOARD') return NextResponse.json({ type: 'dashboard', title: menu_label })
  if (access_mode === 'FORM_CUTI') return NextResponse.json({ type: 'form_cuti', title: menu_label })
  if (access_mode === 'FORM_LEMBUR') return NextResponse.json({ type: 'form_lembur', title: menu_label })
  if (access_mode === 'ROSTER_VIEW') return NextResponse.json({ type: 'roster_view', title: menu_label })
  if (access_mode === 'ROSTER_UPLOAD') return NextResponse.json({ type: 'roster_upload', title: menu_label })
  if (access_mode === 'IMPORT_EXCEL') return NextResponse.json({ type: 'import_excel', title: menu_label, table: target_table })
  if (access_mode === 'EXPORT_ABSENSI') return NextResponse.json({ type: 'export_absensi', title: menu_label })
  if (access_mode === 'CHANGE_LOGIN') return NextResponse.json({ type: 'change_login', title: menu_label })
  if (access_mode === 'ABSENSI_CLOCK') return NextResponse.json({ type: 'absensi_clock', title: menu_label })
  if (access_mode === 'ROLE_MANAGER') return NextResponse.json({ type: 'role_manager', title: menu_label })

  // Approval lembur (khusus)
  if (access_mode === 'APPROVAL_LEMBUR') {
    const { data: rows, error } = await supabase
      .from('overtime_requests')
      .select('*')
      .eq('atasan_nrp', session.nrp)
      .eq('status_atasan', 'PENDING')
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const enriched = await enrichWithNames(rows || [], 'overtime_requests')
    const columns = getColumns(enriched, 'overtime_requests')

    return NextResponse.json({
      type: 'table', title: menu_label, table: 'overtime_requests',
      access_mode, columns, rows: enriched, total: enriched.length
    })
  }

  if (access_mode === 'APPROVAL_LEMBUR_PJO') {
    const { data: rows, error } = await supabase
      .from('overtime_requests')
      .select('*')
      .eq('pjo_nrp', session.nrp)
      .eq('status_atasan', 'APPROVED')
      .eq('status_pjo', 'PENDING')
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const enriched = await enrichWithNames(rows || [], 'overtime_requests')
    const columns = getColumns(enriched, 'overtime_requests')

    return NextResponse.json({
      type: 'table', title: menu_label, table: 'overtime_requests',
      access_mode, columns, rows: enriched, total: enriched.length
    })
  }

  if (!target_table) return NextResponse.json({ error: 'Target table tidak ditemukan' }, { status: 400 })

  let query = supabase.from(target_table).select('*')

  if (access_mode === 'SELF') {
    query = query.eq('nrp', session.nrp)
  } else if (access_mode === 'TEAM_ATASAN') {
    const { data: matrix } = await supabase.from('approval_matrix').select('employee_nrp').eq('atasan_nrp', session.nrp).eq('active', true)
    const nrps = (matrix || []).map(m => m.employee_nrp)
    if (nrps.length === 0) return NextResponse.json({ type: 'table', title: menu_label, rows: [], columns: [] })
    query = query.in('nrp', nrps)
  } else if (access_mode === 'TEAM_PJO') {
    const { data: matrix } = await supabase.from('approval_matrix').select('employee_nrp').eq('pjo_nrp', session.nrp).eq('active', true)
    const nrps = (matrix || []).map(m => m.employee_nrp)
    if (nrps.length === 0) return NextResponse.json({ type: 'table', title: menu_label, rows: [], columns: [] })
    query = query.in('nrp', nrps)
  } else if (access_mode === 'APPROVAL_ATASAN') {
    query = query.eq('atasan_nrp', session.nrp).eq('status_atasan', 'PENDING')
  } else if (access_mode === 'APPROVAL_PJO') {
    query = query.eq('pjo_nrp', session.nrp).eq('status_atasan', 'APPROVED').eq('status_pjo', 'PENDING')
  } else if (access_mode === 'ALL' || access_mode === 'CRUD') {
    // Semua
  } else {
    return NextResponse.json({ error: 'Access mode tidak dikenali: ' + access_mode }, { status: 400 })
  }

  // Order by tanggal terbaru kalau ada kolomnya
  const { data: rows, error } = await query.limit(500)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enrich dengan nama karyawan
  const enriched = await enrichWithNames(rows || [], target_table)
  const columns = getColumns(enriched, target_table)

  return NextResponse.json({
    type: 'table',
    title: menu_label,
    table: target_table,
    access_mode,
    columns,
    rows: enriched,
    total: enriched.length
  })
}

// ============================================
// ENRICH: Tambah nama karyawan ke setiap row
// ============================================
async function enrichWithNames(rows: any[], table: string): Promise<any[]> {
  if (!rows || rows.length === 0) return rows

  // Kolom NRP utama di tabel
  let mainNrpField = 'nrp'
  if (table === 'approval_matrix') mainNrpField = 'employee_nrp'

  // Kalau tabel tidak punya kolom nrp, return apa adanya
  if (!NRP_TABLES.includes(table)) return rows

  // Kumpulkan SEMUA NRP unik dari SEMUA kolom
  const allNrps = new Set<string>()
  rows.forEach(r => {
    if (r[mainNrpField]) allNrps.add(String(r[mainNrpField]))
    if (r.nrp) allNrps.add(String(r.nrp))
    if (r.atasan_nrp) allNrps.add(String(r.atasan_nrp))
    if (r.pjo_nrp) allNrps.add(String(r.pjo_nrp))
    if (r.employee_nrp) allNrps.add(String(r.employee_nrp))
  })

  if (allNrps.size === 0) return rows

  // Query nama karyawan (ambil info lengkap)
  const { data: employees } = await supabase
    .from('employees')
    .select('nrp, nama, jabatan, departemen, site, no_hp')
    .in('nrp', Array.from(allNrps))

  const empMap = new Map((employees || []).map((e: any) => [String(e.nrp), e]))

  // Tambahkan info karyawan ke setiap row
  return rows.map((r: any) => {
    const enriched: any = { ...r }

    // Nama karyawan utama (dari kolom nrp / employee_nrp)
    const mainNrp = r[mainNrpField] || r.nrp || r.employee_nrp
    if (mainNrp) {
      const emp = empMap.get(String(mainNrp))
      enriched._nama_karyawan = emp?.nama || '(Nama tidak ditemukan)'
      enriched._jabatan = emp?.jabatan || '-'
      enriched._departemen = emp?.departemen || '-'
      enriched._site = emp?.site
      enriched._no_hp = emp?.no_hp || '-'
    }

    // Nama atasan
    if (r.atasan_nrp) {
      const emp = empMap.get(String(r.atasan_nrp))
      enriched._nama_atasan = emp?.nama || '(Nama tidak ditemukan)'
    }

    // Nama PJO
    if (r.pjo_nrp) {
      const emp = empMap.get(String(r.pjo_nrp))
      enriched._nama_pjo = emp?.nama || '(Nama tidak ditemukan)'
    }

    return enriched
  })
}

// ============================================
// GET COLUMNS: Tentukan urutan & filter kolom
// ============================================
function getColumns(rows: any[], table: string): string[] {
  if (!rows || rows.length === 0) return []

  const first = rows[0]
  const allKeys = Object.keys(first)

  // Filter: buang kolom yang di-hide
  const visibleKeys = allKeys.filter(k => !HIDDEN_COLUMNS.includes(k))

  // Pisahkan: priority, secondary, dan normal
  const priorityCols = PRIORITY_COLUMNS.filter(c => visibleKeys.includes(c))
  const secondaryCols = SECONDARY_COLUMNS.filter(c => visibleKeys.includes(c))
  const normalCols = visibleKeys.filter(k =>
    !PRIORITY_COLUMNS.includes(k) &&
    !SECONDARY_COLUMNS.includes(k) &&
    !k.startsWith('_')  // buang kolom _* yang tidak ada di priority/secondary
  )

  // Susun urutan: PRIORITY (Nama+Jabatan+Site) → NORMAL → SECONDARY (Atasan+PJO)
  const result = [
    ...priorityCols,
    ...normalCols,
    ...secondaryCols
  ]

  return result
}