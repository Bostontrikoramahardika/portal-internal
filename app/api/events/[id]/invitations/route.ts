// ═══════════════════════════════════════════════════════════════════════════
// EVENT INVITATIONS API
// GET    /api/events/[id]/invitations         → List undangan
// POST   /api/events/[id]/invitations         → Tambah undangan (single/bulk)
// DELETE /api/events/[id]/invitations?nrp=xxx → Hapus undangan
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'
import { supabaseAdmin } from '@/app/lib/supabase'
import { 
  createCalendarEvent, 
  deleteCalendarEvent, 
  toISODateTime 
} from '@/app/lib/google-calendar'

export const dynamic = 'force-dynamic'

// ═══ Helper: cek permission ═══
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

// ═══ GET — List undangan per event ═══
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

    const { id: eventId } = await params

    const { data, error } = await supabase
      .from('event_invitations')
      .select('*')
      .eq('event_id', eventId)
      .order('invited_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Hitung ringkasan
    const total = (data || []).length
    const synced = (data || []).filter((d: any) => d.google_sync_status === 'SYNCED').length
    const pending = (data || []).filter((d: any) => d.google_sync_status === 'PENDING').length
    const failed = (data || []).filter((d: any) => d.google_sync_status === 'FAILED').length
    const skipped = (data || []).filter((d: any) => d.google_sync_status === 'SKIPPED').length

    return NextResponse.json({
      success: true,
      data: data || [],
      summary: { total, synced, pending, failed, skipped }
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ═══ POST — Tambah undangan (single atau bulk) + auto-sync ═══
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
    const { nrps } = body  // array NRP peserta

    if (!Array.isArray(nrps) || nrps.length === 0) {
      return NextResponse.json({ error: 'nrps wajib array' }, { status: 400 })
    }

    // ─── Ambil detail event ───
    const { data: event, error: eventErr } = await supabaseAdmin
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (eventErr || !event) {
      return NextResponse.json({ error: 'Event tidak ditemukan' }, { status: 404 })
    }

    // ─── Ambil data karyawan (nama + google_access + email) ───
    const { data: emps } = await supabaseAdmin
      .from('employees')
      .select('nrp, nama, google_email, google_access_enabled, google_refresh_token')
      .in('nrp', nrps)

    const empMap = new Map((emps || []).map((e: any) => [e.nrp, e]))

    // ─── Cek yang sudah pernah diundang (biar tidak duplikat) ───
    const { data: existing } = await supabaseAdmin
      .from('event_invitations')
      .select('nrp')
      .eq('event_id', eventId)
      .in('nrp', nrps)

    const existingSet = new Set((existing || []).map((e: any) => e.nrp))
    const newNrps = nrps.filter((n: string) => !existingSet.has(n))

    if (newNrps.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Semua NRP sudah pernah diundang',
        inserted: 0
      })
    }

    // ─── Insert ke event_invitations (status awal: PENDING) ───
    const insertRows = newNrps.map((nrp: string) => {
      const emp = empMap.get(nrp) as any
      return {
        event_id: eventId,
        nrp,
        nama: emp?.nama || null,
        google_sync_status: 'PENDING',
        invited_by: session.nrp
      }
    })

    const { data: inserted, error: insErr } = await supabaseAdmin
      .from('event_invitations')
      .insert(insertRows)
      .select()

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 })
    }

    // ─── AUTO-SYNC ke Google Calendar (loop 1 per 1) ───
    const startISO = toISODateTime(event.tanggal, event.jam_mulai, '09:00')
    const endISO = toISODateTime(event.tanggal, event.jam_selesai, '10:00')

    let syncedCount = 0
    let skippedCount = 0
    let failedCount = 0

    for (const inv of inserted || []) {
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

      // Sync ke Google Calendar
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

    return NextResponse.json({
      success: true,
      message: `✅ ${newNrps.length} peserta diundang. ${syncedCount} ter-sync ke Google Calendar.`,
      inserted: newNrps.length,
      stats: {
        total: newNrps.length,
        synced: syncedCount,
        skipped: skippedCount,
        failed: failedCount
      }
    })
  } catch (err: any) {
    console.error('POST invitations error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ═══ DELETE — Hapus undangan (+ hapus dari Google Calendar) ═══
export async function DELETE(
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
    const { searchParams } = new URL(request.url)
    const nrp = searchParams.get('nrp')

    if (!nrp) {
      return NextResponse.json({ error: 'nrp query wajib' }, { status: 400 })
    }

    // Ambil invitation
    const { data: inv } = await supabaseAdmin
      .from('event_invitations')
      .select('*')
      .eq('event_id', eventId)
      .eq('nrp', nrp)
      .single()

    if (!inv) {
      return NextResponse.json({ error: 'Undangan tidak ditemukan' }, { status: 404 })
    }

    // Hapus dari Google Calendar dulu (kalau ter-sync)
    if (inv.google_event_id && inv.google_sync_status === 'SYNCED') {
      await deleteCalendarEvent(inv.nrp, inv.google_event_id)
    }

    // Hapus dari DB
    const { error } = await supabaseAdmin
      .from('event_invitations')
      .delete()
      .eq('id', inv.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      success: true,
      message: `Undangan untuk ${nrp} dihapus`
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}