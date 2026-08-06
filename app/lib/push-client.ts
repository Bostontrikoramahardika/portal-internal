// app/lib/push-client.ts
// Helper untuk minta izin & subscribe di browser

'use client'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!

/**
 * Convert VAPID public key dari base64 URL-safe ke Uint8Array
 * Backed by ArrayBuffer murni (bukan ArrayBufferLike/SharedArrayBuffer)
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)

  const buffer = new ArrayBuffer(rawData.length)
  const outputArray = new Uint8Array(buffer)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Cek apakah browser support Push Notification
 */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/**
 * Cek status permission notifikasi saat ini
 */
export function getNotificationPermission(): NotificationPermission | null {
  if (typeof window === 'undefined' || !('Notification' in window)) return null
  return Notification.permission
}

/**
 * Cek apakah user sudah subscribe push
 */
export async function isSubscribed(): Promise<boolean> {
  try {
    if (!isPushSupported()) return false
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    return !!subscription
  } catch {
    return false
  }
}

/**
 * Subscribe push notification untuk user ini
 * Return: subscription object atau null jika gagal
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  try {
    if (!isPushSupported()) {
      console.warn('[Push] Browser tidak support push notification')
      return null
    }

    // 1. Minta permission
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.warn('[Push] Permission ditolak:', permission)
      return null
    }

    // 2. Register / get service worker
    const registration = await navigator.serviceWorker.ready

    // 3. Cek existing subscription
    const existing = await registration.pushManager.getSubscription()
    if (existing) {
      console.log('[Push] Sudah ada subscription, pakai existing')
      await sendSubscriptionToServer(existing)
      return existing
    }

    // 4. Subscribe baru
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    })

    console.log('[Push] Subscription baru berhasil:', subscription.endpoint.slice(0, 50) + '...')

    // 5. Kirim ke server
    await sendSubscriptionToServer(subscription)

    return subscription
  } catch (error) {
    console.error('[Push] subscribeToPush error:', error)
    return null
  }
}

/**
 * Unsubscribe push notification
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    if (!isPushSupported()) return false

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      console.log('[Push] Tidak ada subscription aktif')
      return true
    }

    // 1. Hapus dari server dulu
    await fetch('/api/push/subscribe', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    })

    // 2. Unsubscribe dari browser
    const result = await subscription.unsubscribe()
    console.log('[Push] Unsubscribe result:', result)

    return result
  } catch (error) {
    console.error('[Push] unsubscribeFromPush error:', error)
    return false
  }
}

/**
 * Kirim subscription ke server untuk disimpan di DB
 */
async function sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
  const key = subscription.getKey('p256dh')
  const auth = subscription.getKey('auth')

  if (!key || !auth) {
    console.error('[Push] Subscription key/auth kosong')
    return
  }

  // Encode ArrayBuffer ke base64
  const p256dh = btoa(String.fromCharCode(...new Uint8Array(key)))
  const authKey = btoa(String.fromCharCode(...new Uint8Array(auth)))

  // Device info
  const deviceInfo = {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
  }

  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      p256dh,
      auth: authKey,
      device_info: deviceInfo,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    console.error('[Push] Gagal simpan subscription ke server:', err)
  } else {
    console.log('[Push] Subscription berhasil disimpan ke server')
  }
}

/**
 * Test kirim notif ke diri sendiri (panggil API /api/push/test)
 */
export async function sendTestNotification(): Promise<boolean> {
  try {
    const res = await fetch('/api/push/test', { method: 'POST' })
    const data = await res.json()
    console.log('[Push] Test notification result:', data)
    return data.success === true
  } catch (error) {
    console.error('[Push] sendTestNotification error:', error)
    return false
  }
}