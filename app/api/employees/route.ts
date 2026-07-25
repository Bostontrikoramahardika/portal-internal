// app/api/employees/route.ts — v1.1 (fix kolom nama, no_hp, tanggal_resign)
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const session: any = auth.session!
  const userRoles: string[] = Array.isArray(session.roles) ? session.roles : []
  const isSuperAdmin = userRoles.includes('super_admin')

  const { searchParams } = new URL(req.url)
  const search     = searchParams.get('search') || ''
  const limit      = Math.min(Number(searchParams.get('limit') || '20'), 100)
  const activeOnly = searchParams.get('active') === 'true'
  const site       = searchParams.get('site') || ''
  const dept       = searchParams.get('departemen') || ''
  const nrp        = searchParams.get('nrp') || ''

  // ═══ Scope: non-HO hanya lihat site sendiri ═══
  const isHoRole = ['super_admin', 'director_ops', 'business_dev', 'hr_ho',
    'manager_ops', 'spv_she_ho'].some(r => userRoles.includes(r))
  const siteScope = (!isSuperAdmin && !isHoRole && session.site) ? session.site : null

  let query = supabaseAdmin
    .from('employees')
    .select('nrp, nama, site, departemen, jabatan, no_hp, email, tanggal_resign, created_at')
    .order('nama', { ascending: true })
    .limit(limit)

  // Filter aktif (belum resign)
  if (activeOnly) {
    query = query.is('tanggal_resign', null)
  }

  // Filter by NRP exact
  if (nrp) {
    query = query.eq('nrp', nrp)
  }

  // Filter by site
  if (site) {
    query = query.eq('site', site)
  } else if (siteScope) {
    query = query.eq('site', siteScope)
  }

  // Filter by departemen
  if (dept) {
    query = query.eq('departemen', dept)
  }

  // Search: nama atau NRP
  if (search) {
    query = query.or(`nama.ilike.%${search}%,nrp.ilike.%${search}%`)
  }

  const { data, error } = await query

  if (error) {
    console.error('[employees GET]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // ═══ Normalize output: selalu ada field `name` untuk kompat UI ═══
  const normalized = (data || []).map(e => ({
    ...e,
    name: e.nama,           // alias name → nama
    active: !e.tanggal_resign,
    resign_date: e.tanggal_resign
  }))

  return NextResponse.json({
    ok: true,
    data: normalized,
    employees: normalized,  // alias backward compat
    count: normalized.length
  })
}