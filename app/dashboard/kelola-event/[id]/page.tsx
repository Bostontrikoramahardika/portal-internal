'use client'

// ═══════════════════════════════════════════════════════════════════════════
// DETAIL EVENT v1.0
// Halaman detail event: info + list peserta + TTD viewer
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function DetailEventPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params?.id as string

  const [event, setEvent] = useState<any>(null)
  const [attendances, setAttendances] = useState<any[]>([])
  const [totalHadir, setTotalHadir] = useState(0)
  const [totalInternal, setTotalInternal] = useState(0)
  const [totalTamu, setTotalTamu] = useState(0)
  const [loading, setLoading] = useState(true)
  const [ttdModal, setTtdModal] = useState<any>(null)
  const [qrModal, setQrModal] = useState(false)
  const [search, setSearch] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/events/${eventId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setEvent(data.event)
      setAttendances(data.attendances || [])
      setTotalHadir(data.total_hadir || 0)
      setTotalInternal(data.total_internal || 0)
      setTotalTamu(data.total_tamu || 0)
    } catch (err: any) {
      alert('❌ ' + err.message)
      router.push('/dashboard/kelola-event')
    } finally {
      setLoading(false)
    }
  }, [eventId, router])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = attendances.filter((a) => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      a.nama?.toLowerCase().includes(s) ||
      a.nrp?.toLowerCase().includes(s) ||
      a.perusahaan?.toLowerCase().includes(s)
    )
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f7fa] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[#003D79] mb-2"></div>
          <p className="text-sm font-semibold text-slate-500">Memuat detail event...</p>
        </div>
      </div>
    )
  }

  if (!event) return null

  const tipeEmoji: Record<string, string> = { MEETING: '🤝', TRAINING: '📚', ACARA: '🎉', SAFETY: '🦺' }

  return (
    <div className="min-h-screen bg-[#f4f7fa] pb-24">
      {/* HEADER */}
      <div className="bg-gradient-to-br from-[#003D79] to-[#0056b3] px-4 pt-4 pb-4 lg:px-6 lg:pt-6 lg:pb-6 rounded-b-3xl shadow-lg">
        <button onClick={() => router.push('/dashboard/kelola-event')}
          className="text-blue-200 text-xs font-bold mb-2 hover:text-white transition-all">
          ← Kembali
        </button>
        <div className="flex items-start gap-3">
          <span className="text-4xl">{tipeEmoji[event.tipe] || '📋'}</span>
          <div className="flex-1 min-w-0">
            <h1 className="text-white text-lg lg:text-2xl font-black tracking-tight">{event.nama_event}</h1>
            <p className="text-blue-200 text-xs lg:text-sm font-bold mt-0.5">
              📅 {fmtDate(event.tanggal)} • ⏰ {event.jam_mulai || '-'} – {event.jam_selesai || '-'}
            </p>
            <p className="text-blue-200 text-xs mt-0.5">
              📍 {event.nama_lokasi || event.lokasi || '-'} • 🏢 {event.site || '-'}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap border
            ${event.status === 'AKTIF' ? 'bg-green-100 text-green-700 border-green-300' :
              event.status === 'SELESAI' ? 'bg-blue-100 text-blue-700 border-blue-300' :
              'bg-red-100 text-red-700 border-red-300'}`}>
            {event.status}
          </span>
        </div>
      </div>

      <div className="px-4 py-4 lg:px-6 lg:py-6 space-y-3">
        {/* STATS */}
        <div className="grid grid-cols-3 gap-2">
          <StatCard color="blue" label="Total Hadir" value={totalHadir} icon="👥" />
          <StatCard color="green" label="Internal" value={totalInternal} icon="💼" />
          <StatCard color="purple" label="Tamu" value={totalTamu} icon="🎫" />
        </div>

        {/* ACTIONS */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setQrModal(true)}
            className="px-4 py-2 bg-[#003D79] text-white rounded-xl text-xs font-bold hover:bg-[#002a57] shadow-lg">
            📱 Lihat QR
          </button>
          <a href={`/api/events/${eventId}/export`}
            className="px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-700 shadow-lg">
            📊 Export Excel
          </a>
          <button onClick={fetchData}
            className="px-4 py-2 bg-white text-slate-700 border-2 rounded-xl text-xs font-bold hover:bg-slate-50">
            🔄 Refresh
          </button>
        </div>

        {/* SEARCH */}
        <div className="bg-white rounded-2xl border shadow-sm p-3">
          <input type="text" placeholder="🔍 Cari nama / NRP / perusahaan..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>

        {/* LIST PESERTA */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="px-4 py-2 border-b bg-slate-50 text-xs text-slate-600 font-bold">
            Menampilkan <span className="text-[#003D79]">{filtered.length}</span> dari <span className="text-[#003D79]">{attendances.length}</span> peserta
          </div>

          {!filtered.length ? (
            <div className="text-center py-10">
              <div className="text-3xl mb-2">📭</div>
              <p className="text-sm text-slate-500">
                {attendances.length === 0 ? 'Belum ada yang hadir' : 'Tidak ada yang cocok dengan pencarian'}
              </p>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-3 py-2 text-left font-black text-slate-600 uppercase tracking-wide">#</th>
                      <th className="px-3 py-2 text-left font-black text-slate-600 uppercase tracking-wide">Nama</th>
                      <th className="px-3 py-2 text-left font-black text-slate-600 uppercase tracking-wide">NRP</th>
                      <th className="px-3 py-2 text-left font-black text-slate-600 uppercase tracking-wide">Jabatan</th>
                      <th className="px-3 py-2 text-left font-black text-slate-600 uppercase tracking-wide">Perusahaan</th>
                      <th className="px-3 py-2 text-center font-black text-slate-600 uppercase tracking-wide">Waktu</th>
                      <th className="px-3 py-2 text-center font-black text-slate-600 uppercase tracking-wide">TTD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((a, i) => (
                      <tr key={a.id} className="border-b hover:bg-blue-50/50 transition-colors">
                        <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                        <td className="px-3 py-2 font-bold text-slate-800">{a.nama}</td>
                        <td className="px-3 py-2 text-slate-600">
                          {a.nrp || <span className="text-gray-400 italic">Tamu</span>}
                        </td>
                        <td className="px-3 py-2 text-slate-600">{a.jabatan || '-'}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            a.is_tamu ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {a.perusahaan || 'Internal'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center text-slate-700 whitespace-nowrap">
                          {fmtDateTime(a.scan_at)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {a.signature_url ? (
                            <button onClick={() => setTtdModal(a)}
                              className="text-blue-600 hover:text-blue-800 text-lg">👁️</button>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARDS */}
              <div className="md:hidden divide-y">
                {filtered.map((a, i) => (
                  <div key={a.id} className="p-3">
                    <div className="flex justify-between items-start mb-1 gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-slate-800 truncate">{i + 1}. {a.nama}</div>
                        <div className="text-[11px] text-slate-500">
                          {a.nrp || 'Tamu'} • {a.jabatan || '-'}
                        </div>
                      </div>
                      {a.signature_url && (
                        <button onClick={() => setTtdModal(a)}
                          className="text-blue-600 text-lg">👁️</button>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        a.is_tamu ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {a.perusahaan || 'Internal'}
                      </span>
                      <span className="text-[11px] text-slate-500">🕐 {fmtDateTime(a.scan_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* TTD MODAL */}
      {ttdModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setTtdModal(null)}>
          <div className="bg-white rounded-2xl p-5 max-w-md w-full">
            <h3 className="text-sm font-black text-slate-800 mb-1">✍️ Tanda Tangan</h3>
            <p className="text-xs text-slate-500 mb-3">{ttdModal.nama}</p>
            <img src={ttdModal.signature_url} alt="TTD" className="w-full border-2 border-slate-100 rounded-xl bg-white" />
            <button onClick={() => setTtdModal(null)}
              className="w-full mt-3 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200">
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* QR MODAL */}
      {qrModal && <QREventModal event={event} onClose={() => setQrModal(false)} />}
    </div>
  )
}

// ─────────────────────────────────────────────────
function StatCard({ color, label, value, icon }: any) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-[#003D79] border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  }
  return (
    <div className={`${colorMap[color]} rounded-2xl border p-3`}>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[10px] font-black uppercase tracking-wide opacity-80">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className="text-2xl md:text-3xl font-black leading-tight">{value}</div>
    </div>
  )
}

function QREventModal({ event, onClose }: { event: any; onClose: () => void }) {
  const [qrUrl, setQrUrl] = useState('')
  const token = event.lokasi_qr_token || event.qr_token
  const scanUrl = typeof window !== 'undefined' ? `${window.location.origin}/scan/${token}` : ''

  useEffect(() => {
    if (!scanUrl) return
    import('qrcode').then((QRCode) => {
      QRCode.toDataURL(scanUrl, { width: 400, margin: 2, color: { dark: '#003D79', light: '#FFFFFF' } })
        .then((url: string) => setQrUrl(url)).catch(console.error)
    })
  }, [scanUrl])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl p-5 max-w-md w-full text-center">
        <h3 className="text-lg font-black text-slate-800 mb-1">📱 QR Code</h3>
        <p className="text-sm font-bold text-[#003D79] mb-4">{event.nama_event}</p>
        {qrUrl ? (
          <img src={qrUrl} alt="QR" className="mx-auto w-64 h-64 rounded-xl border-4 border-slate-100 mb-4" />
        ) : <div className="w-64 h-64 mx-auto bg-slate-100 rounded-xl flex items-center justify-center mb-4">
          <span className="animate-spin text-2xl">⏳</span>
        </div>}
        <div className="bg-slate-50 rounded-xl p-3 mb-4">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">URL Scan</p>
          <p className="text-[11px] text-slate-700 break-all font-mono">{scanUrl}</p>
        </div>
        <button onClick={onClose}
          className="w-full px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200">
          Tutup
        </button>
      </div>
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