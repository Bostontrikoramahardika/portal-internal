'use client'

// ═══════════════════════════════════════════════════════════════════════════
// GOOGLE INTEGRATION CARD
// Card connect/disconnect Google — pasang di halaman Data Saya
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'

type Status = {
  connected: boolean
  google_email: string | null
  connected_at: string | null
  access_enabled: boolean       // ═══ BARU
}

export default function GoogleIntegrationCard() {
  const [status, setStatus] = useState<Status | null>(null)
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  // Fetch status
  const fetchStatus = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/google/status')
      const data = await res.json()
      setStatus(data)
    } catch {
      setStatus({ connected: false, google_email: null, connected_at: null, access_enabled: false })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()

    // Cek query param dari callback
    const params = new URLSearchParams(window.location.search)
    if (params.get('google_success')) {
      setAlert({ type: 'success', msg: '✅ Akun Google berhasil terhubung!' })
      window.history.replaceState({}, '', window.location.pathname + '?menu=data_saya')
    } else if (params.get('google_error')) {
      const err = params.get('google_error')
      let msg = 'Gagal menghubungkan akun Google'
      if (err === 'cancelled') msg = 'Kamu membatalkan otorisasi Google'
      if (err === 'not_allowed') msg = 'Akses Google belum diizinkan oleh admin. Silakan hubungi HR/Admin.'
      if (err === 'no_refresh_token') {
        msg = 'Silakan buka myaccount.google.com/permissions → hapus izin BTM Portal → coba lagi'
      }
      setAlert({ type: 'error', msg: '❌ ' + msg })
      window.history.replaceState({}, '', window.location.pathname + '?menu=data_saya')
    }
  }, [])

  const handleConnect = () => {
    window.location.href = '/api/auth/google/connect'
  }

  const handleDisconnect = async () => {
    if (!confirm('Yakin ingin memutuskan koneksi akun Google?\n\nSemua fitur task/reminder yang tersinkron akan berhenti.')) return

    setDisconnecting(true)
    try {
      const res = await fetch('/api/auth/google/disconnect', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAlert({ type: 'success', msg: '✅ Akun Google terputus' })
      fetchStatus()
    } catch (err: any) {
      setAlert({ type: 'error', msg: '❌ ' + err.message })
    } finally {
      setDisconnecting(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border shadow-sm p-4">
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-200 rounded-xl"></div>
          <div className="flex-1">
            <div className="h-4 bg-slate-200 rounded w-1/3 mb-2"></div>
            <div className="h-3 bg-slate-100 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
      {/* Alert */}
      {alert && (
        <div className={`px-4 py-2.5 text-xs font-bold flex items-center justify-between ${
          alert.type === 'success' ? 'bg-green-50 text-green-700 border-b border-green-100' : 'bg-red-50 text-red-700 border-b border-red-100'
        }`}>
          <span>{alert.msg}</span>
          <button onClick={() => setAlert(null)} className="text-lg leading-none opacity-60 hover:opacity-100">×</button>
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 via-red-500 to-yellow-500 flex items-center justify-center text-white text-xl font-black shadow-md">
            G
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-slate-800 text-sm">Integrasi Google</h3>
            <p className="text-[11px] text-slate-500">
              Sinkronkan task & reminder ke Google Calendar dan Tasks
            </p>
          </div>
        </div>

        {status?.connected ? (
          // ═══ CONNECTED STATE ═══
          <div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-green-600 text-lg">✓</span>
                <span className="text-xs font-black text-green-700">Terhubung</span>
              </div>
              <p className="text-xs text-slate-700 font-semibold truncate">{status.google_email}</p>
              {status.connected_at && (
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Sejak: {new Date(status.connected_at).toLocaleDateString('id-ID', {
                    day: '2-digit', month: 'short', year: 'numeric'
                  })}
                </p>
              )}
            </div>

            {/* Feature list */}
            <div className="space-y-1.5 mb-3">
              <div className="flex items-center gap-2 text-[11px] text-slate-600">
                <span className="text-green-500">✓</span>
                <span>Event otomatis masuk Google Calendar</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-600">
                <span className="text-green-500">✓</span>
                <span>Action item MoM masuk Google Tasks</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-600">
                <span className="text-green-500">✓</span>
                <span>Email reminder untuk deadline task</span>
              </div>
            </div>

            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="w-full py-2.5 bg-red-50 text-red-600 border-2 border-red-200 rounded-xl text-xs font-black hover:bg-red-100 transition-all disabled:opacity-50"
            >
              {disconnecting ? '⏳ Memutus...' : '🔌 Putuskan Koneksi'}
            </button>
          </div>
        ) : status?.access_enabled ? (
          // ═══ NOT CONNECTED — TAPI DIIZINKAN ═══
          <div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Hubungkan akun Google Anda untuk:
              </p>
              <ul className="mt-2 space-y-1 text-[11px] text-slate-600">
                <li className="flex items-center gap-2">
                  <span>📅</span>
                  <span>Event otomatis masuk Google Calendar</span>
                </li>
                <li className="flex items-center gap-2">
                  <span>✅</span>
                  <span>Action item MoM masuk Google Tasks</span>
                </li>
                <li className="flex items-center gap-2">
                  <span>📧</span>
                  <span>Email reminder untuk deadline</span>
                </li>
              </ul>
            </div>

            <button
              onClick={handleConnect}
              className="w-full py-3 bg-white border-2 border-slate-200 rounded-xl text-sm font-black text-slate-700 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <span className="text-lg">🔗</span>
              <span>Hubungkan Akun Google</span>
            </button>

            <p className="text-[10px] text-slate-400 text-center mt-2">
              Anda akan diarahkan ke Google untuk otorisasi
            </p>
          </div>
        ) : (
          // ═══ NOT CONNECTED — TIDAK DIIZINKAN ═══
          <div>
            <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 mb-3">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🔒</span>
                <div className="flex-1">
                  <h4 className="text-xs font-black text-amber-800 uppercase tracking-wide mb-1">
                    Akses Belum Diizinkan
                  </h4>
                  <p className="text-[11px] text-amber-700 leading-relaxed">
                    Integrasi Google belum tersedia untuk akun Anda. 
                    Silakan hubungi <strong>HR / Admin</strong> untuk mengaktifkan fitur ini.
                  </p>
                </div>
              </div>
            </div>

            <button
              disabled
              className="w-full py-3 bg-slate-100 border-2 border-slate-200 rounded-xl text-sm font-black text-slate-400 cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span className="text-lg opacity-50">🔒</span>
              <span>Belum Diizinkan</span>
            </button>

            <p className="text-[10px] text-slate-400 text-center mt-2">
              Hubungi admin untuk info lebih lanjut
            </p>
          </div>
        )}
      </div>
    </div>
  )
}