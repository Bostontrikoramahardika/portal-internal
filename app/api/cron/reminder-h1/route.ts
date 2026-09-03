// app/api/cron/reminder-h1/route.ts
// v1.0 - Cron Reminder H-1 untuk event CONFIRMED / AKTIF besok (WITA timezone)

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabase'
import { notifyMany } from '@/app/lib/web-push'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    // 1. Validasi CRON SECRET (Proteksi agar tidak sembarang orang bisa trigger API ini)
    const authHeader = req.headers.get('authorization')
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 })
    }

    // 2. Hitung tanggal besok presisi di zona WITA (Asia/Makassar)
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Makassar',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
    
    const parts = formatter.formatToParts(now)
    const y = parts.find(p => p.type === 'year')?.value
    const m = parts.find(p => p.type === 'month')?.value
    const d = parts.find(p => p.type === 'day')?.value

    if (!y || !m || !d) {
      throw new Error('Gagal memformat tanggal WITA')
    }

    // Buat objek tanggal hari ini di WITA, lalu tambah 24 jam untuk mendapatkan tanggal besok
    const todayWita = new Date(`${y}-${m}-${d}T00:00:00+08:00`)
    const tomorrowWita = new Date(todayWita.getTime() + 24 * 60 * 60 * 1000)
    const tomorrowStr = tomorrowWita.toISOString().split('T')[0] // Format: YYYY-MM-DD

    // 3. Tarik semua event CONFIRMED / AKTIF yang dijadwalkan besok
    const { data: events, error: eventErr } = await supabaseAdmin
      .from('events')
      .select('id, nama_acara, tanggal_mulai, jam_mulai, lokasi, site, created_by')
      .eq('tanggal_mulai', tomorrowStr)
      .in('status', ['CONFIRMED', 'AKTIF'])

    if (eventErr) throw eventErr
    if (!events || events.length === 0) {
      return NextResponse.json({
        success: true,
        message: `Tidak ada event status CONFIRMED/AKTIF untuk besok (${tomorrowStr})`,
        processed: 0
      })
    }

    let totalNotified = 0
    const results: any[] = []

    // 4. Loop setiap event dan kumpulkan peserta undangan
    for (const evt of events) {
      const { data: invites, error: inviteErr } = await supabaseAdmin
        .from('event_invitations')
        .select('nrp')
        .eq('event_id', evt.id)

      if (inviteErr) {
        console.error(`[cron] Gagal mengambil undangan untuk event ${evt.id}:`, inviteErr.message)
        continue
      }

      // Gabungkan daftar NRP undangan dengan NRP pembuat acara (creator)
      const nrpList = Array.from(
        new Set([
          ...(invites || []).map((i: any) => i.nrp),
          evt.created_by
        ])
      ).filter(Boolean)

      if (nrpList.length > 0) {
        const jamFormatted = evt.jam_mulai ? evt.jam_mulai.substring(0, 5) : '08:00'
        const payload = {
          title: `⏰ Reminder Meeting Besok: ${evt.nama_acara}`,
          body: `Besok jam ${jamFormatted} WITA di ${evt.lokasi || evt.site || 'Site'}. Harap hadir tepat waktu.`,
          icon: '📅',
          url: `/dashboard/kelola-event/${evt.id}`,
          category: 'EVENT_REMINDER_H1',
          data: {
            eventId: evt.id,
            tanggal: evt.tanggal_mulai,
            jam: evt.jam_mulai
          }
        }

        // notifyMany mengirim push via web-push sekaligus menyimpan riwayat ke tabel notifications
        await notifyMany(nrpList, payload)
        totalNotified += nrpList.length
        results.push({ eventId: evt.id, nama: evt.nama_acara, total_peserta: nrpList.length })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil memproses reminder H-1 untuk besok (${tomorrowStr})`,
      date: tomorrowStr,
      eventsProcessed: events.length,
      totalNotified,
      details: results
    })
  } catch (err: any) {
    console.error('[cron/reminder-h1] Fatal error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}