'use client'

// ═══════════════════════════════════════════════════════════════════════════
// KELOLA EVENT v1.0 - Chat 34
// 3 TAB: QR Lokasi | Event/Acara | Master Perusahaan
// Style: HR Dashboard (corporate blue #003D79)
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/app/lib/AuthContext'

type TabKey = 'qr' | 'event' | 'perusahaan'

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════
export default function KelolaEventPage() {
  const { user, isSuperAdmin } = useAuth()
  const [activeTab, setActiveTab] = useState<TabKey>('qr')

  const tabs: { key: TabKey; icon: string; label: string }[] = [
    { key: 'qr', icon: '📱', label: 'QR Lokasi' },
    { key: 'event', icon: '📋', label: 'Event / Acara' },
    { key: 'perusahaan', icon: '🏢', label: 'Master Perusahaan' },
  ]

  return (
    <div className="min-h-screen bg-[#f4f7fa] pb-24">
      {/* HEADER */}
      <div className="bg-gradient-to-br from-[#003D79] to-[#0056b3] px-4 pt-6 pb-4 lg:px-6 lg:pt-8 lg:pb-6 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-4xl">🎫</span>
          <div>
            <h1 className="text-white text-xl lg:text-3xl font-black tracking-tight">Kelola Event</h1>
            <p className="text-blue-200 text-xs lg:text-sm font-bold">Absensi Meeting & Acara</p>
          </div>
        </div>
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1 no-scrollbar">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs lg:text-sm font-bold whitespace-nowrap transition-all
                ${activeTab === t.key ? 'bg-white text-[#003D79] shadow-lg' : 'bg-white/20 text-white/80 hover:bg-white/30'}`}>
              <span>{t.icon}</span><span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 lg:px-6 lg:py-6">
        {activeTab === 'qr' && <QRLokasiTab />}
        {activeTab === 'event' && <EventTab />}
        {activeTab === 'perusahaan' && <MasterPerusahaanTab />}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 1: QR LOKASI
// ═══════════════════════════════════════════════════════════════════════════
function QRLokasiTab() {
  const [locations, setLocations] = useState<any[]>([])
  const [sites, setSites] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [qrModal, setQrModal] = useState<any>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/qr-locations')
      const data = await res.json()
      setLocations(data.data || [])
      setSites(data.sites || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleDelete = async (id: string) => {
    if (!confirm('Nonaktifkan QR Lokasi ini?')) return
    await fetch(`/api/qr-locations/${id}`, { method: 'DELETE' })
    fetchData()
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-black text-slate-700 uppercase tracking-wide">📱 QR Lokasi ({locations.length})</h2>
        <button onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-[#003D79] text-white rounded-xl text-xs font-bold hover:bg-[#002a57] transition-all shadow-lg">
          ➕ Buat QR Baru
        </button>
      </div>

      {loading ? <LoadingSpinner /> : !locations.length ? (
        <EmptyState icon="📱" msg="Belum ada QR Lokasi. Buat satu untuk mulai!" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {locations.map((loc) => (
            <div key={loc.id} className="bg-white rounded-2xl border shadow-sm p-4 hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-black text-slate-800 text-sm">{loc.nama_lokasi}</h3>
                  {loc.deskripsi && <p className="text-[11px] text-slate-500 mt-0.5">{loc.deskripsi}</p>}
                  <p className="text-[11px] text-slate-500 mt-1">🏢 {loc.site || '-'} • 📋 {loc.total_event} event</p>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mb-3 font-mono break-all">Token: {loc.qr_token}</p>
              <div className="flex gap-2">
                <button onClick={() => setQrModal(loc)}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-[11px] font-bold hover:bg-blue-700">
                  📱 Lihat QR
                </button>
                <button onClick={() => handleDelete(loc.id)}
                  className="px-3 py-2 bg-red-100 text-red-600 rounded-lg text-[11px] font-bold hover:bg-red-200">
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreateQRModal sites={sites} onClose={() => setShowCreate(false)} onSuccess={() => { setShowCreate(false); fetchData() }} />}
      {qrModal && <QRDisplayModal data={qrModal} type="location" onClose={() => setQrModal(null)} />}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 2: EVENT / ACARA
// ═══════════════════════════════════════════════════════════════════════════
function EventTab() {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [statusFilter, setStatusFilter] = useState('AKTIF')
  const [qrModal, setQrModal] = useState<any>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/events?${params}`)
      const data = await res.json()
      setEvents(data.data || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [statusFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const handleCancel = async (id: string) => {
    if (!confirm('Batalkan event ini?')) return
    await fetch(`/api/events/${id}`, { method: 'DELETE' })
    fetchData()
  }

  const handleFinish = async (id: string) => {
    if (!confirm('Tandai event ini sebagai selesai?')) return
    const res = await fetch(`/api/events/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'SELESAI' })
    })
    // Fallback kalau PATCH belum didukung: langsung refetch
    fetchData()
  }

  const tipeEmoji: Record<string, string> = {
    MEETING: '🤝', TRAINING: '📚', ACARA: '🎉', SAFETY: '🦺'
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div className="flex gap-2">
          {['AKTIF', 'SELESAI', 'DIBATALKAN'].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all
                ${statusFilter === s ? 'bg-[#003D79] text-white shadow' : 'bg-white text-slate-600 border hover:bg-slate-50'}`}>
              {s === 'AKTIF' ? '🟢' : s === 'SELESAI' ? '✅' : '❌'} {s}
            </button>
          ))}
        </div>
        <button onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-[#003D79] text-white rounded-xl text-xs font-bold hover:bg-[#002a57] shadow-lg">
          ➕ Buat Event
        </button>
      </div>

      {loading ? <LoadingSpinner /> : !events.length ? (
        <EmptyState icon="📋" msg={`Tidak ada event ${statusFilter.toLowerCase()}`} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {events.map((ev) => (
            <div key={ev.id} className="bg-white rounded-2xl border shadow-sm p-4 hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{tipeEmoji[ev.tipe] || '📋'}</span>
                    <h3 className="font-black text-slate-800 text-sm truncate">{ev.nama_event}</h3>
                  </div>
                  {ev.deskripsi && <p className="text-[11px] text-slate-500 mb-1 line-clamp-2">{ev.deskripsi}</p>}
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap border
                  ${ev.status === 'AKTIF' ? 'bg-green-100 text-green-700 border-green-300' :
                    ev.status === 'SELESAI' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                    'bg-red-100 text-red-700 border-red-300'}`}>
                  {ev.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-[11px] mb-3">
                <div className="text-slate-500">📅 {fmtDate(ev.tanggal)}</div>
                <div className="text-slate-500">⏰ {ev.jam_mulai || '-'} – {ev.jam_selesai || '-'}</div>
                <div className="text-slate-500">📍 {ev.lokasi || ev.nama_lokasi || '-'}</div>
                <div className="text-slate-500">🏢 {ev.site || '-'}</div>
              </div>

              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="bg-blue-50 text-[#003D79] px-2.5 py-1 rounded-full text-[11px] font-black">
                    👥 {ev.total_hadir} hadir
                  </span>
                  <span className="text-[10px] text-slate-400">oleh {ev.created_by_nama || ev.created_by}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setQrModal(ev)}
                  className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-bold hover:bg-blue-200">
                  📱 QR
                </button>
                <a href={`/dashboard/kelola-event/${ev.id}`}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold hover:bg-slate-200">
                  👁️ Detail
                </a>
                <a href={`/api/events/${ev.id}/export`}
                  className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-[10px] font-bold hover:bg-green-200">
                  📊 Excel
                </a>
                {ev.status === 'AKTIF' && (
                  <button onClick={() => handleCancel(ev.id)}
                    className="px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-[10px] font-bold hover:bg-red-200 ml-auto">
                    ❌
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreateEventModal onClose={() => setShowCreate(false)} onSuccess={() => { setShowCreate(false); fetchData() }} />}
      {qrModal && <QRDisplayModal data={qrModal} type="event" onClose={() => setQrModal(null)} />}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 3: MASTER PERUSAHAAN
// ═══════════════════════════════════════════════════════════════════════════
function MasterPerusahaanTab() {
  const [companies, setCompanies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/master-perusahaan')
      const data = await res.json()
      setCompanies(data.data || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleAdd = async () => {
    if (!newName.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/master-perusahaan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama_perusahaan: newName.trim() })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setNewName('')
      fetchData()
    } catch (err: any) { alert('❌ ' + err.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Nonaktifkan perusahaan ini?')) return
    await fetch(`/api/master-perusahaan?id=${id}`, { method: 'DELETE' })
    fetchData()
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-black text-slate-700 uppercase tracking-wide">🏢 Master Perusahaan</h2>

      {/* ADD FORM */}
      <div className="bg-white rounded-2xl border shadow-sm p-4">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Nama perusahaan baru..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="flex-1 border-2 border-slate-100 rounded-xl px-3 py-2 text-sm focus:border-blue-500 outline-none"
          />
          <button onClick={handleAdd} disabled={saving || !newName.trim()}
            className="px-4 py-2 bg-[#003D79] text-white rounded-xl text-xs font-bold hover:bg-[#002a57] disabled:opacity-50 whitespace-nowrap">
            {saving ? '...' : '➕ Tambah'}
          </button>
        </div>
      </div>

      {/* LIST */}
      {loading ? <LoadingSpinner /> : (
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="divide-y">
            {companies.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-all">
                <div>
                  <span className="text-sm font-bold text-slate-800">{c.nama_perusahaan}</span>
                  {c.is_default && (
                    <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold">DEFAULT</span>
                  )}
                </div>
                {!c.is_default && (
                  <button onClick={() => handleDelete(c.id)}
                    className="px-3 py-1 bg-red-100 text-red-600 rounded-lg text-[10px] font-bold hover:bg-red-200">
                    🗑️ Hapus
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL: CREATE QR LOKASI
// ═══════════════════════════════════════════════════════════════════════════
function CreateQRModal({ sites, onClose, onSuccess }: { sites: string[]; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ nama_lokasi: '', deskripsi: '', site: '' })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    if (!form.nama_lokasi.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/qr-locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      alert('✅ ' + data.message)
      onSuccess()
    } catch (err: any) { alert('❌ ' + err.message) }
    finally { setSaving(false) }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="text-lg font-black text-slate-800 mb-4">➕ Buat QR Lokasi Baru</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Nama Lokasi *</label>
          <input type="text" required value={form.nama_lokasi}
            onChange={(e) => setForm({ ...form, nama_lokasi: e.target.value })}
            placeholder="Contoh: Ruang Meeting Utama"
            className="w-full border-2 border-slate-100 rounded-xl px-3 py-2.5 text-sm focus:border-blue-500 outline-none" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Deskripsi</label>
          <input type="text" value={form.deskripsi}
            onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
            placeholder="Opsional"
            className="w-full border-2 border-slate-100 rounded-xl px-3 py-2.5 text-sm focus:border-blue-500 outline-none" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Site</label>
          <select value={form.site} onChange={(e) => setForm({ ...form, site: e.target.value })}
            className="w-full border-2 border-slate-100 rounded-xl px-3 py-2.5 text-sm focus:border-blue-500 outline-none">
            <option value="">-- Pilih Site --</option>
            {sites.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">Batal</button>
          <button type="submit" disabled={saving}
            className="flex-1 px-4 py-2.5 bg-[#003D79] text-white rounded-xl text-sm font-bold hover:bg-[#002a57] disabled:opacity-50">
            {saving ? 'Menyimpan...' : '✅ BUAT QR'}
          </button>
        </div>
      </form>
    </ModalOverlay>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL: CREATE EVENT
// ═══════════════════════════════════════════════════════════════════════════
function CreateEventModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    nama_event: '', deskripsi: '', tipe: 'MEETING',
    tanggal: '', jam_mulai: '', jam_selesai: '',
    lokasi: '', site: '', qr_location_id: ''
  })
  const [saving, setSaving] = useState(false)
  const [qrLocations, setQrLocations] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/qr-locations')
      .then((r) => r.json())
      .then((d) => setQrLocations(d.data || []))
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    if (!form.nama_event.trim() || !form.tanggal) return
    setSaving(true)
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      alert('✅ ' + data.message)
      onSuccess()
    } catch (err: any) { alert('❌ ' + err.message) }
    finally { setSaving(false) }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="text-lg font-black text-slate-800 mb-4">➕ Buat Event Baru</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Link ke QR Lokasi (opsional)</label>
          <select value={form.qr_location_id} onChange={(e) => setForm({ ...form, qr_location_id: e.target.value })}
            className="w-full border-2 border-slate-100 rounded-xl px-3 py-2.5 text-sm focus:border-blue-500 outline-none">
            <option value="">📱 Standalone (QR tersendiri)</option>
            {qrLocations.map((l) => <option key={l.id} value={l.id}>📍 {l.nama_lokasi} ({l.site})</option>)}
          </select>
          <p className="text-[10px] text-slate-400 mt-1">Pilih lokasi agar 1 QR bisa dipakai banyak event</p>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Nama Event *</label>
          <input type="text" required value={form.nama_event}
            onChange={(e) => setForm({ ...form, nama_event: e.target.value })}
            placeholder="Contoh: Toolbox Safety Meeting"
            className="w-full border-2 border-slate-100 rounded-xl px-3 py-2.5 text-sm focus:border-blue-500 outline-none" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Deskripsi</label>
          <textarea value={form.deskripsi} rows={2}
            onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
            className="w-full border-2 border-slate-100 rounded-xl px-3 py-2.5 text-sm focus:border-blue-500 outline-none resize-none" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Tipe</label>
            <select value={form.tipe} onChange={(e) => setForm({ ...form, tipe: e.target.value })}
              className="w-full border-2 border-slate-100 rounded-xl px-3 py-2.5 text-sm focus:border-blue-500 outline-none">
              <option value="MEETING">🤝 Meeting</option>
              <option value="TRAINING">📚 Training</option>
              <option value="SAFETY">🦺 Safety</option>
              <option value="ACARA">🎉 Acara</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Tanggal *</label>
            <input type="date" required value={form.tanggal}
              onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
              className="w-full border-2 border-slate-100 rounded-xl px-3 py-2.5 text-sm focus:border-blue-500 outline-none" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Jam Mulai</label>
            <input type="time" value={form.jam_mulai}
              onChange={(e) => setForm({ ...form, jam_mulai: e.target.value })}
              className="w-full border-2 border-slate-100 rounded-xl px-3 py-2.5 text-sm focus:border-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Jam Selesai</label>
            <input type="time" value={form.jam_selesai}
              onChange={(e) => setForm({ ...form, jam_selesai: e.target.value })}
              className="w-full border-2 border-slate-100 rounded-xl px-3 py-2.5 text-sm focus:border-blue-500 outline-none" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Lokasi</label>
            <input type="text" value={form.lokasi}
              onChange={(e) => setForm({ ...form, lokasi: e.target.value })}
              placeholder="Ruang meeting / Lapangan"
              className="w-full border-2 border-slate-100 rounded-xl px-3 py-2.5 text-sm focus:border-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Site</label>
            <input type="text" value={form.site}
              onChange={(e) => setForm({ ...form, site: e.target.value })}
              placeholder="PPA-MLP"
              className="w-full border-2 border-slate-100 rounded-xl px-3 py-2.5 text-sm focus:border-blue-500 outline-none" />
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">Batal</button>
          <button type="submit" disabled={saving}
            className="flex-1 px-4 py-2.5 bg-[#003D79] text-white rounded-xl text-sm font-bold hover:bg-[#002a57] disabled:opacity-50">
            {saving ? 'Menyimpan...' : '✅ BUAT EVENT'}
          </button>
        </div>
      </form>
    </ModalOverlay>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL: QR DISPLAY (untuk QR Lokasi & Event)
// ═══════════════════════════════════════════════════════════════════════════
function QRDisplayModal({ data, type, onClose }: { data: any; type: 'location' | 'event'; onClose: () => void }) {
  const [qrUrl, setQrUrl] = useState('')
  const token = data.qr_token

  const scanUrl = typeof window !== 'undefined' ? `${window.location.origin}/scan/${token}` : ''
  const title = type === 'location' ? data.nama_lokasi : data.nama_event

  useEffect(() => {
    if (!scanUrl) return
    import('qrcode').then((QRCode) => {
      QRCode.toDataURL(scanUrl, { width: 400, margin: 2, color: { dark: '#003D79', light: '#FFFFFF' } })
        .then((url: string) => setQrUrl(url))
        .catch(console.error)
    })
  }, [scanUrl])

  const downloadQR = () => {
    if (!qrUrl) return
    const link = document.createElement('a')
    link.download = `QR_${title.replace(/[^a-z0-9]/gi, '_')}.png`
    link.href = qrUrl
    link.click()
  }

  const printQR = () => {
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`
      <html><head><title>QR - ${title}</title>
      <style>body{display:flex;justify-content:center;align-items:center;min-height:100vh;flex-direction:column;font-family:Arial}</style>
      </head><body>
        <h2 style="color:#003D79">${title}</h2>
        <img src="${qrUrl}" style="width:400px;height:400px" />
        <p style="font-size:14px;color:#666;margin-top:20px">Scan QR ini untuk absensi</p>
        <p style="font-size:11px;color:#999;margin-top:8px">${scanUrl}</p>
        <script>setTimeout(()=>window.print(),500)</script>
      </body></html>
    `)
    w.document.close()
  }

  const copyUrl = () => {
    navigator.clipboard.writeText(scanUrl).then(() => alert('✅ URL disalin!')).catch(() => {})
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div className="text-center">
        <h2 className="text-lg font-black text-slate-800 mb-1">📱 QR Code</h2>
        <p className="text-sm font-bold text-[#003D79] mb-4">{title}</p>

        {qrUrl ? (
          <img src={qrUrl} alt="QR Code" className="mx-auto w-64 h-64 rounded-xl border-4 border-slate-100 mb-4" />
        ) : (
          <div className="mx-auto w-64 h-64 bg-slate-100 rounded-xl flex items-center justify-center mb-4">
            <span className="animate-spin text-2xl">⏳</span>
          </div>
        )}

        <div className="bg-slate-50 rounded-xl p-3 mb-4">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">URL Scan (bisa Google Lens)</p>
          <p className="text-[11px] text-slate-700 break-all font-mono">{scanUrl}</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button onClick={copyUrl}
            className="px-3 py-2.5 bg-blue-100 text-blue-700 rounded-xl text-[11px] font-bold hover:bg-blue-200">
            📋 Salin URL
          </button>
          <button onClick={downloadQR}
            className="px-3 py-2.5 bg-green-100 text-green-700 rounded-xl text-[11px] font-bold hover:bg-green-200">
            💾 Download
          </button>
          <button onClick={printQR}
            className="px-3 py-2.5 bg-purple-100 text-purple-700 rounded-xl text-[11px] font-bold hover:bg-purple-200">
            🖨️ Print
          </button>
        </div>
      </div>
    </ModalOverlay>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════
function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl p-5 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {children}
      </div>
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div className="text-center py-12 text-gray-500">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#003D79] mb-2"></div>
      <p className="text-sm font-semibold">Memuat data...</p>
    </div>
  )
}

function EmptyState({ icon, msg }: { icon: string; msg: string }) {
  return (
    <div className="text-center py-10 bg-white rounded-2xl border shadow-sm">
      <div className="text-3xl mb-2">{icon}</div>
      <p className="text-sm text-gray-500">{msg}</p>
    </div>
  )
}

function fmtDate(iso: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return iso }
}