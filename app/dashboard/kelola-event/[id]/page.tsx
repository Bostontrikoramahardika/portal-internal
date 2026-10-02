'use client'


// ═══════════════════════════════════════════════════════════════════════════
// DETAIL EVENT v2.0
// Halaman detail event: info + list peserta + TTD viewer + MoM
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'

// ─── Types ───────────────────────────────────────────────────────────────────
type MomItem = {
  id: string
  no_urut: number
  topik: string
  action_item: string | null
  disampaikan_oleh: string | null
  due_date: string | null
  pic: string | null
  status: 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'
  catatan: string | null
  created_by: string
  created_by_nama: string
}

type MomForm = {
  topik: string
  action_item: string
  disampaikan_oleh: string
  due_date: string
  pic: string
  status: 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'
  catatan: string
}

const EMPTY_FORM: MomForm = {
  topik: '',
  action_item: '',
  disampaikan_oleh: '',
  due_date: '',
  pic: '',
  status: 'OPEN',
  catatan: '',
}

// ─── Invitation types ───
type Invitation = {
  id: string
  nrp: string
  nama: string | null
  google_event_id: string | null
  google_sync_status: 'PENDING' | 'SYNCED' | 'FAILED' | 'SKIPPED'
  google_sync_error: string | null
  invited_at: string
}

type InviteSummary = {
  total: number
  synced: number
  pending: number
  failed: number
  skipped: number
}

const STATUS_CONFIG = {
  OPEN:        { label: 'Open',        color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  DONE:        { label: 'Done',        color: 'bg-green-100 text-green-700 border-green-300' },
  CANCELLED:   { label: 'Cancelled',   color: 'bg-red-100 text-red-700 border-red-300' },
}

// ─── Main Page ────────────────────────────────────────────────────────────────
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

  // MoM state
  const [momList, setMomList] = useState<MomItem[]>([])
  const [momLoading, setMomLoading] = useState(false)
  const [momForm, setMomForm] = useState<MomForm>(EMPTY_FORM)
  const [editingMomId, setEditingMomId] = useState<string | null>(null)
  const [showMomForm, setShowMomForm] = useState(false)
  const [momSaving, setMomSaving] = useState(false)
  const [momDeleteId, setMomDeleteId] = useState<string | null>(null)

    // ── Invitations state ──
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [inviteSummary, setInviteSummary] = useState<InviteSummary>({ total: 0, synced: 0, pending: 0, failed: 0, skipped: 0 })
  const [inviteLoading, setInviteLoading] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)

  // ─── Fetch Event + Peserta ──────────────────────────────────────────────────
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

  // ─── Fetch MoM ─────────────────────────────────────────────────────────────
  const fetchMom = useCallback(async () => {
    setMomLoading(true)
    try {
      const res = await fetch(`/api/events/${eventId}/mom`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMomList(data.mom || [])
    } catch (err: any) {
      console.error('Error fetch MoM:', err.message)
    } finally {
      setMomLoading(false)
    }
  }, [eventId])

  // ─── Fetch Invitations ─────────────────────────────────────
  const fetchInvitations = useCallback(async () => {
    setInviteLoading(true)
    try {
      const res = await fetch(`/api/events/${eventId}/invitations`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setInvitations(data.data || [])
      setInviteSummary(data.summary || { total: 0, synced: 0, pending: 0, failed: 0, skipped: 0 })
    } catch (err: any) {
      console.error('Error fetch invitations:', err.message)
    } finally {
      setInviteLoading(false)
    }
  }, [eventId])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { if (eventId) fetchMom() }, [fetchMom, eventId])
  useEffect(() => { if (eventId) fetchInvitations() }, [fetchInvitations, eventId])

  // ─── MoM Handlers ──────────────────────────────────────────────────────────
  const openAddMom = () => {
    setEditingMomId(null)
    setMomForm(EMPTY_FORM)
    setShowMomForm(true)
  }

  const openEditMom = (item: MomItem) => {
    setEditingMomId(item.id)
    setMomForm({
      topik: item.topik || '',
      action_item: item.action_item || '',
      disampaikan_oleh: item.disampaikan_oleh || '',
      due_date: item.due_date || '',
      pic: item.pic || '',
      status: item.status || 'OPEN',
      catatan: item.catatan || '',
    })
    setShowMomForm(true)
  }

  const cancelMomForm = () => {
    setShowMomForm(false)
    setEditingMomId(null)
    setMomForm(EMPTY_FORM)
  }

  const saveMom = async () => {
    if (!momForm.topik.trim()) {
      alert('⚠️ Topik wajib diisi')
      return
    }
    setMomSaving(true)
    try {
      const url = editingMomId
        ? `/api/events/${eventId}/mom/${editingMomId}`
        : `/api/events/${eventId}/mom`
      const method = editingMomId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(momForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      cancelMomForm()
      fetchMom()
    } catch (err: any) {
      alert('❌ ' + err.message)
    } finally {
      setMomSaving(false)
    }
  }

  const deleteMom = async (momId: string) => {
    setMomDeleteId(momId)
    try {
      const res = await fetch(`/api/events/${eventId}/mom/${momId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      fetchMom()
    } catch (err: any) {
      alert('❌ ' + err.message)
    } finally {
      setMomDeleteId(null)
    }
  }

  // Quick status update (langsung dari badge, tanpa buka form)
  const updateStatus = async (item: MomItem, newStatus: MomItem['status']) => {
    try {
      const res = await fetch(`/api/events/${eventId}/mom/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, status: newStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      fetchMom()
    } catch (err: any) {
      alert('❌ ' + err.message)
    }
  }

  // ─── Handler Remove Invitation ─────────────────────────────
  const handleRemoveInvite = async (inv: Invitation) => {
    if (!confirm(`Hapus undangan untuk ${inv.nama || inv.nrp}?\n\n${inv.google_sync_status === 'SYNCED' ? '⚠️ Event akan otomatis dihapus dari Google Calendar-nya juga.' : ''}`)) return
    try {
      const res = await fetch(`/api/events/${eventId}/invitations?nrp=${inv.nrp}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      fetchInvitations()
    } catch (err: any) {
      alert('❌ ' + err.message)
    }
  }

  // ─── Filter peserta ─────────────────────────────────────────
  const filtered = attendances.filter((a) => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      a.nama?.toLowerCase().includes(s) ||
      a.nrp?.toLowerCase().includes(s) ||
      a.perusahaan?.toLowerCase().includes(s)
    )
  })

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-[#f4f7fa] p-2 sm:p-3 lg:p-4 pb-24 text-slate-800">
      

        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[#003D79] mb-2"></div>
          <p className="text-sm font-semibold text-slate-500">Memuat detail event...</p>
        </div>
      </div>
    )
  }

  if (!event) return null

  const tipeEmoji: Record<string, string> = { MEETING: '🤝', TRAINING: '📚', ACARA: '🎉', SAFETY: '🦺' }

  // Summary MoM counts
  const momOpen       = momList.filter(m => m.status === 'OPEN').length
  const momInProgress = momList.filter(m => m.status === 'IN_PROGRESS').length
  const momDone       = momList.filter(m => m.status === 'DONE').length

  return (
    <div className="bg-[#f4f7fa] p-2 sm:p-3 lg:p-4 pb-24 text-slate-800">

      {/* ── HEADER ── */}
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

        {/* ── STATS ── */}
        <div className="grid grid-cols-3 gap-2">
          <StatCard color="blue"   label="Total Hadir" value={totalHadir}   icon="👥" />
          <StatCard color="green"  label="Internal"    value={totalInternal} icon="💼" />
          <StatCard color="purple" label="Tamu"        value={totalTamu}     icon="🎫" />
        </div>

        {/* ══════════════════════════════════════════════════════
            ── UNDANGAN PESERTA (Google Calendar Invite) ──
        ══════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">

          {/* Header */}
          <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">📋</span>
              <span className="text-sm font-black text-slate-800">Undangan Peserta</span>
              {inviteSummary.total > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[#003D79] text-white text-[10px] font-bold">
                  {inviteSummary.total}
                </span>
              )}
            </div>
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-3 py-1.5 bg-[#003D79] text-white rounded-lg text-xs font-bold hover:bg-[#003d79] transition-colors"
            >
              + Undang
            </button>
          </div>

          {/* Summary badges */}
          {inviteSummary.total > 0 && (
            <div className="px-4 py-2 border-b flex gap-2 flex-wrap bg-slate-50/50">
              <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-300 text-[10px] font-bold">
                ✅ Sync: {inviteSummary.synced}
              </span>
              {inviteSummary.pending > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-300 text-[10px] font-bold">
                  ⏳ Pending: {inviteSummary.pending}
                </span>
              )}
              {inviteSummary.skipped > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300 text-[10px] font-bold">
                  ⏭️ Skipped: {inviteSummary.skipped}
                </span>
              )}
              {inviteSummary.failed > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-300 text-[10px] font-bold">
                  ❌ Failed: {inviteSummary.failed}
                </span>
              )}
            </div>
          )}

          {/* Info kalau event masih DRAFT */}
          {event.status === 'DRAFT' && invitations.length > 0 && (
            <div className="px-4 py-2 border-b bg-amber-50 text-[10px] text-amber-800 flex items-start gap-2">
              <span>💡</span>
              <span>Event masih DRAFT — undangan belum di-sync ke Google Calendar. Klik <strong>✅ Confirm</strong> di halaman Kelola Event untuk sync.</span>
            </div>
          )}

          {/* List Undangan */}
          {inviteLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#003D79]"></div>
              <p className="text-xs text-slate-500 mt-2">Memuat undangan...</p>
            </div>
          ) : invitations.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-3xl mb-2">📭</div>
              <p className="text-sm text-slate-500">Belum ada undangan</p>
              <p className="text-xs text-[#5a6a7e] mt-1">Klik "+ Undang" untuk undang peserta</p>
            </div>
          ) : (
            <div className="divide-y max-h-96 overflow-y-auto">
              {invitations.map((inv) => (
                <div key={inv.id} className="px-4 py-2.5 flex items-center gap-2 hover:bg-slate-50/50">
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-black text-slate-500 flex-shrink-0">
                    {(inv.nama || '?')[0]?.toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-800 truncate">
                      {inv.nama || inv.nrp}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">NRP: {inv.nrp}</div>
                  </div>

                  {/* Sync Status Badge */}
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full whitespace-nowrap
                    ${inv.google_sync_status === 'SYNCED' ? 'bg-green-100 text-green-700' :
                      inv.google_sync_status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                      inv.google_sync_status === 'SKIPPED' ? 'bg-slate-100 text-slate-600' :
                      'bg-red-100 text-red-700'}`}>
                    {inv.google_sync_status === 'SYNCED' ? '✅ Sync' :
                     inv.google_sync_status === 'PENDING' ? '⏳ Pending' :
                     inv.google_sync_status === 'SKIPPED' ? '⏭️ Skip' :
                     '❌ Fail'}
                  </span>

                  {/* Remove button */}
                  <button
                    onClick={() => handleRemoveInvite(inv)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg text-sm"
                    title="Hapus undangan"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* ── END UNDANGAN ── */}

        {/* ── ACTIONS ── */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setQrModal(true)}
            className="px-4 py-2 bg-[#003D79] text-white rounded-xl text-xs font-bold hover:bg-[#003d79] shadow-lg">
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

        {/* ── SEARCH ── */}
        <div className="bg-white rounded-2xl border shadow-sm p-3">
          <input type="text" placeholder="🔍 Cari nama / NRP / perusahaan..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>

        {/* ── LIST PESERTA ── */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="px-4 py-2 border-b bg-slate-50 text-xs text-slate-600 font-bold">
            Menampilkan <span className="text-[#003D79]">{filtered.length}</span> dari{' '}
            <span className="text-[#003D79]">{attendances.length}</span> peserta
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
                            <span className="text-[#5a6a7e]">—</span>
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
                        <button onClick={() => setTtdModal(a)} className="text-blue-600 text-lg">👁️</button>
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

        {/* ══════════════════════════════════════════════════════
            ── MOM SECTION ──
        ══════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">

          {/* Header MoM */}
          <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">📋</span>
              <span className="text-sm font-black text-slate-800">Minutes of Meeting</span>
              {momList.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[#003D79] text-white text-[10px] font-bold">
                  {momList.length}
                </span>
              )}
            </div>
            <button onClick={openAddMom}
              className="px-3 py-1.5 bg-[#003D79] text-white rounded-lg text-xs font-bold hover:bg-[#003d79] transition-colors">
              + Tambah Item
            </button>
          </div>

          {/* MoM Summary badges (kalau ada data) */}
          {momList.length > 0 && (
            <div className="px-4 py-2 border-b flex gap-2 flex-wrap bg-slate-50/50">
              <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-300 text-[10px] font-bold">
                🟡 Open: {momOpen}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-300 text-[10px] font-bold">
                🔵 In Progress: {momInProgress}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-300 text-[10px] font-bold">
                🟢 Done: {momDone}
              </span>
            </div>
          )}

          {/* Form Tambah/Edit MoM */}
          {showMomForm && (
            <div className="p-4 border-b bg-blue-50/40">
              <p className="text-xs font-black text-[#003D79] mb-3">
                {editingMomId ? '✏️ Edit Item MoM' : '➕ Tambah Item MoM'}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                {/* Topik */}
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1">
                    Topik <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={momForm.topik}
                    onChange={(e) => setMomForm(f => ({ ...f, topik: e.target.value }))}
                    placeholder="Topik pembahasan..."
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#003D79] focus:border-transparent"
                  />
                </div>

                {/* Action Item */}
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1">
                    Action Item
                  </label>
                  <textarea
                    value={momForm.action_item}
                    onChange={(e) => setMomForm(f => ({ ...f, action_item: e.target.value }))}
                    placeholder="Tindakan yang perlu dilakukan..."
                    rows={2}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#003D79] focus:border-transparent resize-none"
                  />
                </div>

                {/* Disampaikan Oleh */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1">
                    Disampaikan Oleh
                  </label>
                  <input
                    type="text"
                    value={momForm.disampaikan_oleh}
                    onChange={(e) => setMomForm(f => ({ ...f, disampaikan_oleh: e.target.value }))}
                    placeholder="Nama pembicara..."
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#003D79] focus:border-transparent"
                  />
                </div>

                {/* PIC */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1">
                    PIC
                  </label>
                  <input
                    type="text"
                    value={momForm.pic}
                    onChange={(e) => setMomForm(f => ({ ...f, pic: e.target.value }))}
                    placeholder="Person in charge..."
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#003D79] focus:border-transparent"
                  />
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1">
                    Due Date <span className="text-[#5a6a7e] font-normal normal-case">(opsional)</span>
                  </label>
                  <input
                    type="date"
                    value={momForm.due_date}
                    onChange={(e) => setMomForm(f => ({ ...f, due_date: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#003D79] focus:border-transparent"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1">
                    Status
                  </label>
                  <select
                    value={momForm.status}
                    onChange={(e) => setMomForm(f => ({ ...f, status: e.target.value as MomForm['status'] }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#003D79] focus:border-transparent"
                  >
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="DONE">Done</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>

                {/* Catatan */}
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1">
                    Catatan
                  </label>
                  <input
                    type="text"
                    value={momForm.catatan}
                    onChange={(e) => setMomForm(f => ({ ...f, catatan: e.target.value }))}
                    placeholder="Catatan tambahan..."
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#003D79] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex gap-2 mt-3">
                <button onClick={saveMom} disabled={momSaving}
                  className="px-4 py-2 bg-[#003D79] text-white rounded-lg text-xs font-bold hover:bg-[#003d79] disabled:opacity-50 transition-colors">
                  {momSaving ? '⏳ Menyimpan...' : editingMomId ? '💾 Update' : '✅ Simpan'}
                </button>
                <button onClick={cancelMomForm} disabled={momSaving}
                  className="px-4 py-2 bg-white text-slate-700 border rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors">
                  Batal
                </button>
              </div>
            </div>
          )}

          {/* MoM List */}
          {momLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#003D79]"></div>
              <p className="text-xs text-slate-500 mt-2">Memuat MoM...</p>
            </div>
          ) : momList.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-3xl mb-2">📝</div>
              <p className="text-sm text-slate-500">Belum ada Minutes of Meeting</p>
              <p className="text-xs text-[#5a6a7e] mt-1">Klik "+ Tambah Item" untuk mulai mencatat</p>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-3 py-2 text-left font-black text-slate-600 uppercase tracking-wide w-8">No</th>
                      <th className="px-3 py-2 text-left font-black text-slate-600 uppercase tracking-wide">Topik</th>
                      <th className="px-3 py-2 text-left font-black text-slate-600 uppercase tracking-wide">Action Item</th>
                      <th className="px-3 py-2 text-left font-black text-slate-600 uppercase tracking-wide">Disampaikan Oleh</th>
                      <th className="px-3 py-2 text-left font-black text-slate-600 uppercase tracking-wide">Due Date</th>
                      <th className="px-3 py-2 text-left font-black text-slate-600 uppercase tracking-wide">PIC</th>
                      <th className="px-3 py-2 text-center font-black text-slate-600 uppercase tracking-wide">Status</th>
                      <th className="px-3 py-2 text-center font-black text-slate-600 uppercase tracking-wide">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {momList.map((item) => (
                      <tr key={item.id} className="border-b hover:bg-slate-50/80 transition-colors">
                        <td className="px-3 py-2 text-slate-500 text-center">{item.no_urut}</td>
                        <td className="px-3 py-2 font-bold text-slate-800 max-w-[140px]">
                          <div className="truncate" title={item.topik}>{item.topik}</div>
                          {item.catatan && (
                            <div className="text-[#5a6a7e] font-normal truncate text-[10px] mt-0.5" title={item.catatan}>
                              📌 {item.catatan}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-600 max-w-[160px]">
                          <div className="line-clamp-2" title={item.action_item || ''}>{item.action_item || '—'}</div>
                        </td>
                        <td className="px-3 py-2 text-slate-600">{item.disampaikan_oleh || '—'}</td>
                        <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                          {item.due_date ? (
                            <span className={`${isDueDatePast(item.due_date) && item.status !== 'DONE' && item.status !== 'CANCELLED'
                              ? 'text-red-600 font-bold' : ''}`}>
                              {fmtDate(item.due_date)}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-3 py-2 text-slate-600">{item.pic || '—'}</td>
                        <td className="px-3 py-2 text-center">
                          {/* Quick status dropdown */}
                          <select
                            value={item.status}
                            onChange={(e) => updateStatus(item, e.target.value as MomItem['status'])}
                            className={`text-[10px] font-bold rounded-full px-2 py-0.5 border cursor-pointer
                              ${STATUS_CONFIG[item.status]?.color} focus:outline-none`}
                          >
                            <option value="OPEN">Open</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="DONE">Done</option>
                            <option value="CANCELLED">Cancelled</option>
                          </select>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => openEditMom(item)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm"
                              title="Edit">✏️</button>
                            <button
                              onClick={() => {
                                if (confirm(`Hapus item "${item.topik}"?`)) deleteMom(item.id)
                              }}
                              disabled={momDeleteId === item.id}
                              className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors text-sm disabled:opacity-50"
                              title="Hapus">
                              {momDeleteId === item.id ? '⏳' : '🗑️'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARDS */}
              <div className="md:hidden divide-y">
                {momList.map((item) => (
                  <div key={item.id} className="p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[10px] font-black text-[#5a6a7e]">#{item.no_urut}</span>
                          <span className="font-bold text-sm text-slate-800 truncate">{item.topik}</span>
                        </div>
                        {item.action_item && (
                          <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{item.action_item}</p>
                        )}
                        {item.catatan && (
                          <p className="text-[10px] text-[#5a6a7e] mt-0.5">📌 {item.catatan}</p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => openEditMom(item)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg text-sm">✏️</button>
                        <button
                          onClick={() => { if (confirm(`Hapus item "${item.topik}"?`)) deleteMom(item.id) }}
                          disabled={momDeleteId === item.id}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg text-sm disabled:opacity-50">
                          {momDeleteId === item.id ? '⏳' : '🗑️'}
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {/* Quick status select mobile */}
                      <select
                        value={item.status}
                        onChange={(e) => updateStatus(item, e.target.value as MomItem['status'])}
                        className={`text-[10px] font-bold rounded-full px-2 py-0.5 border cursor-pointer
                          ${STATUS_CONFIG[item.status]?.color} focus:outline-none`}
                      >
                        <option value="OPEN">Open</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="DONE">Done</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                      {item.pic && (
                        <span className="text-[10px] text-slate-500">👤 {item.pic}</span>
                      )}
                      {item.due_date && (
                        <span className={`text-[10px] ${isDueDatePast(item.due_date) && item.status !== 'DONE' && item.status !== 'CANCELLED'
                          ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
                          📅 {fmtDate(item.due_date)}
                        </span>
                      )}
                      {item.disampaikan_oleh && (
                        <span className="text-[10px] text-slate-500">🎤 {item.disampaikan_oleh}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        {/* ── END MOM SECTION ── */}

      </div>

      {/* ── TTD MODAL ── */}
      {ttdModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setTtdModal(null)}>
          <div className="bg-white rounded-2xl p-5 max-w-md w-full">
            <h3 className="text-sm font-black text-slate-800 mb-1">✍️ Tanda Tangan</h3>
            <p className="text-xs text-slate-500 mb-3">{ttdModal.nama}</p>
            <img src={ttdModal.signature_url} alt="TTD"
              className="w-full border-2 border-slate-100 rounded-xl bg-white" />
            <button onClick={() => setTtdModal(null)}
              className="w-full mt-3 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200">
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* ── QR MODAL ── */}
      {qrModal && <QREventModal event={event} onClose={() => setQrModal(false)} />}

      {/* ── INVITE MODAL ── */}
      {showInviteModal && (
        <InviteModal
          eventId={eventId}
          eventSite={event.site}
          existingNrps={invitations.map(i => i.nrp)}
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => {
            setShowInviteModal(false)
            fetchInvitations()
          }}
        />
      )}
    </div>
  )
}

// ─── Helper: due date sudah lewat? ────────────────────────────────────────────
function isDueDatePast(dateStr: string): boolean {
  if (!dateStr) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dateStr)
  due.setHours(0, 0, 0, 0)
  return due < today
}

// ─── Sub Components ───────────────────────────────────────────────────────────
function StatCard({ color, label, value, icon }: any) {
  const colorMap: Record<string, string> = {
    blue:   'bg-blue-50 text-[#003D79] border-blue-200',
    green:  'bg-green-50 text-green-700 border-green-200',
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
        ) : (
          <div className="w-64 h-64 mx-auto bg-slate-100 rounded-xl flex items-center justify-center mb-4">
            <span className="animate-spin text-2xl">⏳</span>
          </div>
        )}
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

// ═══════════════════════════════════════════════════════════════════════════
// INVITE MODAL — Multi-select karyawan + preset
// ═══════════════════════════════════════════════════════════════════════════
type Employee = {
  nrp: string
  nama: string
  jabatan: string | null
  departemen: string | null
  site: string | null
  roles?: string[]
}

function InviteModal({ eventId, eventSite, existingNrps, onClose, onSuccess }: {
  eventId: string
  eventSite: string | null
  existingNrps: string[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [search, setSearch] = useState('')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [preset, setPreset] = useState<'ALL' | 'LEADER' | 'STAFF'>('ALL')

  // ─── Fetch karyawan by site + preset ───
  const loadEmployees = useCallback(async () => {
    setLoading(true)
    try {
      // Ambil karyawan aktif di site
      const params = new URLSearchParams()
      if (eventSite) params.set('site', eventSite)
      if (search) params.set('search', search)
      params.set('limit', '200')

      const res = await fetch(`/api/kelola-akses?${params}`)
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'Gagal load')

      let list: Employee[] = data.data || []

      // Filter berdasarkan preset
      if (preset === 'LEADER') {
        const LEADER_ROLES = [
          'super_admin', 'director_ops', 'business_dev', 'manager_ops',
          'hr_ho', 'hr_site', 'pjo_site', 'gl_produksi', 'gl_plant',
          'admin_site', 'admin_plant', 'spv_she_ho', 'she_site'
        ]
        list = list.filter(e => 
          (e.roles || []).some((r: string) => LEADER_ROLES.includes(r))
        )
      } else if (preset === 'STAFF') {
        list = list.filter(e => {
          const roles = e.roles || []
          return roles.length === 0 || roles.every(r => 
            !['super_admin', 'director_ops', 'business_dev', 'manager_ops',
              'hr_ho', 'hr_site', 'pjo_site', 'gl_produksi', 'gl_plant',
              'admin_site', 'admin_plant', 'spv_she_ho', 'she_site'].includes(r)
          )
        })
      }

      // Filter yang belum diundang
      list = list.filter(e => !existingNrps.includes(e.nrp))

      setEmployees(list)
    } catch (err: any) {
      console.error(err)
      alert('❌ ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [eventSite, search, preset, existingNrps])

  useEffect(() => {
    const t = setTimeout(() => loadEmployees(), 400)
    return () => clearTimeout(t)
  }, [loadEmployees])

  // ─── Toggle select ───
  const toggle = (nrp: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(nrp)) next.delete(nrp)
      else next.add(nrp)
      return next
    })
  }

  // ─── Select All / Clear ───
  const selectAll = () => setSelected(new Set(employees.map(e => e.nrp)))
  const clearAll = () => setSelected(new Set())

  // ─── Submit ───
  const handleSubmit = async () => {
    if (selected.size === 0) {
      alert('⚠️ Pilih minimal 1 peserta')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/events/${eventId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nrps: Array.from(selected) })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      alert('✅ ' + data.message)
      onSuccess()
    } catch (err: any) {
      alert('❌ ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="p-4 border-b bg-[#003D79] text-white rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-lg">➕ Undang Peserta</h3>
              <p className="text-[11px] text-blue-200 mt-0.5">
                Site: {eventSite || 'Semua'} • {existingNrps.length} sudah diundang
              </p>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-full">
              ✕
            </button>
          </div>
        </div>

        {/* Preset buttons */}
        <div className="p-3 border-b flex gap-2 flex-wrap bg-slate-50">
          {[
            { key: 'ALL' as const, label: '👥 Semua', color: 'bg-[#003D79]' },
            { key: 'LEADER' as const, label: '👑 Leader', color: 'bg-[#003d79]' },
            { key: 'STAFF' as const, label: '👤 Staff', color: 'bg-emerald-600' },
          ].map(p => (
            <button key={p.key} onClick={() => setPreset(p.key)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all
                ${preset === p.key ? `${p.color} text-white shadow` : 'bg-white text-slate-600 border'}`}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="p-3 border-b">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Cari nama atau NRP..."
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#003D79] focus:border-transparent"
          />
        </div>

        {/* Select All + Info */}
        <div className="px-3 py-2 border-b bg-slate-50 flex items-center justify-between text-[11px]">
          <div className="text-slate-600 font-bold">
            {employees.length} karyawan tersedia
            {selected.size > 0 && (
              <span className="ml-2 text-[#003D79]">• {selected.size} dipilih</span>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={selectAll} className="text-blue-600 font-bold hover:underline">
              Pilih Semua
            </button>
            {selected.size > 0 && (
              <button onClick={clearAll} className="text-red-500 font-bold hover:underline">
                Clear
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-10">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#003D79]"></div>
              <p className="text-xs text-slate-500 mt-2">Memuat...</p>
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-3xl mb-2">🔍</div>
              <p className="text-sm text-slate-500">
                {existingNrps.length > 0 
                  ? 'Semua karyawan sudah diundang / tidak match filter' 
                  : 'Tidak ada karyawan ditemukan'}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {employees.map(emp => {
                const isSelected = selected.has(emp.nrp)
                return (
                  <label
                    key={emp.nrp}
                    className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors
                      ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(emp.nrp)}
                      className="w-4 h-4 text-[#003D79] rounded focus:ring-[#003D79]"
                    />
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-black text-slate-500 flex-shrink-0">
                      {emp.nama[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-800 truncate">{emp.nama}</div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {emp.nrp} • {emp.jabatan || '-'} • {emp.site || '-'}
                      </div>
                    </div>
                  </label>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t bg-slate-50 flex gap-2">
          <button onClick={onClose} disabled={saving}
            className="flex-1 py-2.5 bg-white text-slate-600 border rounded-lg text-xs font-bold hover:bg-slate-100 disabled:opacity-50">
            Batal
          </button>
          <button onClick={handleSubmit} disabled={saving || selected.size === 0}
            className="flex-1 py-2.5 bg-[#003D79] text-white rounded-lg text-xs font-bold hover:bg-[#003d79] disabled:opacity-50">
            {saving ? '⏳ Mengirim...' : `✅ Undang (${selected.size})`}
          </button>
        </div>
      </div>
    

      </div>
  )
}


// ─── Format Helpers ───────────────────────────────────────────────────────────
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