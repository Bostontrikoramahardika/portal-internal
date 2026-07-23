// app/api/mcu/monitoring/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
    const session = auth.session!

    const { searchParams } = new URL(req.url)
    const site = searchParams.get('site') || ''
    const status = searchParams.get('status') || ''
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Roles
    const userRoles: string[] = Array.isArray(session.roles) ? session.roles : []
    const isSuperAdmin = Boolean(session.is_super_admin) || userRoles.includes('super_admin')

    const allowedRoles = [
      'super_admin','hr_site','she_site','hr_ho',
      'pjo_site','director_ops','business_dev','manager_ops','spv_she_ho'
    ]
    const hasAccess = isSuperAdmin || userRoles.some(r => allowedRoles.includes(r))
    if (!hasAccess) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    // Scope
    const isSuperOrHO = isSuperAdmin || userRoles.some(r =>
      ['hr_ho','director_ops','business_dev','manager_ops','spv_she_ho'].includes(r)
    )

    // ─── STEP 1: Query MCU tanpa join dulu ─────────
    let mcuQuery = supabaseAdmin
      .from('mcu')
      .select('*', { count: 'exact' })
      .order('tanggal_mcu', { ascending: false, nullsFirst: false })

    // Filter status
    if (status) mcuQuery = mcuQuery.eq('status_mcu', status)

    // Filter search
    if (search) {
      mcuQuery = mcuQuery.or(`nama_karyawan.ilike.%${search}%,nrp.ilike.%${search}%`)
    }

    // Pagination
    const from = (page - 1) * limit
    mcuQuery = mcuQuery.range(from, from + limit - 1)

    const { data: mcuData, error: mcuError, count } = await mcuQuery
    if (mcuError) {
      console.error('MCU query error:', mcuError)
      return NextResponse.json({ error: mcuError.message }, { status: 500 })
    }

    // ─── STEP 2: Fetch data employees terpisah untuk enrich ─────────
    const nrpList = [...new Set((mcuData || []).map(m => m.nrp).filter(Boolean))]
    let empMap: Record<string, { jabatan: string; departemen: string; site: string }> = {}

    if (nrpList.length > 0) {
      const { data: empData } = await supabaseAdmin
        .from('employees')
        .select('nrp, jabatan, departemen, site')
        .in('nrp', nrpList)
      empMap = Object.fromEntries(
        (empData || []).map(e => [e.nrp, {
          jabatan: e.jabatan || '',
          departemen: e.departemen || '',
          site: e.site || '',
        }])
      )
    }

    // ─── STEP 3: Fetch findings per MCU ─────────
    const mcuIds = (mcuData || []).map(m => m.id)
    let findingsMap: Record<string, any[]> = {}

    if (mcuIds.length > 0) {
      const { data: findingsData } = await supabaseAdmin
        .from('mcu_findings')
        .select('id, mcu_id, jenis_temuan, status_followup, followup_submitted_at, verified_at, verified_status')
        .in('mcu_id', mcuIds)

      findingsMap = (findingsData || []).reduce((acc: Record<string, any[]>, f: any) => {
        if (!acc[f.mcu_id]) acc[f.mcu_id] = []
        acc[f.mcu_id].push(f)
        return acc
      }, {})
    }

    // ─── STEP 4: Enrich MCU data + filter by site untuk non-superadmin ─────────
    let enrichedData = (mcuData || []).map(m => ({
      ...m,
      employees: empMap[m.nrp] || { jabatan: '', departemen: '', site: '' },
      mcu_findings: findingsMap[m.id] || [],
    }))

    // Filter by site
    if (!isSuperOrHO) {
      const { data: empSelf } = await supabaseAdmin
        .from('employees')
        .select('site')
        .eq('nrp', session.nrp)
        .single()
      const userSite = empSelf?.site || ''
      enrichedData = enrichedData.filter(m => m.employees.site === userSite)
    } else if (site) {
      enrichedData = enrichedData.filter(m => m.employees.site === site)
    }

    // ─── STEP 5: Sites list (untuk filter dropdown) ─────────
    let sites: string[] = []
    if (isSuperOrHO) {
      const { data: siteData } = await supabaseAdmin
        .from('employees')
        .select('site')
        .not('site', 'is', null)
        .eq('status_karyawan', 'Aktif')
      const siteSet = new Set(
        (siteData || [])
          .map((e: { site: string }) => (e.site || '').trim())
          .filter(Boolean)
      )
      sites = Array.from(siteSet).sort()
    }

    return NextResponse.json({
      ok: true,
      data: enrichedData,
      count: count || 0,
      page,
      limit,
      sites,
      isSuperOrHO,
    })
  } catch (err: any) {
    console.error('MCU monitoring fatal error:', err)
    return NextResponse.json(
      { error: err.message || 'Internal server error', stack: err.stack },
      { status: 500 }
    )
  }
}