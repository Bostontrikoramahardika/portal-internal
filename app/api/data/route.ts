import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

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

  // Handle jenis khusus (menu tanpa tabel)
  if (access_mode === 'DASHBOARD') {
    return NextResponse.json({ type: 'dashboard', title: menu_label })
  }

  if (access_mode === 'FORM_CUTI') {
    return NextResponse.json({ type: 'form_cuti', title: menu_label })
  }

  if (access_mode === 'ROSTER_VIEW') {
    return NextResponse.json({ type: 'roster_view', title: menu_label })
  }

  if (access_mode === 'ROSTER_UPLOAD') {
    return NextResponse.json({ type: 'roster_upload', title: menu_label })
  }

  if (access_mode === 'IMPORT_EXCEL') {
    return NextResponse.json({ type: 'import_excel', title: menu_label, table: target_table })
  }

  if (access_mode === 'CHANGE_LOGIN') {
    return NextResponse.json({ type: 'change_login', title: menu_label })
  }

  if (!target_table) {
    return NextResponse.json({ error: 'Target table tidak ditemukan' }, { status: 400 })
  }

  // Query data sesuai access mode
  let query = supabase.from(target_table).select('*')

  if (access_mode === 'SELF') {
    query = query.eq('nrp', session.nrp)
  } else if (access_mode === 'TEAM_ATASAN') {
    const { data: matrix } = await supabase
      .from('approval_matrix')
      .select('employee_nrp')
      .eq('atasan_nrp', session.nrp)
      .eq('active', true)

    const nrps = (matrix || []).map(m => m.employee_nrp)
    if (nrps.length === 0) {
      return NextResponse.json({ type: 'table', title: menu_label, rows: [], columns: [] })
    }
    query = query.in('nrp', nrps)
  } else if (access_mode === 'TEAM_PJO') {
    const { data: matrix } = await supabase
      .from('approval_matrix')
      .select('employee_nrp')
      .eq('pjo_nrp', session.nrp)
      .eq('active', true)

    const nrps = (matrix || []).map(m => m.employee_nrp)
    if (nrps.length === 0) {
      return NextResponse.json({ type: 'table', title: menu_label, rows: [], columns: [] })
    }
    query = query.in('nrp', nrps)
  } else if (access_mode === 'APPROVAL_ATASAN') {
    query = query.eq('atasan_nrp', session.nrp).eq('status_atasan', 'PENDING')
  } else if (access_mode === 'APPROVAL_PJO') {
    query = query
      .eq('pjo_nrp', session.nrp)
      .eq('status_atasan', 'APPROVED')
      .eq('status_pjo', 'PENDING')
  } else if (access_mode === 'ALL' || access_mode === 'CRUD') {
    // Ambil semua data
  } else {
    return NextResponse.json({
      error: 'Access mode tidak dikenali: ' + access_mode
    }, { status: 400 })
  }

  const { data: rows, error } = await query.limit(500)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const columns = rows && rows.length > 0
    ? Object.keys(rows[0]).filter(k => k !== 'id')
    : []

  return NextResponse.json({
    type: 'table',
    title: menu_label,
    table: target_table,
    access_mode,
    columns,
    rows: rows || [],
    total: (rows || []).length
  })
}