// ═══════════════════════════════════════════════════════════════════════════
// GOOGLE CALENDAR HELPER
// CRUD event di Google Calendar via API atas nama user (pakai refresh token)
// ═══════════════════════════════════════════════════════════════════════════

import { google } from 'googleapis'
import { createOAuth2ClientWithToken } from './google-oauth'
import { supabaseAdmin } from './supabase'

export interface CalendarEventInput {
  summary: string           // Judul event
  description?: string      // Deskripsi
  location?: string         // Lokasi fisik
  startDateTime: string     // ISO 8601 datetime
  endDateTime: string       // ISO 8601 datetime
  timeZone?: string         // default: Asia/Makassar
  attendeeEmails?: string[] // Email peserta untuk invite (optional)
  reminders?: {
    useDefault: boolean
    overrides?: Array<{ method: 'email' | 'popup'; minutes: number }>
  }
}

/**
 * Ambil refresh token user dari DB
 */
async function getUserRefreshToken(nrp: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('employees')
    .select('google_refresh_token, google_access_enabled')
    .eq('nrp', nrp)
    .single()

  if (!data?.google_access_enabled) return null
  if (!data?.google_refresh_token) return null

  return data.google_refresh_token
}

/**
 * Buat client Calendar API untuk user tertentu
 */
async function getCalendarClient(nrp: string) {
  const refreshToken = await getUserRefreshToken(nrp)
  if (!refreshToken) return null

  const oauth2Client = createOAuth2ClientWithToken(refreshToken)
  return google.calendar({ version: 'v3', auth: oauth2Client })
}

/**
 * Convert tanggal + jam WITA → ISO datetime string
 * Contoh: '2026-08-05', '09:00' → '2026-08-05T09:00:00+08:00'
 */
export function toISODateTime(
  tanggal: string,
  jam: string | null,
  defaultJam = '09:00'
): string {
  const jamFinal = jam ? jam.substring(0, 5) : defaultJam
  return `${tanggal}T${jamFinal}:00+08:00`
}

/**
 * Buat event di Google Calendar user
 * Return: google_event_id (untuk update/delete nanti)
 */
export async function createCalendarEvent(
  nrp: string,
  input: CalendarEventInput
): Promise<{ ok: boolean; eventId?: string; error?: string }> {
  try {
    const calendar = await getCalendarClient(nrp)
    if (!calendar) {
      return { ok: false, error: 'User belum connect Google atau akses dinonaktifkan' }
    }

    const event = {
      summary: input.summary,
      description: input.description || '',
      location: input.location || '',
      start: {
        dateTime: input.startDateTime,
        timeZone: input.timeZone || 'Asia/Makassar',
      },
      end: {
        dateTime: input.endDateTime,
        timeZone: input.timeZone || 'Asia/Makassar',
      },
      attendees: (input.attendeeEmails || []).map(email => ({ email })),
      reminders: input.reminders || {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 60 },       // 1 jam sebelum
          { method: 'popup', minutes: 10 },       // 10 menit sebelum
          { method: 'email', minutes: 24 * 60 },  // 1 hari sebelum via email
        ],
      },
    }

    const { data } = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      sendUpdates: 'none',  // 'all' = kirim email ke attendees, 'none' = tidak
    })

    return { ok: true, eventId: data.id || undefined }
  } catch (err: any) {
    console.error(`❌ createCalendarEvent(${nrp}) failed:`, err.message)
    return { ok: false, error: err.message }
  }
}

/**
 * Update event di Google Calendar user
 */
export async function updateCalendarEvent(
  nrp: string,
  googleEventId: string,
  input: CalendarEventInput
): Promise<{ ok: boolean; error?: string }> {
  try {
    const calendar = await getCalendarClient(nrp)
    if (!calendar) return { ok: false, error: 'User belum connect Google' }

    await calendar.events.update({
      calendarId: 'primary',
      eventId: googleEventId,
      requestBody: {
        summary: input.summary,
        description: input.description || '',
        location: input.location || '',
        start: {
          dateTime: input.startDateTime,
          timeZone: input.timeZone || 'Asia/Makassar',
        },
        end: {
          dateTime: input.endDateTime,
          timeZone: input.timeZone || 'Asia/Makassar',
        },
      },
    })

    return { ok: true }
  } catch (err: any) {
    console.error(`❌ updateCalendarEvent(${nrp}) failed:`, err.message)
    return { ok: false, error: err.message }
  }
}

/**
 * Hapus event di Google Calendar user
 */
export async function deleteCalendarEvent(
  nrp: string,
  googleEventId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const calendar = await getCalendarClient(nrp)
    if (!calendar) return { ok: false, error: 'User belum connect Google' }

    await calendar.events.delete({
      calendarId: 'primary',
      eventId: googleEventId,
    })

    return { ok: true }
  } catch (err: any) {
    // Kalau event sudah dihapus manual di Google → anggap sukses
    if (err.code === 404 || err.code === 410) {
      return { ok: true }
    }
    console.error(`❌ deleteCalendarEvent(${nrp}) failed:`, err.message)
    return { ok: false, error: err.message }
  }
}

/**
 * Bulk sync: buat event di banyak Google Calendar user sekaligus
 * Return: statistik sukses/gagal
 */
export async function bulkCreateCalendarEvents(
  nrps: string[],
  input: CalendarEventInput
): Promise<{
  total: number
  synced: number
  skipped: number
  failed: number
  results: Array<{ nrp: string; ok: boolean; eventId?: string; error?: string }>
}> {
  const results = []
  let synced = 0
  let skipped = 0
  let failed = 0

  // Sequential biar tidak overload API
  for (const nrp of nrps) {
    const result = await createCalendarEvent(nrp, input)
    results.push({ nrp, ...result })

    if (result.ok) synced++
    else if (result.error?.includes('belum connect')) skipped++
    else failed++
  }

  return {
    total: nrps.length,
    synced,
    skipped,
    failed,
    results,
  }
}