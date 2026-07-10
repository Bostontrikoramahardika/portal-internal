import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

const HRGA_ROLES = ['hrga', 'admin', 'hrga_oprek', 'hrga_site', 'hrga_pusat']

// GET - Ambil semua karyawan + role-nya
export async function GET(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  // FIX: Cek role baru
  const hasAccess = session.roles.some((r: string) => HRGA_ROLES.includes(r))
  if (!hasAccess) {
    return NextResponse.json({ error: 'Hanya HRGA yang bisa kelola role' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  const filterSite = searchParams.get('site') || ''
  const filterRole = searchParams.get('role') || ''

  let query = supabase
    .from('employees')
    .select('nrp, nama, jabatan, departemen, site, status_karyawan')
    .eq('status_karyawan', 'Aktif')
    .order('nama')

  if (search) query = query.or(`nama.ilike.%${search}%,nrp.ilike.%${search}%`)
  if (filterSite) query = query.eq('site', filterSite)

  const { data: employees, error } = await query.limit(500)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: allRoles } = await supabase.from('roles').select('nrp, role').eq('active', true)

  const rolesByNrp = new Map<string, string[]>()
  ;(allRoles || []).forEach((r: any) => {
    const nrp = String(r.nrp)
    if (!rolesByNrp.has(nrp)) rolesByNrp.set(nrp, [])
    rolesByNrp.get(nrp)!.push(r.role)
  })

  const { data: sitesData } = await supabase.from('employees').select('site').eq('status_karyawan', 'Aktif')
  const sites = [...new Set((sitesData || []).map(s => s.site).filter(Boolean))].sort()

  let result = (employees || []).map((emp: any) => ({
    ...emp,
    roles: rolesByNrp.get(String(emp.nrp)) || ['karyawan']
  }))

  if (filterRole) result = result.filter(e => e.roles.includes(filterRole))

  return NextResponse.json({
    employees: result,
    sites,
    stats: {
      total_karyawan: result.length,
      total_atasan: result.filter(e => e.roles.includes('atasan')).length,
      total_pjo: result.filter(e => e.roles.includes('pjo')).length,
      total_admin: result.filter(e => e.roles.includes('hrga_oprek') || e.roles.includes('admin')).length,
    }
  })
}

// POST - Update role karyawan
export async function POST(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  // FIX: Cek role baru
  const hasAccess = session.roles.some((r: string) => HRGA_ROLES.includes(r))
  if (!hasAccess) return NextResponse.json({ error: 'Hanya HRGA yang bisa kelola role' }, { status: 403 })

  try {
    const { nrp, role, action } = await request.json()

    // FIX: Daftar role baru v1.5.0
    const VALID_ROLES = [
    'karyawan', 'atasan', 'pjo', 'admin', 'hrga', 
    'hrga_oprek', 'hrga_site', 'hrga_pusat', 
    'admin_site', 'admin_plant' // ⭐ Pastikan ada ini
]

    if (!nrp || !role || !['assign', 'remove'].includes(action)) return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })
    if (!VALID_ROLES.includes(role)) return NextResponse.json({ error: 'Role tidak valid' }, { status: 400 })

    if (role === 'karyawan' && action === 'remove') return NextResponse.json({ error: 'Role Karyawan default' }, { status: 400 })

    if (action === 'assign') {
      const { data: existing } = await supabase.from('roles').select('*').eq('nrp', nrp).eq('role', role).single()
      if (existing) await supabase.from('roles').update({ active: true }).eq('id', existing.id)
      else await supabase.from('roles').insert({ nrp, role, active: true })
    } else {
      await supabase.from('roles').delete().eq('nrp', nrp).eq('role', role)
    }

    return NextResponse.json({ success: true, message: `✅ Role ${role.toUpperCase()} diperbarui` })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}