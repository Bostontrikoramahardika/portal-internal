// app/api/events/[id]/confirm/route.ts
// POST → Confirm / Cancel / Postpone event
// Body: { action: 'CONFIRM' | 'CANCEL' | 'POSTPONE', reason?, new_date? }

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase, supabaseAdmin } from '@/app/lib/supabase'
import { 
  createCalendarEvent, 
  updateCalendarEvent,
  deleteCalendarEvent,
  toISODateTime 
} from '@/app/lib/google-calendar'

export const dynamic = 'force-dynamic'

function canManage(session: any): boolean {
  if (session.is_super_admin) return true
  const roles = (session.roles || []).map((r: string) => r.toLowerCase())
  return roles.some((r: string) =>
    ['she_site', 'spv_she_ho', 'pjo_site', 'pjo',
     'hr_ho', 'hrga', 'hrga_pusat', 'hr_site', 'hrga_site',
     'admin', 'admin_site', 'admin_plant',
     'gl_produksi', 'gl_plant',
     'director_ops', 'manager_ops', 'business_dev'].includes(r)
  )
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

    if (!canManage(session)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const { id: eventId } = await params
    const body = await request.json()
    const { action, reason, new_date } = body

    if (!['CONFIRM', 'CANCEL', 'POSTPONE'].includes(action)) {
      return NextResponse.json({ error: 'action tidak valid' }, { status: 400 })
    }

    // ─── Ambil event ───
    const { data: event, error: eventErr } = await supabaseAdmin
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (eventErr || !event) {
      return NextResponse.json({ error: 'Event tidak ditemukan' }, { status: 404 })
    }

    // ═══════════════════════════════════════════════════════════
    // ACTION: CONFIRM (DRAFT/PENDING_CONFIRM → CONFIRMED + auto-sync)
    // ═══════════════════════════════════════════════════════════
    if (action === 'CONFIRM') {
      // Update status
      const { error: updErr } = await supabaseAdmin
        .from('events')
        .update({
          status: 'CONFIRMED',
          confirmed_by: session.nrp,
          confirmed_at: new Date().toISOString(),
          cancel_reason: null
        })
        .eq('id', eventId)

      if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

      // ─── AUTO-SYNC ke Google Calendar untuk semua UNDANGAN ───
      const { data: invitations } = await supabaseAdmin
        .from('event_invitations')
        .select('*')
        .eq('event_id', eventId)

      const startISO = toISODateTime(event.tanggal, event.jam_mulai, '09:00')
      const endISO = toISODateTime(event.tanggal, event.jam_selesai, '10:00')

      let syncedCount = 0
      let skippedCount = 0
      let failedCount = 0

      // Ambil data karyawan sekaligus
      const invNrps = (invitations || []).map((i: any) => i.nrp)
      const { data: emps } = invNrps.length > 0 ? await supabaseAdmin
        .from('employees')
        .select('nrp, google_email, google_access_enabled, google_refresh_token')
        .in('nrp', invNrps) : { data: [] }

      const empMap = new Map((emps || []).map((e: any) => [e.nrp, e]))

      for (const inv of invitations || []) {
        const emp = empMap.get(inv.nrp) as any

        // Skip kalau user tidak diizinkan atau belum connect
        if (!emp?.google_access_enabled || !emp?.google_refresh_token) {
          await supabaseAdmin
            .from('event_invitations')
            .update({
              google_sync_status: 'SKIPPED',
              google_sync_error: !emp?.google_access_enabled
                ? 'Akses Google belum diizinkan'
                : 'User belum connect Google'
            })
            .eq('id', inv.id)
          skippedCount++
          continue
        }

        // Kalau sudah pernah sync (ada google_event_id), skip
        if (inv.google_event_id && inv.google_sync_status === 'SYNCED') {
          syncedCount++
          continue
        }

        const result = await createCalendarEvent(inv.nrp, {
          summary: `[BTM] ${event.nama_event}`,
          description: [
            event.deskripsi || '',
            '',
            `📍 Lokasi: ${event.lokasi || '-'}`,
            `🏢 Site: ${event.site || '-'}`,
            `👤 Dibuat oleh: ${event.created_by_nama || '-'}`,
            '',
            '─────────────────────────',
            'ℹ️ Event ini dari BTM Portal.',
            'Silakan datang tepat waktu dan scan QR untuk absensi.'
          ].join('\n'),
          location: event.lokasi || event.site || '',
          startDateTime: startISO,
          endDateTime: endISO,
        })

        if (result.ok) {
          await supabaseAdmin
            .from('event_invitations')
            .update({
              google_sync_status: 'SYNCED',
              google_event_id: result.eventId,
              google_sync_error: null
            })
            .eq('id', inv.id)
          syncedCount++
        } else {
          await supabaseAdmin
            .from('event_invitations')
            .update({
              google_sync_status: 'FAILED',
              google_sync_error: result.error || 'Unknown error'
            })
            .eq('id', inv.id)
          failedCount++
        }
      }

      // ─── SYNC KE CREATOR juga (kalau belum di-sync) ───
      if (!event.google_calendar_event_id) {
        const creatorResult = await createCalendarEvent(event.created_by, {
          summary: `[BTM] ${event.nama_event}`,
          description: [
            event.deskripsi || '',
            '',
            `📍 Lokasi: ${event.lokasi || '-'}`,
            `🏢 Site: ${event.site || '-'}`,
          ].join('\n'),
          location: event.lokasi || event.site || '',
          startDateTime: startISO,
          endDateTime: endISO,
        })

        if (creatorResult.ok && creatorResult.eventId) {
          await supabaseAdmin
            .from('events')
            .update({ google_calendar_event_id: creatorResult.eventId })
            .eq('id', eventId)
        }
      }

      return NextResponse.json({
        success: true,
        message: `✅ Event dikonfirmasi. ${syncedCount} ter-sync ke Google Calendar, ${skippedCount} skipped, ${failedCount} failed.`,
        stats: {
          total_invitations: (invitations || []).length,
          synced: syncedCount,
          skipped: skippedCount,
          failed: failedCount
        }
      })
    }

    // ═══════════════════════════════════════════════════════════
    // ACTION: CANCEL (→ CANCELLED + hapus dari Google Calendar)
    // ═══════════════════════════════════════════════════════════
    if (action === 'CANCEL') {
      // Update status
      const { error: updErr } = await supabaseAdmin
        .from('events')
        .update({
          status: 'CANCELLED',
          cancel_reason: reason || 'Tidak ada alasan',
          confirmed_by: session.nrp,
          confirmed_at: new Date().toISOString()
        })
        .eq('id', eventId)

      if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

      // Hapus dari Google Calendar (creator + semua undangan)
      let deletedCount = 0

      // Creator
      if (event.google_calendar_event_id) {
        const r = await deleteCalendarEvent(event.created_by, event.google_calendar_event_id)
        if (r.ok) deletedCount++
        await supabaseAdmin
          .from('events')
          .update({ google_calendar_event_id: null })
          .eq('id', eventId)
      }

      // Undangan
      const { data: invitations } = await supabaseAdmin
        .from('event_invitations')
        .select('*')
        .eq('event_id', eventId)
        .not('google_event_id', 'is', null)

      for (const inv of invitations || []) {
        if (inv.google_event_id) {
          const r = await deleteCalendarEvent(inv.nrp, inv.google_event_id)
          if (r.ok) deletedCount++
          await supabaseAdmin
            .from('event_invitations')
            .update({ 
              google_event_id: null,
              google_sync_status: 'PENDING',
              google_sync_error: 'Event dibatalkan'
            })
            .eq('id', inv.id)
        }
      }

      return NextResponse.json({
        success: true,
        message: `❌ Event dibatalkan. ${deletedCount} Google Calendar events dihapus.`
      })
    }

    // ═══════════════════════════════════════════════════════════
    // ACTION: POSTPONE (ubah tanggal + update Google Calendar)
    // ═══════════════════════════════════════════════════════════
    if (action === 'POSTPONE') {
      if (!new_date) {
        return NextResponse.json({ error: 'new_date wajib untuk POSTPONE' }, { status: 400 })
      }

      // Update tanggal + status
      const { error: updErr } = await supabaseAdmin
        .from('events')
        .update({
          tanggal: new_date,
          status: 'POSTPONED',
          cancel_reason: reason || null,
          confirmed_by: session.nrp,
          confirmed_at: new Date().toISOString()
        })
        .eq('id', eventId)

      if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

      // Update Google Calendar creator
      const startISO = toISODateTime(new_date, event.jam_mulai, '09:00')
      const endISO = toISODateTime(new_date, event.jam_selesai, '10:00')

      let updatedCount = 0

      if (event.google_calendar_event_id) {
        const r = await updateCalendarEvent(event.created_by, event.google_calendar_event_id, {
          summary: `[BTM - DIUNDUR] ${event.nama_event}`,
          description: `⚠️ Event ini diundur.\nAlasan: ${reason || '-'}\n\n${event.deskripsi || ''}`,
          location: event.lokasi || event.site || '',
          startDateTime: startISO,
          endDateTime: endISO,
        })
        if (r.ok) updatedCount++
      }

      // Update Google Calendar semua undangan
      const { data: invitations } = await supabaseAdmin
        .from('event_invitations')
        .select('*')
        .eq('event_id', eventId)
        .eq('google_sync_status', 'SYNCED')

      for (const inv of invitations || []) {
        if (inv.google_event_id) {
          const r = await updateCalendarEvent(inv.nrp, inv.google_event_id, {
            summary: `[BTM - DIUNDUR] ${event.nama_event}`,
            description: `⚠️ Event ini diundur.\nAlasan: ${reason || '-'}\n\n${event.deskripsi || ''}`,
            location: event.lokasi || event.site || '',
            startDateTime: startISO,
            endDateTime: endISO,
          })
          if (r.ok) updatedCount++
        }
      }

      return NextResponse.json({
        success: true,
        message: `📅 Event diundur ke ${new_date}. ${updatedCount} Google Calendar events diperbarui.`
      })
    }

    return NextResponse.json({ error: 'Action tidak dikenal' }, { status: 400 })
  } catch (err: any) {
    console.error('Confirm event error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}