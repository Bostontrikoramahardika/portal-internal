// app/api/qr-locations/route.ts
// GET  → List QR Lokasi (filter by role/site)
// POST → Buat QR Lokasi baru

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

function canManage(session: any): boolean {
  if (session.is_super_admin) return true
  const roles = (session.roles || []).map((r: string) => r.toLowerCase())
  return roles.some((r: string) =>
    [
      'she_site', 'spv_she_ho',
      'pjo_site', 'pjo',
      'hr_ho', 'hrga', 'hrga_pusat',
      'hr_site', 'hrga_site',
      'admin', 'admin_site', 'admin_plant',
      'gl_produksi', 'gl_plant',
      'director_ops', 'manager_ops', 'business_dev'
    ].includes(r)
  )
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

    if (!canManage(session)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const site = searchParams.get('site') || ''

    let query = supabase
      .from('qr_locations')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false })

    const rolesLower = (session.roles || []).map((r: string) => r.toLowerCase())
    const isHOScope = session.is_super_admin || rolesLower.some((r: string) =>
      ['hr_ho', 'hrga', 'hrga_pusat', 'admin',
       'director_ops', 'manager_ops', 'business_dev', 'spv_she_ho'].includes(r)
    )
    const userSite = session.scope_site || session.site || ''

    if (!isHOScope && userSite) query = query.eq('site', userSite)
    if (site) query = query.eq('site', site)

    const { data: locations, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Hitung total event per lokasi
    const locIds = (locations || []).map((l: any) => l.id)
    const eventCountMap = new Map<string, number>()
    if (locIds.length > 0) {
      const { data: events } = await supabase
        .from('events')
        .select('qr_location_id')
        .in('qr_location_id', locIds)
      ;(events || []).forEach((e: any) => {
        if (e.qr_location_id) {
          eventCountMap.set(e.qr_location_id, (eventCountMap.get(e.qr_location_id) || 0) + 1)
        }
      })
    }

    const rows = (locations || []).map((l: any) => ({
      ...l,
      total_event: eventCountMap.get(l.id) || 0
    }))

    // Get sites list
    const { data: sitesList } = await supabase
      .from('sites_config')
      .select('nama_site')
      .eq('is_active', true)
      .order('nama_site')

    return NextResponse.json({
      success: true,
      data: rows,
      sites: (sitesList || []).map((s: any) => s.nama_site),
      can_manage: true
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

    if (!canManage(session)) {
      return NextResponse.json({ error: 'Anda tidak berhak' }, { status: 403 })
    }

    const body = await request.json()
    const { nama_lokasi, deskripsi, site } = body

    if (!nama_lokasi) {
      return NextResponse.json({ error: 'Nama lokasi wajib' }, { status: 400 })
    }

    const qrToken = crypto.randomBytes(12).toString('base64url').substring(0, 16)

    const { data: newLoc, error } = await supabase
      .from('qr_locations')
      .insert({
        nama_lokasi: String(nama_lokasi).trim(),
        deskripsi: deskripsi || null,
        site: site || session.scope_site || session.site || null,
        qr_token: qrToken,
        active: true,
        created_by: session.nrp,
        created_by_nama: session.nama
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      success: true,
      message: '✅ QR Lokasi berhasil dibuat',
      data: newLoc
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}