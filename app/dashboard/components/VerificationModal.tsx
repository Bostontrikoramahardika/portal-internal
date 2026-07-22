'use client'

import { useCallback, useEffect, useState } from 'react'

type Status = {
  need_verify: boolean
  email_missing: boolean
  nohp_missing: boolean
  skip_count: number
  can_skip: boolean
  remaining_skip: number
  current_email: string | null
  current_no_hp: string | null
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('btm_session_token_v1')
    if (token) headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

export default function VerificationModal() {
  const [status, setStatus] = useState<Status | null>(null)
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [noHp, setNoHp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/user/verification-status', {
        headers: getAuthHeaders(),
        cache: 'no-store',
      })
      if (!res.ok) return
      const data = await res.json()
      setStatus(data)
      setOpen(data.need_verify === true)
      if (data.current_email) setEmail(data.current_email)
      if (data.current_no_hp) setNoHp(data.current_no_hp)
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!status) return

    // Validasi lokal
    if (status.email_missing && !email.trim()) {
      setError('Email wajib diisi')
      return
    }
    if (status.nohp_missing && !noHp.trim()) {
      setError('No HP wajib diisi')
      return
    }

    setLoading(true)
    try {
      const payload: Record<string, string> = {}
      if (status.email_missing) payload.email = email.trim()
      if (status.nohp_missing) payload.no_hp = noHp.trim()

      const res = await fetch('/api/user/verify-contact', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (res.ok) {
        setOpen(false)
        // Refresh status
        await fetchStatus()
        // Optional: reload untuk apply data baru
        setTimeout(() => window.location.reload(), 500)
      } else {
        setError(data.error || 'Gagal simpan data')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal simpan data')
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = async () => {
    if (!status?.can_skip) return

    setLoading(true)
    try {
      const res = await fetch('/api/user/skip-verification', {
        method: 'POST',
        headers: getAuthHeaders(),
      })
      const data = await res.json()

      if (res.ok) {
        setOpen(false)
      } else {
        setError(data.error || 'Gagal skip')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal skip')
    } finally {
      setLoading(false)
    }
  }

  if (!open || !status) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden">
        {/* HEADER */}
        <div className="bg-gradient-to-br from-[#003D79] to-[#005a9c] px-6 py-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl">
              📧
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest opacity-80">
                Lengkapi Data
              </div>
              <h2 className="text-xl font-black tracking-tight">
                Kontak Anda
              </h2>
            </div>
          </div>
          <p className="text-xs text-white/80 leading-relaxed">
            Email & No HP dibutuhkan untuk notifikasi absensi, cuti, approval, dll.
          </p>
        </div>

        {/* BODY */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {status.email_missing && (
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-slate-600 mb-2">
                📧 Email <span className="text-rose-600">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contoh@email.com"
                className="w-full px-4 py-3 rounded-[1.2rem] border-2 border-slate-200 focus:border-[#003D79] outline-none font-bold text-sm"
                required
                autoFocus
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Pastikan email aktif — notifikasi akan dikirim ke sini
              </p>
            </div>
          )}

          {status.nohp_missing && (
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-slate-600 mb-2">
                📱 No HP <span className="text-rose-600">*</span>
              </label>
              <input
                type="tel"
                value={noHp}
                onChange={(e) => setNoHp(e.target.value)}
                placeholder="08123456789"
                className="w-full px-4 py-3 rounded-[1.2rem] border-2 border-slate-200 focus:border-[#003D79] outline-none font-bold text-sm"
                required
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Format: 08xxx / +628xxx / 628xxx
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border-2 border-rose-200 rounded-[1.2rem] text-xs text-rose-700 font-bold">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#003D79] text-white rounded-[1.2rem] font-black uppercase tracking-widest text-xs shadow-lg disabled:opacity-50"
          >
            {loading ? '⏳ Menyimpan...' : '💾 Simpan Data'}
          </button>

          {status.can_skip ? (
            <button
              type="button"
              onClick={handleSkip}
              disabled={loading}
              className="w-full py-2.5 text-slate-500 text-xs font-bold hover:text-slate-700 disabled:opacity-50"
            >
              Nanti Saja ({status.remaining_skip}x kesempatan tersisa)
            </button>
          ) : (
            <div className="text-center p-3 bg-amber-50 border border-amber-200 rounded-[1.2rem]">
              <p className="text-[11px] font-bold text-amber-700">
                🔒 Anda sudah mencapai batas maksimal skip.
                <br />
                Wajib mengisi data untuk melanjutkan.
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}