// app/api/events/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase, supabaseAdmin } from '@/app/lib/supabase'
import { 
  updateCalendarEvent, 
  deleteCalendarEvent,
  toISODateTime 
} from '@/app/lib/google-calendar'

export const dynamic = 'force-dynamic'

// ═══ GET — Detail event + attendances ═══
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

// ═══ PUT — Update event (+ auto-sync Google Calendar kalau tanggal/jam berubah) ═══
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

    const { id } = await params
    const body = await request.json()

    // Ambil event lama untuk cek perubahan
    const { data: oldEvent, error: oldErr } = await supabaseAdmin
      .from('events')
      .select('*')
      .eq('id', id)
      .single()

    if (oldErr || !oldEvent) {
      return NextResponse.json({ error: 'Event tidak ditemukan' }, { status: 404 })
    }

    // Cek permission
    if (oldEvent.created_by !== session.nrp && !session.is_super_admin) {
      return NextResponse.json({ error: 'Hanya pembuat yang bisa edit' }, { status: 403 })
    }

    // Field yang boleh di-update
    const updateData: any = { updated_at: new Date().toISOString() }
    const allowedFields = [
      'nama_event', 'deskripsi', 'tipe', 'tanggal', 
      'jam_mulai', 'jam_selesai', 'lokasi', 'site', 'qr_location_id'
    ]
    for (const f of allowedFields) {
      if (body[f] !== undefined) updateData[f] = body[f]
    }

    // Update DB
    const { data: newEvent, error: updErr } = await supabaseAdmin
      .from('events')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

    // ═══════════════════════════════════════════════════════════
    // AUTO-SYNC ke Google Calendar kalau ada field penting berubah
    // ═══════════════════════════════════════════════════════════
    const hasImportantChange = 
      (body.tanggal && body.tanggal !== oldEvent.tanggal) ||
      (body.jam_mulai !== undefined && body.jam_mulai !== oldEvent.jam_mulai) ||
      (body.jam_selesai !== undefined && body.jam_selesai !== oldEvent.jam_selesai) ||
      (body.lokasi !== undefined && body.lokasi !== oldEvent.lokasi) ||
      (body.nama_event && body.nama_event !== oldEvent.nama_event) ||
      (body.deskripsi !== undefined && body.deskripsi !== oldEvent.deskripsi)

    let syncStats = { updated: 0, failed: 0 }

    if (hasImportantChange) {
      const startISO = toISODateTime(newEvent.tanggal, newEvent.jam_mulai, '09:00')
      const endISO = toISODateTime(newEvent.tanggal, newEvent.jam_selesai, '10:00')

      const calInput = {
        summary: `[BTM] ${newEvent.nama_event}`,
        description: [
          newEvent.deskripsi || '',
          '',
          `📍 Lokasi: ${newEvent.lokasi || '-'}`,
          `🏢 Site: ${newEvent.site || '-'}`,
        ].join('\n'),
        location: newEvent.lokasi || newEvent.site || '',
        startDateTime: startISO,
        endDateTime: endISO,
      }

      // Update Google Calendar creator
      if (oldEvent.google_calendar_event_id) {
        const r = await updateCalendarEvent(
          oldEvent.created_by, 
          oldEvent.google_calendar_event_id, 
          calInput
        )
        if (r.ok) syncStats.updated++
        else syncStats.failed++
      }

      // Update Google Calendar semua undangan yang sudah SYNCED
      const { data: invitations } = await supabaseAdmin
        .from('event_invitations')
        .select('*')
        .eq('event_id', id)
        .eq('google_sync_status', 'SYNCED')
        .not('google_event_id', 'is', null)

      for (const inv of invitations || []) {
        const r = await updateCalendarEvent(inv.nrp, inv.google_event_id, calInput)
        if (r.ok) syncStats.updated++
        else syncStats.failed++
      }
    }

    return NextResponse.json({
      success: true,
      message: hasImportantChange
        ? `✅ Event diperbarui. ${syncStats.updated} Google Calendar events di-update.`
        : '✅ Event diperbarui.',
      data: newEvent,
      sync_stats: hasImportantChange ? syncStats : null
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ═══ DELETE — Cancel event (+ hapus dari Google Calendar) ═══
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
    const { data: event } = await supabaseAdmin
      .from('events')
      .select('*')
      .eq('id', id)
      .single()
    if (!event) return NextResponse.json({ error: 'Event tidak ditemukan' }, { status: 404 })

    if (event.created_by !== session.nrp && !session.is_super_admin) {
      return NextResponse.json({ error: 'Hanya pembuat yang bisa batalkan' }, { status: 403 })
    }

    // Update status
    const { error } = await supabaseAdmin
      .from('events')
      .update({ 
        status: 'CANCELLED', 
        cancel_reason: 'Dibatalkan via tombol hapus',
        updated_at: new Date().toISOString() 
      })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // ═══ Auto-hapus dari Google Calendar ═══
    let deletedCount = 0

    // Creator
    if (event.google_calendar_event_id) {
      const r = await deleteCalendarEvent(event.created_by, event.google_calendar_event_id)
      if (r.ok) deletedCount++
      await supabaseAdmin
        .from('events')
        .update({ google_calendar_event_id: null })
        .eq('id', id)
    }

    // Undangan
    const { data: invitations } = await supabaseAdmin
      .from('event_invitations')
      .select('*')
      .eq('event_id', id)
      .not('google_event_id', 'is', null)

    for (const inv of invitations || []) {
      if (inv.google_event_id) {
        const r = await deleteCalendarEvent(inv.nrp, inv.google_event_id)
        if (r.ok) deletedCount++
      }
    }

    // Reset semua google_event_id di undangan
    if ((invitations || []).length > 0) {
      await supabaseAdmin
        .from('event_invitations')
        .update({ 
          google_event_id: null,
          google_sync_status: 'PENDING',
          google_sync_error: 'Event dibatalkan'
        })
        .eq('event_id', id)
    }

    return NextResponse.json({ 
      success: true, 
      message: `✅ Event dibatalkan. ${deletedCount} Google Calendar events dihapus.` 
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}