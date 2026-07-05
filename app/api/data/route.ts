import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

const NRP_TABLES = [
  'kpi', 'apd', 'pkwt', 'sp', 'roster', 'attendance',
  'overtime_requests', 'leave_requests', 'roles', 'approval_matrix',
  'bpjs', 'mcu', 'simper'
]

const HIDDEN_COLUMNS = [
  'created_at', 'updated_at', 'id', 'nrp', 'atasan_nrp', 'pjo_nrp', 
  'employee_nrp', 'uploaded_by', 'is_offline_sync', 'synced_at',
  'image_name'
]

const PRIORITY_COLUMNS = ['_nama_karyawan', '_jabatan', '_site', '_departemen']
const SECONDARY_COLUMNS = ['_nama_atasan', '_nama_pjo']

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const menuKey = searchParams.get('menu') || ''
    if (!menuKey) return NextResponse.json({ error: 'Menu key required' }, { status: 400 })

    // 1. Ambil Menu (Gunakan select biasa, filter manual untuk kestabilan)
    const { data: menusFound, error: menuError } = await supabase
      .from('menus')
      .select('*')
      .eq('menu_key', menuKey)
      .eq('active', true)

    if (menuError) throw new Error('DB Menu Error: ' + menuError.message)
    if (!menusFound || menusFound.length === 0) {
      return NextResponse.json({ error: 'Menu tidak ditemukan' }, { status: 404 })
    }

    const rolesLower = (session.roles || []).map((r: string) => r.toLowerCase())
    const menuInfo = menusFound.find((m: any) =>
      rolesLower.includes((m.role || '').toLowerCase())
    )

    if (!menuInfo) {
      return NextResponse.json({ error: 'Akses ditolak untuk role Anda' }, { status: 403 })
    }

    const { target_table, access_mode, menu_label } = menuInfo

    // 2. Handle Jenis Navigasi Khusus
    const specialModes: Record<string, string> = {
      'DASHBOARD': 'dashboard',
      'FORM_CUTI': 'form_cuti',
      'FORM_LEMBUR': 'form_lembur',
      'ROSTER_VIEW': 'roster_view',
      'ROSTER_UPLOAD': 'roster_upload',
      'CHANGE_LOGIN': 'change_login',
      'ABSENSI_CLOCK': 'absensi_clock',
      'ROLE_MANAGER': 'role_manager',
      'EXPORT_ABSENSI': 'export_absensi'
    }

    if (specialModes[access_mode]) {
      return NextResponse.json({ type: specialModes[access_mode], title: menu_label, table: target_table })
    }

    if (access_mode === 'IMPORT_EXCEL') {
      return NextResponse.json({ type: 'import_excel', title: menu_label, table: target_table })
    }

    // 3. Handle Tabel (CRUD / Monitoring / Approval)
    if (!target_table) return NextResponse.json({ error: 'Konfigurasi tabel kosong' }, { status: 400 })

    let query = supabase.from(target_table).select('*')

    // Filter berdasarkan mode akses
    if (access_mode === 'SELF') {
      query = query.eq('nrp', session.nrp)
    } else if (access_mode === 'TEAM_ATASAN' || access_mode === 'APPROVAL_ATASAN') {
      if (target_table === 'overtime_requests' || target_table === 'leave_requests') {
        query = query.eq('atasan_nrp', session.nrp).eq('status_atasan', 'PENDING')
      } else {
        const { data: matrix } = await supabase.from('approval_matrix').select('employee_nrp').eq('atasan_nrp', session.nrp).eq('active', true)
        const nrps = (matrix || []).map(m => m.employee_nrp)
        if (nrps.length === 0) return NextResponse.json({ type: 'table', title: menu_label, rows: [], columns: [], total: 0 })
        query = query.in('nrp', nrps)
      }
    } else if (access_mode === 'TEAM_PJO' || access_mode === 'APPROVAL_PJO') {
       if (target_table === 'overtime_requests' || target_table === 'leave_requests') {
        query = query.eq('pjo_nrp', session.nrp).eq('status_atasan', 'APPROVED').eq('status_pjo', 'PENDING')
      } else {
        const { data: matrix } = await supabase.from('approval_matrix').select('employee_nrp').eq('pjo_nrp', session.nrp).eq('active', true)
        const nrps = (matrix || []).map(m => m.employee_nrp)
        if (nrps.length === 0) return NextResponse.json({ type: 'table', title: menu_label, rows: [], columns: [], total: 0 })
        query = query.in('nrp', nrps)
      }
    }

    // Eksekusi query dengan limit
    const { data: rows, error: fetchError } = await query.limit(500)
    
    if (fetchError) throw new Error('Fetch Data Error: ' + fetchError.message)

    // 4. Enrich & Get Columns
    const enriched = await enrichWithNames(rows || [], target_table)
    const columns = getColumns(enriched)

    return NextResponse.json({
      type: 'table',
      title: menu_label,
      table: target_table,
      access_mode,
      columns,
      rows: enriched,
      total: enriched.length
    })

  } catch (err: any) {
    console.error('❌ API DATA ERROR:', err.message)
    return NextResponse.json({ error: 'Server Error: ' + err.message }, { status: 500 })
  }
}

async function enrichWithNames(rows: any[], table: string): Promise<any[]> {
  if (!rows || rows.length === 0 || !NRP_TABLES.includes(table)) return rows
  
  const mainNrpField = table === 'approval_matrix' ? 'employee_nrp' : 'nrp'
  const allNrps = new Set<string>()
  
  rows.forEach(r => {
    if (r[mainNrpField]) allNrps.add(String(r[mainNrpField]))
    if (r.atasan_nrp) allNrps.add(String(r.atasan_nrp))
    if (r.pjo_nrp) allNrps.add(String(r.pjo_nrp))
  })

  if (allNrps.size === 0) return rows

  const { data: employees } = await supabase
    .from('employees')
    .select('nrp, nama, jabatan, departemen, site')
    .in('nrp', Array.from(allNrps))

  const empMap = new Map((employees || []).map((e: any) => [String(e.nrp), e]))

  return rows.map((r: any) => {
    const enriched = { ...r }
    const emp = empMap.get(String(r[mainNrpField]))
    if (emp) {
      enriched._nama_karyawan = emp.nama
      enriched._jabatan = emp.jabatan || '-'
      enriched._departemen = emp.departemen || '-'
      enriched._site = emp.site || '-'
    }
    if (r.atasan_nrp) enriched._nama_atasan = empMap.get(String(r.atasan_nrp))?.nama || r.atasan_nrp
    if (r.pjo_nrp) enriched._nama_pjo = empMap.get(String(r.pjo_nrp))?.nama || r.pjo_nrp
    return enriched
  })
}

function getColumns(rows: any[]): string[] {
  if (!rows || rows.length === 0) return []
  const visibleKeys = Object.keys(rows[0]).filter(k => !HIDDEN_COLUMNS.includes(k))
  
  const priority = PRIORITY_COLUMNS.filter(c => visibleKeys.includes(c))
  const secondary = SECONDARY_COLUMNS.filter(c => visibleKeys.includes(c))
  const normal = visibleKeys.filter(k => !PRIORITY_COLUMNS.includes(k) && !SECONDARY_COLUMNS.includes(k) && !k.startsWith('_'))

  return [...priority, ...normal, ...secondary]
}