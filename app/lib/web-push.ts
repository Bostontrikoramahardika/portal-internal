// app/lib/web-push.ts
// Helper untuk kirim push notification via web-push

import webpush from 'web-push'
import { supabase } from './supabase'

// Setup VAPID (1x saat file di-import)
if (process.env.VAPID_SUBJECT && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

export type PushPayload = {
  title: string
  body: string
  icon?: string
  url?: string
  tag?: string
  data?: any
}

/**
 * Kirim push notification ke 1 user (semua device dia)
 */
export async function sendPushToUser(nrp: string, payload: PushPayload) {
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('nrp', nrp)

  if (!subs || subs.length === 0) {
    return { sent: 0, failed: 0, total: 0 }
  }

  let sent = 0
  let failed = 0
  const deadIds: string[] = []

  await Promise.all(
    subs.map(async (sub: any) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth }
          },
          JSON.stringify(payload)
        )
        sent++
      } catch (err: any) {
        failed++
        // 410 Gone / 404 → subscription expired/invalid → hapus
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          deadIds.push(sub.id)
        }
        console.error(`Push error ke ${nrp}:`, err?.statusCode, err?.body)
      }
    })
  )

  // Hapus subscription yang mati
  if (deadIds.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', deadIds)
  }

  return { sent, failed, total: subs.length }
}

/**
 * Kirim ke banyak user sekaligus
 */
export async function sendPushToMany(nrps: string[], payload: PushPayload) {
  const results = await Promise.all(nrps.map((nrp) => sendPushToUser(nrp, payload)))
  return results.reduce(
    (acc, r) => ({
      sent: acc.sent + r.sent,
      failed: acc.failed + r.failed,
      total: acc.total + r.total
    }),
    { sent: 0, failed: 0, total: 0 }
  )
}

/**
 * Simpan ke tabel notifications (in-app bell) + kirim push
 */
export async function notifyUser(
  nrp: string,
  payload: PushPayload & { category?: string }
) {
  // 1. Simpan ke DB (bell notification)
  await supabase.from('notifications').insert({
    nrp,
    title: payload.title,
    body: payload.body,
    icon: payload.icon,
    url: payload.url,
    category: payload.category || 'GENERAL',
    data: payload.data || null
  })

  // 2. Kirim push notif
  return sendPushToUser(nrp, payload)
}

/**
 * Simpan + push ke banyak user
 */
export async function notifyMany(
  nrps: string[],
  payload: PushPayload & { category?: string }
) {
  await Promise.all(nrps.map((nrp) => notifyUser(nrp, payload)))
}