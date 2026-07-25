// app/api/employees/route.ts — v1.0
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const session: any = auth.session!
  const userRoles: string[] = Array.isArray(session.roles) ? session.roles : []
  const role: string = userRoles[0] || 'employee'
  const isSuperAdmin = userRoles.includes('super_admin')

  const { searchParams } = new URL(req.url)
  const search   = searchParams.get('search') || ''
  const limit    = Math.min(Number(searchParams.get('limit') || '20'), 100)
  const activeOnly = searchParams.get('active') === 'true'
  const site     = searchParams.get('site') || ''
  const dept     = searchParams.get('departemen') || ''
  const nrp      = searchParams.get('nrp') || ''

  // ═══ Scope filter berdasarkan role ═══
  const siteScope = (session.site && !isSuperAdmin) ? session.site : null
  const isHoRole = ['super_admin', 'director_ops', 'business_dev', 'hr_ho', 'manager_ops', 'spv_she_ho'].some(r => userRoles.includes(r))

  let query = supabaseAdmin
    .from('employees')
    .select(`
      nrp, name, site, departemen, jabatan,
      phone, email, active, resign_date,
      created_at
    `)
    .order('name', { ascending: true })
    .limit(limit)

  // Filter aktif
  if (activeOnly) {
    query = query.eq('active', true).is('resign_date', null)
  }

  // Filter by NRP (exact)
  if (nrp) {
    query = query.eq('nrp', nrp)
  }

  // Filter by site
  if (site) {
    query = query.eq('site', site)
  } else if (siteScope && !isHoRole) {
    // Non-HO hanya lihat site sendiri
    query = query.eq('site', siteScope)
  }

  // Filter by departemen
  if (dept) {
    query = query.eq('departemen', dept)
  }

  // Search: nama atau NRP
  if (search) {
    query = query.or(`name.ilike.%${search}%,nrp.ilike.%${search}%`)
  }

  const { data, error, count } = await query

  if (error) {
    console.error('[employees GET]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    data: data || [],
    employees: data || [], // alias untuk backward compat
    count: data?.length || 0
  })
}