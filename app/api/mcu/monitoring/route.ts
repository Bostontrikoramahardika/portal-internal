// app/api/mcu/monitoring/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const session = auth.session!

  const { searchParams } = new URL(req.url)
  const site = searchParams.get('site') || ''
  const status = searchParams.get('status') || ''
  const search = searchParams.get('search') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')

  // Cek akses
  const allowedRoles = [
    'super_admin','hr_site','she_site','hr_ho',
    'pjo_site','director_ops','business_dev','manager_ops','spv_she_ho'
  ]
  const userRoles: string[] = session.roles || []
  const hasAccess = userRoles.some(r => allowedRoles.includes(r))
  if (!hasAccess) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  // Tentukan scope site
  const isSuperOrHO = userRoles.some(r =>
    ['super_admin','hr_ho','director_ops','business_dev','manager_ops','spv_she_ho'].includes(r)
  )

  let query = supabaseAdmin
    .from('mcu')
    .select(`
      id, nrp, nama_karyawan, tanggal_mcu, jenis_mcu, hasil,
      dokter, rumah_sakit, tanggal_berlaku, tanggal_expired,
      catatan_hrga, keterangan, status_mcu, butuh_followup,
      followup_deadline, temuan_summary, gdrive_folder_id,
      foto_catatan_url, foto_catatan_name,
      uploaded_by, uploaded_at, updated_by, created_at, updated_at,
      employees!mcu_nrp_fkey(jabatan, departemen, site),
      mcu_findings(
        id, jenis_temuan, status_followup,
        followup_submitted_at, verified_at, verified_status
      )
    `, { count: 'exact' })
    .order('tanggal_mcu', { ascending: false })

  // Filter site
  if (!isSuperOrHO) {
    // HR Site / SHE Site / PJO Site → hanya site sendiri
    const empRes = await supabaseAdmin
      .from('employees')
      .select('site')
      .eq('nrp', session.nrp)
      .single()
    const userSite = empRes.data?.site || ''
    query = query.eq('employees.site', userSite)
  } else if (site) {
    query = query.eq('employees.site', site)
  }

  // Filter status
  if (status) query = query.eq('status_mcu', status)

  // Search nama / NRP
  if (search) {
    query = query.or(`nama_karyawan.ilike.%${search}%,nrp.ilike.%${search}%`)
  }

  // Pagination
  const from = (page - 1) * limit
  query = query.range(from, from + limit - 1)

  const { data, error, count } = await query

  if (error) {
    console.error('MCU monitoring error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Ambil daftar sites untuk filter dropdown (super admin / HO)
  let sites: string[] = []
  if (isSuperOrHO) {
    const siteRes = await supabaseAdmin
      .from('employees')
      .select('site')
      .not('site', 'is', null)
      .eq('status_karyawan', 'Aktif')
    const siteSet = new Set(siteRes.data?.map((e: { site: string }) => e.site).filter(Boolean) || [])
    sites = Array.from(siteSet).sort()
  }

  return NextResponse.json({
    ok: true,
    data: data || [],
    count: count || 0,
    page,
    limit,
    sites,
    isSuperOrHO,
  })
}