'use client';

import PageHeader from "@/app/components/PageHeader";
import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import SignatureCanvas from 'react-signature-canvas'

type ScanInfo = {
  success: boolean
  mode?: 'qr_location' | 'qr_event'
  qr_location?: any
  events?: any[]
  event?: any
  is_logged_in?: boolean
  user?: any
  last_signature?: string | null
  already_scanned?: boolean
  perusahaan?: any[]
  error?: string
}

export default function ScanPage() {
  const params = useParams()
  const qrToken = params?.qr_token as string

  const [info, setInfo] = useState<ScanInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [success, setSuccess] = useState<any>(null)

  useEffect(() => {
    fetch(`/api/scan/${qrToken}`)
      .then((r) => r.json())
      .then((data) => {
        setInfo(data)
        // qr_event → langsung set event, tidak perlu pilih
        if (data.mode === 'qr_event' && data.event) {
          setSelectedEventId(data.event.id)
        }
        // qr_location → SELALU tampil list dulu, walau 1 item
        // (tidak auto-select, biar peserta sadar milih)
      })
      .catch(() => setInfo({ success: false, error: 'Gagal memuat data' }))
      .finally(() => setLoading(false))
  }, [qrToken])

  // ─── LOADING ───────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen pb-24 sm:pb-8  bg-gradient-to-br from-[#003D79] to-[#0056b3] flex items-center justify-center p-4">
      <PageHeader title="[qr_token]" backUrl="/dashboard" />

        <div className="bg-white rounded-2xl p-8 shadow-2xl text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-[#003D79] mb-3"></div>
          <p className="text-sm font-bold text-slate-600">Memuat info meeting...</p>
        </div>
      </div>
    )
  }

  // ─── ERROR ─────────────────────────────────────────
  if (!info || !info.success) {
    return (
      <div className="min-h-screen pb-24 sm:pb-8  bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-2xl text-center max-w-md w-full">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-lg font-black text-red-700 mb-2">QR Tidak Valid</h1>
          <p className="text-sm text-slate-600">{info?.error || 'QR Code tidak dikenali'}</p>
        </div>
      </div>
    )
  }

  // ─── SUCCESS SCREEN ────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen pb-24 sm:pb-8  bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-2xl text-center max-w-md w-full">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-xl font-black text-green-700 mb-2">Kehadiran Tercatat!</h1>
          <p className="text-sm text-slate-600 mb-6">{success.message}</p>
          <div className="bg-slate-50 rounded-xl p-4 mb-4 text-left">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-slate-500 font-bold">👤 Nama</div>
              <div className="text-slate-800 font-black">{success.data?.nama}</div>
              <div className="text-slate-500 font-bold">🕐 Waktu</div>
              <div className="text-slate-800 font-black">{fmtDateTime(success.data?.scan_at)}</div>
            </div>
          </div>
          <button
            onClick={() => {
              setSuccess(null)
              setSelectedEventId('')
            }}
            className="w-full px-4 py-3 bg-[#003D79] text-white rounded-xl text-sm font-bold hover:bg-[#003d79]">
            🔄 Scan Lagi (Peserta Lain)
          </button>
        </div>
      </div>
    )
  }

  // ─── PILIH MEETING (mode qr_location) ──────────────
  if (info.mode === 'qr_location' && !selectedEventId) {

    // Tidak ada meeting hari ini
    if (!info.events?.length) {
      return (
        <div className="min-h-screen pb-24 sm:pb-8  bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 shadow-2xl text-center max-w-md w-full">
            <div className="text-6xl mb-4">📭</div>
            <h1 className="text-lg font-black text-amber-700 mb-2">Tidak Ada Meeting Hari Ini</h1>
            <p className="text-sm text-slate-600 mb-2">
              Belum ada meeting yang dijadwalkan hari ini
              {info.qr_location?.site ? ` di site ${info.qr_location.site}` : ''}.
            </p>
            <p className="text-xs text-[#5a6a7e]">Hubungi admin untuk informasi lebih lanjut.</p>
          </div>
        </div>
      )
    }

    // Ada 1 atau lebih meeting → tampil list (selalu)
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#003D79] to-[#0056b3] p-4 pb-20">
        <div className="max-w-md mx-auto pt-6">

          {/* HEADER */}
          <div className="text-center mb-4">
            <div className="text-4xl mb-2">📋</div>
            <h1 className="text-white text-lg font-black">Meeting Hari Ini</h1>
            <p className="text-blue-200 text-xs mt-1">
              {info.qr_location?.site || 'Site'} • {fmtDateToday()}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-2xl">
            <p className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wide">
              Pilih meeting yang sedang Anda hadiri:
            </p>

            <div className="space-y-3">
              {info.events!.map((ev: any) => (
                <button
                  key={ev.id}
                  onClick={() => !ev.already_scanned && setSelectedEventId(ev.id)}
                  disabled={ev.already_scanned}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all
                    ${ev.already_scanned
                      ? 'bg-green-50 border-green-200 cursor-not-allowed opacity-80'
                      : 'bg-white border-slate-200 hover:border-[#003D79] hover:bg-blue-50 active:scale-[0.98]'
                    }`}>

                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-sm text-slate-800 leading-tight">
                        {ev.nama_event}
                      </h3>
                      {ev.deskripsi && (
                        <p className="text-[11px] text-[#5a6a7e] mt-0.5 truncate">{ev.deskripsi}</p>
                      )}
                    </div>
                    {ev.already_scanned
                      ? <span className="shrink-0 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-black">✅ Hadir</span>
                      : <span className="shrink-0 text-[#5a6a7e] text-lg">›</span>
                    }
                  </div>

                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-[11px] text-slate-500">
                      ⏰ {ev.jam_mulai || '?'} – {ev.jam_selesai || '?'}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold
                      ${ev.status === 'AKTIF'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-blue-100 text-blue-700'
                      }`}>
                      {ev.status}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                      {ev.tipe}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Info user login */}
            {info.is_logged_in && (
              <div className="mt-4 pt-3 border-t border-slate-100">
                <p className="text-[10px] text-[#5a6a7e] text-center">
                  Login sebagai <strong className="text-slate-600">{info.user?.nama}</strong>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ─── FORM TTD ──────────────────────────────────────
  const selectedEvent = info.mode === 'qr_event'
    ? info.event
    : info.events?.find((e: any) => e.id === selectedEventId)

  if (!selectedEvent) return null

  // Internal sudah scan (qr_event mode)
  if (info.mode === 'qr_event' && info.already_scanned) {
    return (
      <div className="min-h-screen pb-24 sm:pb-8  bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-2xl text-center max-w-md w-full">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-lg font-black text-blue-700 mb-2">Anda Sudah Hadir!</h1>
          <p className="text-sm text-slate-600">
            Anda sudah tercatat hadir di <strong>{selectedEvent.nama_event}</strong>
          </p>
        </div>
      </div>
    )
  }

  return (
    <ScanForm
      event={selectedEvent}
      isLoggedIn={!!info.is_logged_in}
      user={info.user}
      lastSignature={info.last_signature}
      perusahaan={info.perusahaan || []}
      qrToken={qrToken}
      onBack={() => setSelectedEventId('')}
      showBack={info.mode === 'qr_location'}
      onSuccess={setSuccess}
    />
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// FORM TTD
// ═══════════════════════════════════════════════════════════════════════════
function ScanForm({ event, isLoggedIn, user, lastSignature, perusahaan, qrToken, onBack, showBack, onSuccess }: any) {
  const sigRef = useRef<any>(null)
  const [form, setForm] = useState({
    nama: user?.nama || '',
    jabatan: user?.jabatan || '',
    perusahaan_id: '',
    perusahaan_nama: '',
    no_hp: ''
  })
  const [signature, setSignature] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState('')
  const [showCustomPerusahaan, setShowCustomPerusahaan] = useState(false)

  useEffect(() => {
    if (isLoggedIn) {
      const boston = perusahaan.find((p: any) => p.nama_perusahaan.toLowerCase().includes('boston'))
      if (boston) setForm((f) => ({ ...f, perusahaan_id: boston.id }))
    } else {
      const ppa = perusahaan.find((p: any) => p.nama_perusahaan.toLowerCase().includes('putra'))
      if (ppa) setForm((f) => ({ ...f, perusahaan_id: ppa.id }))
    }
  }, [isLoggedIn, perusahaan])

  const handleClearSig = () => {
    sigRef.current?.clear()
    setSignature(null)
  }

  const handleReuseSig = () => {
    if (lastSignature) setSignature(lastSignature)
  }

  const handleSigEnd = () => {
    if (sigRef.current && !sigRef.current.isEmpty()) {
      setSignature(sigRef.current.toDataURL('image/png'))
    }
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    setMsg('')

    if (!isLoggedIn && !form.nama.trim()) return setMsg('Nama wajib diisi')
    if (!isLoggedIn && !form.jabatan.trim()) return setMsg('Jabatan wajib diisi')
    if (!isLoggedIn && !form.perusahaan_id && !form.perusahaan_nama.trim()) return setMsg('Perusahaan wajib dipilih')
    if (!signature) return setMsg('Tanda tangan wajib diisi')

    setSubmitting(true)
    try {
      const payload: any = {
        event_id: event.id,
        signature,
        no_hp: form.no_hp || undefined
      }

      if (!isLoggedIn) {
        payload.nama = form.nama.trim()
        payload.jabatan = form.jabatan.trim()
        if (form.perusahaan_id) {
          payload.perusahaan_id = form.perusahaan_id
        } else {
          payload.perusahaan_nama = form.perusahaan_nama.trim()
        }
      } else {
        if (form.perusahaan_id) payload.perusahaan_id = form.perusahaan_id
      }

      const res = await fetch(`/api/scan/${qrToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onSuccess(data)
    } catch (err: any) {
      setMsg(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#003D79] to-[#0056b3] p-4 pb-20">
      <div className="max-w-md mx-auto pt-4">

        {/* TOMBOL BACK ke pilih meeting */}
        {showBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-blue-200 text-xs font-bold mb-3 hover:text-white transition-colors">
            ← Pilih Meeting Lain
          </button>
        )}

        <div className="bg-white rounded-2xl p-5 shadow-2xl">
          {/* EVENT INFO */}
          <div className="text-center mb-4 pb-4 border-b border-slate-100">
            <div className="text-3xl mb-2">📋</div>
            <h1 className="text-base font-black text-[#003D79] mb-1 leading-tight">{event.nama_event}</h1>
            <p className="text-[11px] text-slate-500">
              📅 {fmtDate(event.tanggal)} • ⏰ {event.jam_mulai || '-'} – {event.jam_selesai || '-'}
            </p>
          </div>

          {/* USER MODE */}
          {isLoggedIn ? (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-3">
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide mb-1">👤 Login sebagai</p>
              <p className="text-sm font-black text-slate-800">{user?.nama}</p>
              <p className="text-[11px] text-slate-500">{user?.jabatan} • {user?.site}</p>
            </div>
          ) : (
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 mb-3">
              <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wide">👋 Tamu</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Silakan isi data Anda</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* TAMU FIELDS */}
            {!isLoggedIn && (
              <>
                <FormInput label="Nama Lengkap *" value={form.nama}
                  onChange={(v: string) => setForm({ ...form, nama: v })} required />
                <FormInput label="Jabatan *" value={form.jabatan}
                  onChange={(v: string) => setForm({ ...form, jabatan: v })}
                  placeholder="Contoh: Supervisor" required />
              </>
            )}

            {/* PERUSAHAAN */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Perusahaan *</label>
              {!showCustomPerusahaan ? (
                <select
                  value={form.perusahaan_id}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      setShowCustomPerusahaan(true)
                      setForm({ ...form, perusahaan_id: '' })
                    } else {
                      setForm({ ...form, perusahaan_id: e.target.value })
                    }
                  }}
                  className="w-full border-2 border-slate-100 rounded-xl px-3 py-2.5 text-sm focus:border-blue-500 outline-none">
                  <option value="">-- Pilih Perusahaan --</option>
                  {perusahaan.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.nama_perusahaan}</option>
                  ))}
                  <option value="__custom__">➕ Perusahaan Lain (ketik manual)</option>
                </select>
              ) : (
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={form.perusahaan_nama}
                    onChange={(e) => setForm({ ...form, perusahaan_nama: e.target.value })}
                    placeholder="Ketik nama perusahaan..."
                    className="flex-1 border-2 border-slate-100 rounded-xl px-3 py-2.5 text-sm focus:border-blue-500 outline-none" />
                  <button
                    type="button"
                    onClick={() => { setShowCustomPerusahaan(false); setForm({ ...form, perusahaan_nama: '' }) }}
                    className="px-3 py-2 bg-slate-100 rounded-xl text-xs font-bold hover:bg-slate-200">
                    ↩️
                  </button>
                </div>
              )}
            </div>

            {/* NO HP */}
            <FormInput label="No HP (opsional)" value={form.no_hp} type="tel"
              onChange={(v: string) => setForm({ ...form, no_hp: v })} placeholder="08xxx..." />

            {/* TTD */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">✍️ Tanda Tangan *</label>

              {/* Kalau pakai TTD lama (gambar) */}
              {signature && sigRef.current?.isEmpty?.() !== false ? (
                <div className="border-2 border-slate-100 rounded-xl p-2 bg-slate-50">
                  <img src={signature} alt="TTD" className="w-full h-32 object-contain" />
                </div>
              ) : (
                <div className="border-2 border-slate-100 rounded-xl bg-white overflow-hidden">
                  <SignatureCanvas
                    ref={sigRef}
                    penColor="#003D79"
                    canvasProps={{
                      className: 'w-full h-32',
                      style: { touchAction: 'none' }
                    }}
                    onEnd={handleSigEnd}
                  />
                </div>
              )}

              <div className="flex gap-2 mt-2">
                <button type="button" onClick={handleClearSig}
                  className="flex-1 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-[11px] font-bold hover:bg-slate-200">
                  🗑️ Hapus & TTD Ulang
                </button>
                {isLoggedIn && lastSignature && (
                  <button type="button" onClick={handleReuseSig}
                    className="flex-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-[11px] font-bold hover:bg-blue-200">
                    🔄 Pakai TTD Sebelumnya
                  </button>
                )}
              </div>
            </div>

            {/* ERROR */}
            {msg && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold p-3 rounded-xl">
                ⚠️ {msg}
              </div>
            )}

            {/* SUBMIT */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full px-4 py-3 bg-[#003D79] text-white rounded-xl text-sm font-black hover:bg-[#003d79] shadow-lg disabled:opacity-50 transition-all active:scale-[0.98]">
              {submitting ? '⏳ Menyimpan...' : '✅ KONFIRMASI HADIR'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── HELPERS ───────────────────────────────────────
function FormInput({ label, value, onChange, type = 'text', placeholder = '', required = false }: any) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full border-2 border-slate-100 rounded-xl px-3 py-2.5 text-sm focus:border-blue-500 outline-none" />
    
      {/* Standard App Footer */}
      <footer className="mt-8 mb-20 sm:mb-6 text-center text-xs text-[#8896a7] italic opacity-60">
        <p>BTM Mobile APP V1.7.0</p>
        <p className="text-[10px]">Powered By rck_Production</p>
      </footer>
</div>
  )
}

function fmtDate(iso: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric'
    })
  } catch { return iso }
}

function fmtDateToday(): string {
  return new Date().toLocaleDateString('id-ID', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    timeZone: 'Asia/Makassar'
  })
}

function fmtDateTime(iso: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
      timeZone: 'Asia/Makassar'
    })
  } catch { return iso }
}