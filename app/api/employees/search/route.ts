// app/api/employees/search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const session = auth.session!

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').trim()
  const filterSite = searchParams.get('site') || ''

  if (q.length < 1) return NextResponse.json({ ok: true, data: [] })

  const userRoles: string[] = Array.isArray(session.roles) ? session.roles : []
  const isSuperOrHO = Boolean(session.is_super_admin) ||
    userRoles.some(r => ['super_admin','hr_ho','director_ops','business_dev','manager_ops','spv_she_ho'].includes(r))

  let query = supabaseAdmin
    .from('employees')
    .select('nrp, nama, jabatan, departemen, site, foto_url')
    .eq('status_karyawan', 'Aktif')
    .or(`nama.ilike.%${q}%,nrp.ilike.%${q}%`)
    .order('nama', { ascending: true })
    .limit(15)

  // Non-super admin: scope ke site sendiri
  if (!isSuperOrHO) {
    const { data: empSelf } = await supabaseAdmin
      .from('employees')
      .select('site')
      .eq('nrp', session.nrp)
      .single()
    if (empSelf?.site) query = query.eq('site', empSelf.site)
  } else if (filterSite) {
    query = query.eq('site', filterSite)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, data: data || [] })
}