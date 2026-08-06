'use client'

import { useEffect, useState } from 'react'
import {
  isPushSupported,
  getNotificationPermission,
  isSubscribed,
  subscribeToPush,
  unsubscribeFromPush,
  sendTestNotification
} from '@/app/lib/push-client'

export default function PushNotificationButton() {
  const [supported, setSupported] = useState(true)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    const s = isPushSupported()
    setSupported(s)
    if (s) {
      const p = getNotificationPermission()
      if (p) setPermission(p)
      isSubscribed().then(setSubscribed)
    }
  }, [])

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }

  const handleSubscribe = async () => {
    setLoading(true)
    const sub = await subscribeToPush()
    setLoading(false)

    if (sub) {
      setSubscribed(true)
      setPermission('granted')
      showMsg('success', '✅ Notifikasi aktif! Anda akan menerima reminder meeting.')
    } else {
      const p = getNotificationPermission()
      if (p === 'denied') {
        showMsg('error', 'Izin ditolak. Aktifkan manual di setting browser.')
      } else {
        showMsg('error', 'Gagal mengaktifkan notifikasi')
      }
    }
  }

  const handleUnsubscribe = async () => {
    if (!confirm('Nonaktifkan notifikasi? Anda tidak akan menerima reminder lagi.')) return
    setLoading(true)
    const ok = await unsubscribeFromPush()
    setLoading(false)

    if (ok) {
      setSubscribed(false)
      showMsg('success', '🔕 Notifikasi dinonaktifkan')
    } else {
      showMsg('error', 'Gagal menonaktifkan')
    }
  }

  const handleTest = async () => {
    setLoading(true)
    const ok = await sendTestNotification()
    setLoading(false)

    if (ok) {
      showMsg('success', '📨 Notif test terkirim! Cek HP/browser Anda dalam 5 detik.')
    } else {
      showMsg('error', 'Gagal kirim test — cek console')
    }
  }

  // ─── STATE: Tidak Support ────────────
  if (!supported) {
    return (
      <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="text-2xl">🚫</div>
          <div>
            <p className="text-sm font-black text-slate-700">Notifikasi Tidak Didukung</p>
            <p className="text-xs text-slate-500">
              Browser Anda tidak mendukung push notification. Gunakan Chrome/Firefox/Edge terbaru.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ─── STATE: Permission Denied ────────
  if (permission === 'denied') {
    return (
      <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">⚠️</div>
          <div className="flex-1">
            <p className="text-sm font-black text-amber-800">Izin Notifikasi Diblokir</p>
            <p className="text-xs text-amber-700 mt-1">
              Anda pernah menolak izin notifikasi. Aktifkan manual di pengaturan browser:
            </p>
            <p className="text-[11px] text-amber-600 mt-2 font-mono">
              🔒 Klik ikon gembok di URL → Site Settings → Notifications → Allow
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ─── STATE: Sudah Subscribe ──────────
  if (subscribed && permission === 'granted') {
    return (
      <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">🔔</div>
          <div className="flex-1">
            <p className="text-sm font-black text-green-800">Notifikasi Aktif</p>
            <p className="text-xs text-green-700 mt-0.5">
              Anda akan menerima reminder meeting H-1 dan notifikasi penting lainnya.
            </p>

            <div className="flex gap-2 mt-3 flex-wrap">
              <button
                onClick={handleTest}
                disabled={loading}
                className="px-3 py-1.5 bg-white text-green-700 border border-green-300 rounded-lg text-[11px] font-bold hover:bg-green-100 disabled:opacity-50">
                {loading ? '⏳' : '📨'} Test Kirim
              </button>
              <button
                onClick={handleUnsubscribe}
                disabled={loading}
                className="px-3 py-1.5 bg-white text-slate-600 border border-slate-300 rounded-lg text-[11px] font-bold hover:bg-slate-100 disabled:opacity-50">
                🔕 Nonaktifkan
              </button>
            </div>

            {msg && (
              <div className={`mt-2 text-[11px] font-bold ${msg.type === 'success' ? 'text-green-700' : 'text-red-600'}`}>
                {msg.text}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ─── STATE: Belum Subscribe ──────────
  return (
    <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <div className="text-2xl">🔔</div>
        <div className="flex-1">
          <p className="text-sm font-black text-blue-800">Aktifkan Notifikasi</p>
          <p className="text-xs text-blue-700 mt-0.5 mb-3">
            Dapatkan reminder meeting H-1 langsung di HP/browser Anda.
          </p>

          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full px-4 py-2.5 bg-[#003D79] text-white rounded-xl text-sm font-black hover:bg-[#002a57] disabled:opacity-50 transition-all shadow-sm">
            {loading ? '⏳ Mengaktifkan...' : '🔔 Aktifkan Notifikasi'}
          </button>

          {msg && (
            <div className={`mt-2 text-[11px] font-bold ${msg.type === 'success' ? 'text-green-700' : 'text-red-600'}`}>
              {msg.text}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}