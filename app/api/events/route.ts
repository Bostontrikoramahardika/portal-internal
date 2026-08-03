// app/api/events/route.ts
// GET  → List events (filter by tanggal/site/lokasi)
// POST → Buat event (link ke QR Lokasi)

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
    const status = searchParams.get('status') || ''
    const site = searchParams.get('site') || ''
    const qrLocationId = searchParams.get('qr_location_id') || ''

    let query = supabase
      .from('events')
      .select('*, qr_locations(nama_lokasi)')
      .order('tanggal', { ascending: false })
      .order('jam_mulai', { ascending: false })

    if (status) query = query.eq('status', status)
    if (qrLocationId) query = query.eq('qr_location_id', qrLocationId)

    const rolesLower = (session.roles || []).map((r: string) => r.toLowerCase())
    const isHOScope = session.is_super_admin || rolesLower.some((r: string) =>
      ['hr_ho', 'hrga', 'hrga_pusat', 'admin',
       'director_ops', 'manager_ops', 'business_dev', 'spv_she_ho'].includes(r)
    )
    const userSite = session.scope_site || session.site || ''

    if (!isHOScope && userSite) query = query.eq('site', userSite)
    if (site) query = query.eq('site', site)

    const { data: events, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Hitung total peserta per event
    const eventIds = (events || []).map((e: any) => e.id)
    const attCountMap = new Map<string, number>()
    if (eventIds.length > 0) {
      const { data: atts } = await supabase
        .from('event_attendances')
        .select('event_id')
        .in('event_id', eventIds)
      ;(atts || []).forEach((a: any) => {
        attCountMap.set(a.event_id, (attCountMap.get(a.event_id) || 0) + 1)
      })
    }

    const rows = (events || []).map((e: any) => ({
      ...e,
      nama_lokasi: e.qr_locations?.nama_lokasi || null,
      total_hadir: attCountMap.get(e.id) || 0
    }))

    return NextResponse.json({
      success: true,
      data: rows,
      can_create: true
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
    const {
      nama_event,
      deskripsi,
      tipe,
      tanggal,
      jam_mulai,
      jam_selesai,
      lokasi,
      site,
      qr_location_id
    } = body

    if (!nama_event || !tanggal) {
      return NextResponse.json({ error: 'nama_event & tanggal wajib' }, { status: 400 })
    }

    // Generate qr_token standalone (untuk backward compat kalau tidak pakai qr_location)
    const qrToken = crypto.randomBytes(12).toString('base64url').substring(0, 16)

    const { data: newEvent, error } = await supabase
      .from('events')
      .insert({
        nama_event: String(nama_event).trim(),
        deskripsi: deskripsi || null,
        tipe: tipe || 'MEETING',
        tanggal,
        jam_mulai: jam_mulai || null,
        jam_selesai: jam_selesai || null,
        lokasi: lokasi || null,
        site: site || session.scope_site || session.site || null,
        qr_token: qrToken,
        qr_location_id: qr_location_id || null,
        created_by: session.nrp,
        created_by_nama: session.nama,
        status: 'AKTIF'
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      success: true,
      message: '✅ Event berhasil dibuat',
      data: newEvent
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}