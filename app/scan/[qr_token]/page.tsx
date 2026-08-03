'use client'

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC SCAN PAGE v1.0
// Halaman yang muncul saat user scan QR (baik pakai app maupun Google Lens)
// - QR Lokasi → tampil list event aktif hari ini → pilih → TTD
// - QR Event → langsung ke TTD
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
  const router = useRouter()
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
        // Auto-select kalau qr_event atau cuma 1 event aktif
        if (data.mode === 'qr_event' && data.event) {
          setSelectedEventId(data.event.id)
        } else if (data.mode === 'qr_location' && data.events?.length === 1) {
          setSelectedEventId(data.events[0].id)
        }
      })
      .catch(() => setInfo({ success: false, error: 'Gagal memuat data' }))
      .finally(() => setLoading(false))
  }, [qrToken])

  // ─── LOADING ───────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#003D79] to-[#0056b3] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-2xl text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-[#003D79] mb-3"></div>
          <p className="text-sm font-bold text-slate-600">Memuat info event...</p>
        </div>
      </div>
    )
  }

  // ─── ERROR ─────────────────────────────────────────
  if (!info || !info.success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center p-4">
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
      <div className="min-h-screen bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center p-4">
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
          <button onClick={() => window.location.reload()}
            className="w-full px-4 py-3 bg-[#003D79] text-white rounded-xl text-sm font-bold hover:bg-[#002a57]">
            🔄 Scan Lagi (Peserta Lain)
          </button>
        </div>
      </div>
    )
  }

  // ─── PILIH EVENT (mode qr_location) ────────────────
  if (info.mode === 'qr_location' && !selectedEventId) {
    if (!info.events?.length) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 shadow-2xl text-center max-w-md w-full">
            <div className="text-6xl mb-4">📭</div>
            <h1 className="text-lg font-black text-amber-700 mb-2">Tidak Ada Event Hari Ini</h1>
            <p className="text-sm text-slate-600 mb-4">
              QR ini terpasang di <strong>{info.qr_location?.nama_lokasi}</strong>, 
              namun belum ada event yang dijadwalkan hari ini.
            </p>
            <p className="text-xs text-slate-500">Hubungi admin/SHE/PJO untuk membuat event.</p>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-[#003D79] to-[#0056b3] p-4 pb-20">
        <div className="max-w-md mx-auto pt-4">
          <div className="bg-white rounded-2xl p-6 shadow-2xl">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">📍</div>
              <h1 className="text-lg font-black text-[#003D79]">{info.qr_location?.nama_lokasi}</h1>
              <p className="text-xs text-slate-500">Pilih acara yang Anda hadiri:</p>
            </div>

            <div className="space-y-2">
              {info.events.map((ev: any) => (
                <button key={ev.id}
                  onClick={() => !ev.already_scanned && setSelectedEventId(ev.id)}
                  disabled={ev.already_scanned}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all
                    ${ev.already_scanned
                      ? 'bg-green-50 border-green-300 cursor-not-allowed'
                      : 'bg-white border-slate-100 hover:border-blue-500 hover:bg-blue-50'
                    }`}>
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex-1">
                      <h3 className="font-black text-sm text-slate-800">{ev.nama_event}</h3>
                      {ev.deskripsi && <p className="text-[11px] text-slate-500 mt-0.5">{ev.deskripsi}</p>}
                    </div>
                    {ev.already_scanned && (
                      <span className="px-2 py-0.5 bg-green-200 text-green-800 rounded-full text-[10px] font-black">
                        ✅ HADIR
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-2">
                    <span>⏰ {ev.jam_mulai || '-'} – {ev.jam_selesai || '-'}</span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold">{ev.tipe}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── FORM TTD & SUBMIT ─────────────────────────────
  const selectedEvent = info.mode === 'qr_event'
    ? info.event
    : info.events?.find((e: any) => e.id === selectedEventId)

  if (!selectedEvent) return null

  // Kalau internal & sudah scan
  if (info.mode === 'qr_event' && info.already_scanned) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-2xl text-center max-w-md w-full">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-lg font-black text-blue-700 mb-2">Anda Sudah Hadir!</h1>
          <p className="text-sm text-slate-600">
            Anda sudah tercatat hadir di event <strong>{selectedEvent.nama_event}</strong>
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
      showBack={info.mode === 'qr_location' && (info.events?.length || 0) > 1}
      onSuccess={setSuccess}
    />
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// FORM SCAN (TTD + Data)
// ═══════════════════════════════════════════════════════════════════════════
function ScanForm({
  event, isLoggedIn, user, lastSignature, perusahaan, qrToken, onBack, showBack, onSuccess
}: any) {
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

  // Set default perusahaan
  useEffect(() => {
    if (isLoggedIn) {
      // Internal → default PT. Boston
      const boston = perusahaan.find((p: any) => p.nama_perusahaan.toLowerCase().includes('boston'))
      if (boston) setForm((f) => ({ ...f, perusahaan_id: boston.id }))
    } else {
      // Tamu → default PT. Putra Perkasa
      const ppa = perusahaan.find((p: any) => p.nama_perusahaan.toLowerCase().includes('putra'))
      if (ppa) setForm((f) => ({ ...f, perusahaan_id: ppa.id }))
    }
  }, [isLoggedIn, perusahaan])

  const handleClearSig = () => {
    sigRef.current?.clear()
    setSignature(null)
  }

  const handleReuseSig = () => {
    if (lastSignature) {
      setSignature(lastSignature)
    }
  }

  const handleSigEnd = () => {
    if (sigRef.current && !sigRef.current.isEmpty()) {
      setSignature(sigRef.current.toDataURL('image/png'))
    }
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    setMsg('')

    // Validate
    if (!isLoggedIn && !form.nama.trim()) {
      setMsg('Nama wajib diisi')
      return
    }
    if (!isLoggedIn && !form.jabatan.trim()) {
      setMsg('Jabatan wajib diisi')
      return
    }
    if (!isLoggedIn && !form.perusahaan_id && !form.perusahaan_nama.trim()) {
      setMsg('Perusahaan wajib dipilih')
      return
    }
    if (!signature) {
      setMsg('Tanda tangan wajib diisi')
      return
    }

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
        // Internal boleh update perusahaan juga
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
        {showBack && (
          <button onClick={onBack}
            className="text-blue-200 text-xs font-bold mb-2 hover:text-white">
            ← Pilih Acara Lain
          </button>
        )}

        <div className="bg-white rounded-2xl p-5 shadow-2xl">
          {/* EVENT INFO */}
          <div className="text-center mb-4 pb-4 border-b">
            <div className="text-3xl mb-2">📋</div>
            <h1 className="text-base font-black text-[#003D79] mb-1">{event.nama_event}</h1>
            <p className="text-[11px] text-slate-500">
              📅 {fmtDate(event.tanggal)} • ⏰ {event.jam_mulai || '-'} – {event.jam_selesai || '-'}
            </p>
          </div>

          {/* USER MODE INDICATOR */}
          {isLoggedIn ? (
            <div className="bg-blue-50 border-2 border-blue-100 rounded-xl p-3 mb-3">
              <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wide mb-1">👤 Anda Login Sebagai</p>
              <p className="text-sm font-black text-slate-800">{user?.nama}</p>
              <p className="text-[11px] text-slate-500">{user?.jabatan} • {user?.site}</p>
            </div>
          ) : (
            <div className="bg-purple-50 border-2 border-purple-100 rounded-xl p-3 mb-3">
              <p className="text-[10px] font-bold text-purple-700 uppercase tracking-wide">👋 Anda Sebagai Tamu</p>
              <p className="text-[11px] text-slate-600 mt-1">Silakan isi data Anda di bawah ini</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* TAMU FIELDS */}
            {!isLoggedIn && (
              <>
                <FormInput label="Nama Lengkap *" value={form.nama}
                  onChange={(v: string) => setForm({ ...form, nama: v })} required />
                <FormInput label="Jabatan *" value={form.jabatan}
                  onChange={(v: string) => setForm({ ...form, jabatan: v })} placeholder="Contoh: Supervisor" required />
              </>
            )}

            {/* PERUSAHAAN */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Perusahaan *</label>
              {!showCustomPerusahaan ? (
                <>
                  <select value={form.perusahaan_id}
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
                </>
              ) : (
                <div className="flex gap-1">
                  <input type="text" value={form.perusahaan_nama}
                    onChange={(e) => setForm({ ...form, perusahaan_nama: e.target.value })}
                    placeholder="Ketik nama perusahaan..."
                    className="flex-1 border-2 border-slate-100 rounded-xl px-3 py-2.5 text-sm focus:border-blue-500 outline-none" />
                  <button type="button" onClick={() => { setShowCustomPerusahaan(false); setForm({ ...form, perusahaan_nama: '' }) }}
                    className="px-3 py-2 bg-slate-100 rounded-xl text-xs font-bold">↩️</button>
                </div>
              )}
            </div>

            {/* NO HP (opsional) */}
            <FormInput label="No HP (opsional)" value={form.no_hp} type="tel"
              onChange={(v: string) => setForm({ ...form, no_hp: v })} placeholder="08xxx..." />

            {/* TANDA TANGAN */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">✍️ Tanda Tangan *</label>

              {signature && !sigRef.current?.isEmpty?.() === false ? (
                <div className="border-2 border-slate-100 rounded-xl p-2 bg-white">
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

            {/* ERROR MSG */}
            {msg && (
              <div className="bg-red-50 border-2 border-red-100 text-red-700 text-xs font-bold p-3 rounded-xl">
                ⚠️ {msg}
              </div>
            )}

            {/* SUBMIT */}
            <button type="submit" disabled={submitting}
              className="w-full px-4 py-3 bg-[#003D79] text-white rounded-xl text-sm font-black hover:bg-[#002a57] shadow-lg disabled:opacity-50 transition-all">
              {submitting ? '⏳ Menyimpan...' : '✅ KONFIRMASI HADIR'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────
function FormInput({ label, value, onChange, type = 'text', placeholder = '', required = false }: any) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-600 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} required={required}
        className="w-full border-2 border-slate-100 rounded-xl px-3 py-2.5 text-sm focus:border-blue-500 outline-none" />
    </div>
  )
}

function fmtDate(iso: string): string {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return iso }
}

function fmtDateTime(iso: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar'
    })
  } catch { return iso }
}