import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

// Tabel yang punya kolom nrp / employee_nrp (untuk enrich dengan nama)
const NRP_TABLES = ['kpi', 'apd', 'pkwt', 'sp', 'roster', 'attendance', 'overtime_requests', 'leave_requests', 'roles']

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

  const { data: rows, error } = await query.limit(500)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enrich dengan nama karyawan (kalau tabel punya kolom nrp)
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

// Fungsi untuk enrich data dengan nama karyawan
async function enrichWithNames(rows: any[], table: string): Promise<any[]> {
  if (!rows || rows.length === 0) return rows

  // Tentukan kolom NRP yang dipakai di tabel
  let nrpField = 'nrp'
  if (table === 'approval_matrix') nrpField = 'employee_nrp'

  // Kalau tabel tidak punya kolom nrp, return apa adanya
  if (!NRP_TABLES.includes(table) && table !== 'approval_matrix') return rows

  // Kumpulkan semua NRP unik (termasuk atasan_nrp, pjo_nrp kalau ada)
  const allNrps = new Set<string>()
  rows.forEach(r => {
    if (r[nrpField]) allNrps.add(String(r[nrpField]))
    if (r.atasan_nrp) allNrps.add(String(r.atasan_nrp))
    if (r.pjo_nrp) allNrps.add(String(r.pjo_nrp))
    if (r.employee_nrp) allNrps.add(String(r.employee_nrp))
  })

  if (allNrps.size === 0) return rows

  // Query nama karyawan
  const { data: employees } = await supabase
    .from('employees')
    .select('nrp, nama, jabatan')
    .in('nrp', Array.from(allNrps))

  const empMap = new Map((employees || []).map((e: any) => [String(e.nrp), e]))

  // Tambahkan nama ke setiap row
  return rows.map((r: any) => {
    const enriched: any = { ...r }

    if (r[nrpField]) {
      const emp = empMap.get(String(r[nrpField]))
      enriched._nama = emp?.nama || '-'
      enriched._jabatan = emp?.jabatan || '-'
    }

    if (r.atasan_nrp) {
      const emp = empMap.get(String(r.atasan_nrp))
      enriched._nama_atasan = emp?.nama || '-'
    }

    if (r.pjo_nrp) {
      const emp = empMap.get(String(r.pjo_nrp))
      enriched._nama_pjo = emp?.nama || '-'
    }

    if (r.employee_nrp) {
      const emp = empMap.get(String(r.employee_nrp))
      enriched._nama_employee = emp?.nama || '-'
    }

    return enriched
  })
}

// Tentukan urutan kolom (nama karyawan di depan)
function getColumns(rows: any[], table: string): string[] {
  if (!rows || rows.length === 0) return []

  const first = rows[0]
  const allKeys = Object.keys(first).filter(k => k !== 'id')

  // Kolom sistem yang di-hide
  const hidden = ['created_at', 'updated_at']

  // Kolom yang dipisah dari default order
  const specialFirst: string[] = []
  const specialLast: string[] = []

  // Kalau ada _nama, taruh di depan (setelah nrp)
  if ('_nama' in first) specialFirst.push('_nama')
  if ('_nama_employee' in first) specialFirst.push('_nama_employee')
  if ('_nama_atasan' in first) specialLast.push('_nama_atasan')
  if ('_nama_pjo' in first) specialLast.push('_nama_pjo')

  // Filter kolom biasa (bukan hidden, bukan special)
  const normal = allKeys.filter(k =>
    !hidden.includes(k) &&
    !specialFirst.includes(k) &&
    !specialLast.includes(k) &&
    !k.startsWith('_')
  )

  // Build final order
  const result: string[] = []

  // NRP dulu (kalau ada)
  const nrpFields = normal.filter(k => k === 'nrp' || k === 'employee_nrp')
  result.push(...nrpFields)

  // Nama karyawan
  result.push(...specialFirst)

  // Sisa kolom biasa (kecuali atasan_nrp, pjo_nrp yang akan dipair dengan nama)
  const restNormal = normal.filter(k =>
    !nrpFields.includes(k) &&
    k !== 'atasan_nrp' &&
    k !== 'pjo_nrp'
  )
  result.push(...restNormal)

  // atasan_nrp + nama atasan
  if (normal.includes('atasan_nrp')) {
    result.push('atasan_nrp')
    if (specialLast.includes('_nama_atasan')) result.push('_nama_atasan')
  }

  // pjo_nrp + nama pjo
  if (normal.includes('pjo_nrp')) {
    result.push('pjo_nrp')
    if (specialLast.includes('_nama_pjo')) result.push('_nama_pjo')
  }

  return result
}