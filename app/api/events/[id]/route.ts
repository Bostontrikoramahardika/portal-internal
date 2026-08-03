// app/api/events/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

    const { id } = await params

    const { data: event, error } = await supabase
      .from('events')
      .select('*, qr_locations(nama_lokasi, qr_token)')
      .eq('id', id)
      .single()

    if (error || !event) return NextResponse.json({ error: 'Event tidak ditemukan' }, { status: 404 })

    const { data: attendances } = await supabase
      .from('event_attendances')
      .select('*')
      .eq('event_id', id)
      .order('scan_at', { ascending: true })

    return NextResponse.json({
      success: true,
      event: {
        ...event,
        nama_lokasi: event.qr_locations?.nama_lokasi || null,
        lokasi_qr_token: event.qr_locations?.qr_token || null
      },
      attendances: attendances || [],
      total_hadir: (attendances || []).length,
      total_internal: (attendances || []).filter((a: any) => !a.is_tamu).length,
      total_tamu: (attendances || []).filter((a: any) => a.is_tamu).length,
      is_owner: event.created_by === session.nrp || session.is_super_admin
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

    const { id } = await params
    const { data: event } = await supabase.from('events').select('created_by').eq('id', id).single()
    if (!event) return NextResponse.json({ error: 'Event tidak ditemukan' }, { status: 404 })

    if (event.created_by !== session.nrp && !session.is_super_admin) {
      return NextResponse.json({ error: 'Hanya pembuat yang bisa batalkan' }, { status: 403 })
    }

    const { error } = await supabase
      .from('events')
      .update({ status: 'DIBATALKAN', updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, message: '✅ Event dibatalkan' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}