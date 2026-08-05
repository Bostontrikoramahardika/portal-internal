'use client'

// ═══════════════════════════════════════════════════════════════════════════
// KELOLA EVENT v2.0 - Chat 35
// 4 TAB: QR Lokasi | Event/Acara | Master Perusahaan | Histori
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/app/lib/AuthContext'

type TabKey = 'qr' | 'event' | 'template' | 'perusahaan' | 'histori'

// Role yang dianggap HO (bisa lihat semua site)
const HO_ROLES = [
  'hr_ho', 'hrga', 'hrga_pusat',
  'director_ops', 'manager_ops', 'business_dev',
  'spv_she_ho', 'admin'
]

function isHORole(roles: string[]): boolean {
  const lower = roles.map((r) => r.toLowerCase())
  return lower.some((r) => HO_ROLES.includes(r))
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════
export default function KelolaEventPage() {
  const { user, isSuperAdmin } = useAuth()
  const [activeTab, setActiveTab] = useState<TabKey>('qr')

  const tabs: { key: TabKey; icon: string; label: string }[] = [
    { key: 'qr',         icon: '📱', label: 'QR Lokasi' },
    { key: 'event',      icon: '📋', label: 'Event / Acara' },
    { key: 'template',   icon: '🔁', label: 'Template Meeting' },
    { key: 'perusahaan', icon: '🏢', label: 'Master Perusahaan' },
    { key: 'histori',    icon: '📜', label: 'Histori' },
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
                ${activeTab === t.key
                  ? 'bg-white text-[#003D79] shadow-lg'
                  : 'bg-white/20 text-white/80 hover:bg-white/30'}`}>
              <span>{t.icon}</span><span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 lg:px-6 lg:py-6">
        {activeTab === 'qr'         && <QRLokasiTab />}
        {activeTab === 'event'      && <EventTab />}
        {activeTab === 'template'   && <TemplateTab />}
        {activeTab === 'perusahaan' && <MasterPerusahaanTab />}
        {activeTab === 'histori'    && <HistoriTab isSuperAdmin={isSuperAdmin} />}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 4: HISTORI EVENT
// ═══════════════════════════════════════════════════════════════════════════
function HistoriTab({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const { user } = useAuth()

  // Ambil roles user dari AuthContext — pakai field permissions sebagai proxy
  // untuk detect HO, kita cek via API /api/auth/me (sudah di-cache di layout)
  // Cara paling simpel: ambil dari window.__user_roles kalau ada,
  // fallback: anggap HO kalau isSuperAdmin
  const [userRoles, setUserRoles] = useState<string[]>([])
  const [isHO, setIsHO] = useState(false)

  // Fetch roles user sekali saat mount
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        const roles: string[] = d.roles || []
        setUserRoles(roles)
        setIsHO(isSuperAdmin || isHORole(roles))
      })
      .catch(() => {
        setIsHO(isSuperAdmin)
      })
  }, [isSuperAdmin])

  // Filter state
  const now = new Date()
  const [filterBulan, setFilterBulan] = useState(String(now.getMonth() + 1).padStart(2, '0'))
  const [filterTahun, setFilterTahun] = useState(String(now.getFullYear()))
  const [filterSite, setFilterSite] = useState('')

  // Data
  const [events, setEvents] = useState<any[]>([])
  const [momSummary, setMomSummary] = useState<Record<string, { total: number; done: number; open: number }>>({})
  const [loading, setLoading] = useState(false)
  const [sites, setSites] = useState<string[]>([])

  // Fetch daftar site (untuk dropdown HO)
  useEffect(() => {
    fetch('/api/employees/sites')
      .then((r) => r.json())
      .then((d) => setSites(d.sites || []))
      .catch(() => {})
  }, [])

  const fetchHistori = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('status', 'SELESAI')

      // Filter site
      if (isHO && filterSite) params.set('site', filterSite)

      const res = await fetch(`/api/events?${params}`)
      const data = await res.json()
      let rows: any[] = data.data || []

      // Filter bulan & tahun di client (lebih simpel daripada API baru)
      if (filterBulan && filterTahun) {
        rows = rows.filter((ev) => {
          if (!ev.tanggal) return false
          const d = new Date(ev.tanggal)
          const bulanMatch = String(d.getMonth() + 1).padStart(2, '0') === filterBulan
          const tahunMatch = String(d.getFullYear()) === filterTahun
          return bulanMatch && tahunMatch
        })
      } else if (filterTahun) {
        rows = rows.filter((ev) => {
          if (!ev.tanggal) return false
          return String(new Date(ev.tanggal).getFullYear()) === filterTahun
        })
      }

      setEvents(rows)

      // Fetch MoM summary untuk setiap event
      if (rows.length > 0) {
        const summaryMap: Record<string, { total: number; done: number; open: number }> = {}
        await Promise.all(
          rows.map(async (ev) => {
            try {
              const r = await fetch(`/api/events/${ev.id}/mom`)
              const d = await r.json()
              const mom: any[] = d.mom || []
              summaryMap[ev.id] = {
                total: mom.length,
                done: mom.filter((m) => m.status === 'DONE').length,
                open: mom.filter((m) => m.status === 'OPEN' || m.status === 'IN_PROGRESS').length,
              }
            } catch {
              summaryMap[ev.id] = { total: 0, done: 0, open: 0 }
            }
          })
        )
        setMomSummary(summaryMap)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [isHO, filterSite, filterBulan, filterTahun])

  useEffect(() => {
    fetchHistori()
  }, [fetchHistori])

  // Generate opsi tahun (3 tahun ke belakang + tahun ini)
  const tahunOptions = Array.from({ length: 4 }, (_, i) => String(now.getFullYear() - i))

  const bulanOptions = [
    { value: '', label: 'Semua Bulan' },
    { value: '01', label: 'Januari' }, { value: '02', label: 'Februari' },
    { value: '03', label: 'Maret' },   { value: '04', label: 'April' },
    { value: '05', label: 'Mei' },     { value: '06', label: 'Juni' },
    { value: '07', label: 'Juli' },    { value: '08', label: 'Agustus' },
    { value: '09', label: 'September' },{ value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },{ value: '12', label: 'Desember' },
  ]

  const tipeEmoji: Record<string, string> = {
    MEETING: '🤝', TRAINING: '📚', ACARA: '🎉', SAFETY: '🦺'
  }

  return (
    <div className="space-y-4">

      {/* FILTER BAR */}
      <div className="bg-white rounded-2xl border shadow-sm p-4">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-wide mb-3">🔍 Filter Histori</p>
        <div className="flex flex-wrap gap-2">

          {/* Bulan */}
          <select
            value={filterBulan}
            onChange={(e) => setFilterBulan(e.target.value)}
            className="border-2 border-slate-100 rounded-xl px-3 py-2 text-xs font-bold focus:border-blue-500 outline-none bg-white"
          >
            {bulanOptions.map((b) => (
              <option key={b.value} value={b.value}>{b.label}</option>
            ))}
          </select>

          {/* Tahun */}
          <select
            value={filterTahun}
            onChange={(e) => setFilterTahun(e.target.value)}
            className="border-2 border-slate-100 rounded-xl px-3 py-2 text-xs font-bold focus:border-blue-500 outline-none bg-white"
          >
            {tahunOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          {/* Site — hanya untuk HO */}
          {isHO && (
            <select
              value={filterSite}
              onChange={(e) => setFilterSite(e.target.value)}
              className="border-2 border-slate-100 rounded-xl px-3 py-2 text-xs font-bold focus:border-blue-500 outline-none bg-white"
            >
              <option value="">🏢 Semua Site</option>
              {sites.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}

          <button
            onClick={fetchHistori}
            className="px-4 py-2 bg-[#003D79] text-white rounded-xl text-xs font-bold hover:bg-[#002a57] transition-all"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* SUMMARY COUNT */}
      {!loading && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-black text-slate-600">
            📜 {events.length} event selesai
            {filterBulan
              ? ` • ${bulanOptions.find((b) => b.value === filterBulan)?.label} ${filterTahun}`
              : ` • ${filterTahun}`}
            {isHO && filterSite ? ` • ${filterSite}` : ''}
          </p>
        </div>
      )}

      {/* LIST */}
      {loading ? (
        <LoadingSpinner />
      ) : events.length === 0 ? (
        <EmptyState icon="📜" msg="Tidak ada event selesai di periode ini" />
      ) : (
        <div className="space-y-3">
          {events.map((ev) => {
            const mom = momSummary[ev.id]
            return (
              <div key={ev.id}
                className="bg-white rounded-2xl border shadow-sm p-4 hover:shadow-md transition-all">

                {/* Header card */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <span className="text-2xl shrink-0">{tipeEmoji[ev.tipe] || '📋'}</span>
                    <div className="min-w-0">
                      <h3 className="font-black text-slate-800 text-sm leading-tight">{ev.nama_event}</h3>
                      {ev.deskripsi && (
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{ev.deskripsi}</p>
                      )}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap border bg-blue-100 text-blue-700 border-blue-300 shrink-0">
                    ✅ SELESAI
                  </span>
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-500 mb-3">
                  <div>📅 {fmtDate(ev.tanggal)}</div>
                  <div>⏰ {ev.jam_mulai || '-'} – {ev.jam_selesai || '-'}</div>
                  <div>📍 {ev.nama_lokasi || ev.lokasi || '-'}</div>
                  <div>🏢 {ev.site || '-'}</div>
                </div>

                {/* Stats row */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="bg-blue-50 text-[#003D79] px-2.5 py-1 rounded-full text-[11px] font-black">
                    👥 {ev.total_hadir} hadir
                  </span>

                  {/* MoM summary */}
                  {mom && mom.total > 0 ? (
                    <>
                      <span className="bg-slate-50 text-slate-600 px-2.5 py-1 rounded-full text-[11px] font-bold border">
                        📋 {mom.total} action item
                      </span>
                      {mom.done > 0 && (
                        <span className="bg-green-50 text-green-700 px-2.5 py-1 rounded-full text-[11px] font-bold border border-green-200">
                          ✅ {mom.done} done
                        </span>
                      )}
                      {mom.open > 0 && (
                        <span className="bg-yellow-50 text-yellow-700 px-2.5 py-1 rounded-full text-[11px] font-bold border border-yellow-200">
                          🟡 {mom.open} open
                        </span>
                      )}
                    </>
                  ) : mom && mom.total === 0 ? (
                    <span className="bg-slate-50 text-slate-400 px-2.5 py-1 rounded-full text-[11px] font-bold border">
                      📋 Tanpa MoM
                    </span>
                  ) : null}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    oleh {ev.created_by_nama || ev.created_by}
                  </span>
                  <div className="flex gap-2">
                    <a
                      href={`/api/events/${ev.id}/export`}
                      className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-[10px] font-bold hover:bg-green-200 transition-all"
                    >
                      📊 Excel
                    </a>
                    <a
                      href={`/dashboard/kelola-event/${ev.id}`}
                      className="px-3 py-1.5 bg-[#003D79] text-white rounded-lg text-[10px] font-bold hover:bg-[#002a57] transition-all"
                    >
                      Lihat Detail →
                    </a>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
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
  const [statusFilter, setStatusFilter] = useState('SEMUA_AKTIF')
  const [qrModal, setQrModal] = useState<any>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      // SEMUA_AKTIF = filter multi-status di client
      if (statusFilter && statusFilter !== 'SEMUA_AKTIF') {
        params.set('status', statusFilter)
      }
      const res = await fetch(`/api/events?${params}`)
      const data = await res.json()
      let rows = data.data || []
      if (statusFilter === 'SEMUA_AKTIF') {
        // Filter aktif = DRAFT + CONFIRMED + AKTIF + POSTPONED (yang masih perlu perhatian)
        rows = rows.filter((r: any) => 
          ['DRAFT', 'CONFIRMED', 'AKTIF', 'POSTPONED', 'PENDING_CONFIRM'].includes(r.status)
        )
      }
      setEvents(rows)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [statusFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const handleCancel = async (id: string) => {
    if (!confirm('Batalkan event ini?')) return
    await fetch(`/api/events/${id}`, { method: 'DELETE' })
    fetchData()
  }

  // ═══ Handler untuk confirm/cancel/postpone ═══
  const handleConfirmAction = async (ev: any, action: 'CONFIRM' | 'CANCEL' | 'POSTPONE') => {
    let reason: string | null = null
    let new_date: string | null = null

    if (action === 'CANCEL') {
      reason = prompt(`❌ Batalkan event "${ev.nama_event}"?\n\nAlasan (opsional):`)
      if (reason === null) return  // user cancel prompt
    }

    if (action === 'POSTPONE') {
      new_date = prompt(`📅 Undur event "${ev.nama_event}" ke tanggal baru (YYYY-MM-DD):`, ev.tanggal)
      if (!new_date) return
      if (!/^\d{4}-\d{2}-\d{2}$/.test(new_date)) {
        alert('❌ Format tanggal salah. Contoh: 2026-09-15')
        return
      }
      reason = prompt('Alasan pengunduran (opsional):') || null
    }

    if (action === 'CONFIRM') {
      if (!confirm(`✅ Konfirmasi event "${ev.nama_event}"?\n\nSemua undangan yang connect Google akan otomatis dapat event di Google Calendar mereka.`)) return
    }

    try {
      const res = await fetch(`/api/events/${ev.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason, new_date })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      alert('✅ ' + json.message)
      fetchData()
    } catch (err: any) {
      alert('❌ ' + err.message)
    }
  }

  const tipeEmoji: Record<string, string> = {
    MEETING: '🤝', TRAINING: '📚', ACARA: '🎉', SAFETY: '🦺'
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'SEMUA_AKTIF', label: 'Semua Aktif', icon: '📋' },
            { key: 'DRAFT', label: 'Draft', icon: '📝' },
            { key: 'CONFIRMED', label: 'Confirmed', icon: '✅' },
            { key: 'AKTIF', label: 'Berlangsung', icon: '🟢' },
            { key: 'SELESAI', label: 'Selesai', icon: '📜' },
            { key: 'CANCELLED', label: 'Dibatalkan', icon: '❌' },
            { key: 'POSTPONED', label: 'Diundur', icon: '📅' },
          ].map((s) => (
            <button key={s.key} onClick={() => setStatusFilter(s.key)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all whitespace-nowrap
                ${statusFilter === s.key
                  ? 'bg-[#003D79] text-white shadow'
                  : 'bg-white text-slate-600 border hover:bg-slate-50'}`}>
              {s.icon} {s.label}
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
                  ${
                    ev.status === 'DRAFT' ? 'bg-slate-100 text-slate-700 border-slate-300' :
                    ev.status === 'PENDING_CONFIRM' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                    ev.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-700 border-emerald-300' :
                    ev.status === 'AKTIF' ? 'bg-green-100 text-green-700 border-green-300' :
                    ev.status === 'SELESAI' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                    ev.status === 'POSTPONED' ? 'bg-orange-100 text-orange-700 border-orange-300' :
                    ev.status === 'CANCELLED' ? 'bg-red-100 text-red-700 border-red-300' :
                    'bg-slate-100 text-slate-600 border-slate-300'
                  }`}>
                  {
                    ev.status === 'DRAFT' ? '📝 DRAFT' :
                    ev.status === 'PENDING_CONFIRM' ? '⏳ MENUNGGU' :
                    ev.status === 'CONFIRMED' ? '✅ CONFIRMED' :
                    ev.status === 'AKTIF' ? '🟢 AKTIF' :
                    ev.status === 'SELESAI' ? '📜 SELESAI' :
                    ev.status === 'POSTPONED' ? '📅 DIUNDUR' :
                    ev.status === 'CANCELLED' ? '❌ DIBATALKAN' :
                    ev.status
                  }
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

              <div className="flex gap-2 flex-wrap">
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

                {/* ═══ Tombol confirm untuk DRAFT/PENDING_CONFIRM ═══ */}
                {(ev.status === 'DRAFT' || ev.status === 'PENDING_CONFIRM') && (
                  <>
                    <button onClick={() => handleConfirmAction(ev, 'CONFIRM')}
                      className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold hover:bg-emerald-200 ml-auto">
                      ✅ Confirm
                    </button>
                    <button onClick={() => handleConfirmAction(ev, 'POSTPONE')}
                      className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg text-[10px] font-bold hover:bg-orange-200">
                      📅 Undur
                    </button>
                    <button onClick={() => handleConfirmAction(ev, 'CANCEL')}
                      className="px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-[10px] font-bold hover:bg-red-200">
                      ❌ Batal
                    </button>
                  </>
                )}

                {/* Tombol cancel untuk CONFIRMED/AKTIF */}
                {(ev.status === 'CONFIRMED' || ev.status === 'AKTIF') && (
                  <button onClick={() => handleConfirmAction(ev, 'CANCEL')}
                    className="px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-[10px] font-bold hover:bg-red-200 ml-auto">
                    ❌ Batal
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
function CreateQRModal({ sites, onClose, onSuccess }: {
  sites: string[]; onClose: () => void; onSuccess: () => void
}) {
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
          <button type="button" onClick={onClose}
            className="flex-1 px-4 py-2.5 border-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">
            Batal
          </button>
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
          <select value={form.qr_location_id}
            onChange={(e) => setForm({ ...form, qr_location_id: e.target.value })}
            className="w-full border-2 border-slate-100 rounded-xl px-3 py-2.5 text-sm focus:border-blue-500 outline-none">
            <option value="">📱 Standalone (QR tersendiri)</option>
            {qrLocations.map((l) => (
              <option key={l.id} value={l.id}>📍 {l.nama_lokasi} ({l.site})</option>
            ))}
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
          <button type="button" onClick={onClose}
            className="flex-1 px-4 py-2.5 border-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">
            Batal
          </button>
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
// MODAL: QR DISPLAY
// ═══════════════════════════════════════════════════════════════════════════
function QRDisplayModal({ data, type, onClose }: {
  data: any; type: 'location' | 'event'; onClose: () => void
}) {
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
    navigator.clipboard.writeText(scanUrl)
      .then(() => alert('✅ URL disalin!'))
      .catch(() => {})
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div className="text-center">
        <h2 className="text-lg font-black text-slate-800 mb-1">📱 QR Code</h2>
        <p className="text-sm font-bold text-[#003D79] mb-4">{title}</p>

        {qrUrl ? (
          <img src={qrUrl} alt="QR Code"
            className="mx-auto w-64 h-64 rounded-xl border-4 border-slate-100 mb-4" />
        ) : (
          <div className="mx-auto w-64 h-64 bg-slate-100 rounded-xl flex items-center justify-center mb-4">
            <span className="animate-spin text-2xl">⏳</span>
          </div>
        )}

        <div className="bg-slate-50 rounded-xl p-3 mb-4">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">URL Scan</p>
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
// TAB 5: TEMPLATE MEETING (Recurring)
// ═══════════════════════════════════════════════════════════════════════════
const DAY_LABELS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const DAY_FULL = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const MONTH_LABELS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

function TemplateTab() {
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [generating, setGenerating] = useState<any>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/event-templates')
      const json = await res.json()
      if (json.success) setTemplates(json.data || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string, nama: string) => {
    if (!confirm(`Nonaktifkan template "${nama}"?\n\nEvent yang sudah di-generate TIDAK akan terhapus.`)) return
    try {
      const res = await fetch(`/api/event-templates/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        alert('✅ ' + json.message)
        load()
      } else {
        alert('❌ ' + (json.error || 'Gagal'))
      }
    } catch { alert('❌ Error jaringan') }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-black text-slate-700 uppercase tracking-wide">
          🔁 Template Recurring ({templates.length})
        </h2>
        <button onClick={() => { setEditing(null); setShowForm(true) }}
          className="px-4 py-2 bg-[#003D79] text-white rounded-xl text-xs font-bold hover:bg-[#002a57] shadow-lg">
          ➕ Template Baru
        </button>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800 flex items-start gap-2">
        <span className="text-lg">💡</span>
        <div>
          <strong>Template = recurring meeting.</strong> Sekali setup, klik <strong>🚀 Generate</strong> untuk buat events bulanan otomatis. Event yang di-generate berstatus <strong>DRAFT</strong>, menunggu konfirmasi admin H-2.
        </div>
      </div>

      {loading ? <LoadingSpinner /> : !templates.length ? (
        <EmptyState icon="🔁" msg="Belum ada template. Klik 'Template Baru' untuk buat pertama!" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {templates.map(tpl => (
            <div key={tpl.id} className="bg-white rounded-2xl border shadow-sm p-4 hover:shadow-md transition-all">
              <div className="flex items-start gap-2 mb-2">
                <span className="text-2xl shrink-0">📊</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-slate-800 text-sm leading-tight">{tpl.nama}</h3>
                  {tpl.deskripsi && (
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{tpl.deskripsi}</p>
                  )}
                </div>
              </div>

              {/* Recurring days */}
              <div className="flex gap-1 mb-2 flex-wrap">
                {(tpl.recurring_days || []).map((d: number) => (
                  <span key={d} className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                    {DAY_LABELS[d]}
                  </span>
                ))}
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-500 mb-3">
                {(tpl.default_jam_mulai || tpl.default_jam_selesai) && (
                  <div>⏰ {tpl.default_jam_mulai?.slice(0, 5) || '?'} – {tpl.default_jam_selesai?.slice(0, 5) || '?'}</div>
                )}
                {tpl.default_lokasi && <div>📍 {tpl.default_lokasi}</div>}
                {tpl.default_site && <div>🏢 {tpl.default_site}</div>}
                <div>🔔 H-{tpl.reminder_h_minus} reminder</div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button onClick={() => setGenerating(tpl)}
                  className="flex-1 px-3 py-2 bg-[#003D79] text-white rounded-lg text-[11px] font-bold hover:bg-[#002a57] flex items-center justify-center gap-1">
                  🚀 Generate
                </button>
                <button onClick={() => { setEditing(tpl); setShowForm(true) }}
                  className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-[11px] font-bold hover:bg-slate-200">
                  ✏️
                </button>
                <button onClick={() => handleDelete(tpl.id, tpl.nama)}
                  className="px-3 py-2 bg-red-100 text-red-600 rounded-lg text-[11px] font-bold hover:bg-red-200">
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <TemplateFormModal
          template={editing}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSuccess={() => { setShowForm(false); setEditing(null); load() }}
        />
      )}
      {generating && (
        <GenerateEventsModal
          template={generating}
          onClose={() => setGenerating(null)}
          onSuccess={() => setGenerating(null)}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL: FORM TEMPLATE (Create/Edit)
// ═══════════════════════════════════════════════════════════════════════════
function TemplateFormModal({ template, onClose, onSuccess }: {
  template: any | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [form, setForm] = useState({
    nama: template?.nama || '',
    deskripsi: template?.deskripsi || '',
    tipe: template?.tipe || 'MEETING',
    recurring_days: (template?.recurring_days || []) as number[],
    default_jam_mulai: template?.default_jam_mulai?.slice(0, 5) || '',
    default_jam_selesai: template?.default_jam_selesai?.slice(0, 5) || '',
    default_lokasi: template?.default_lokasi || '',
    default_site: template?.default_site || '',
    reminder_h_minus: template?.reminder_h_minus ?? 2
  })
  const [saving, setSaving] = useState(false)

  const toggleDay = (d: number) => {
    setForm(f => ({
      ...f,
      recurring_days: f.recurring_days.includes(d)
        ? f.recurring_days.filter(x => x !== d)
        : [...f.recurring_days, d].sort()
    }))
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    if (!form.nama.trim()) return alert('❌ Nama wajib diisi')
    if (form.recurring_days.length === 0) return alert('❌ Pilih minimal 1 hari')

    setSaving(true)
    try {
      const url = template ? `/api/event-templates/${template.id}` : '/api/event-templates'
      const method = template ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      alert('✅ ' + json.message)
      onSuccess()
    } catch (err: any) { alert('❌ ' + err.message) }
    finally { setSaving(false) }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="text-lg font-black text-slate-800 mb-4">
        {template ? '✏️ Edit Template' : '➕ Template Meeting Baru'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Nama Meeting *</label>
          <input type="text" required value={form.nama}
            onChange={(e) => setForm({ ...form, nama: e.target.value })}
            placeholder="Contoh: KPI HO Weekly Zoom"
            className="w-full border-2 border-slate-100 rounded-xl px-3 py-2.5 text-sm focus:border-blue-500 outline-none" />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Deskripsi</label>
          <textarea value={form.deskripsi} rows={2}
            onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
            placeholder="Deskripsi opsional..."
            className="w-full border-2 border-slate-100 rounded-xl px-3 py-2.5 text-sm focus:border-blue-500 outline-none resize-none" />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Hari Recurring *</label>
          <div className="grid grid-cols-7 gap-1">
            {DAY_LABELS.map((label, idx) => (
              <button key={idx} type="button" onClick={() => toggleDay(idx)}
                className={`py-2 rounded-lg text-[10px] font-black transition-all ${
                  form.recurring_days.includes(idx)
                    ? 'bg-[#003D79] text-white shadow-md'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}>
                {label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            {form.recurring_days.length === 0
              ? 'Belum pilih hari'
              : `Setiap: ${form.recurring_days.map(d => DAY_FULL[d]).join(', ')}`
            }
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Jam Mulai</label>
            <input type="time" value={form.default_jam_mulai}
              onChange={(e) => setForm({ ...form, default_jam_mulai: e.target.value })}
              className="w-full border-2 border-slate-100 rounded-xl px-3 py-2.5 text-sm focus:border-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Jam Selesai</label>
            <input type="time" value={form.default_jam_selesai}
              onChange={(e) => setForm({ ...form, default_jam_selesai: e.target.value })}
              className="w-full border-2 border-slate-100 rounded-xl px-3 py-2.5 text-sm focus:border-blue-500 outline-none" />
          </div>
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
            <label className="block text-xs font-bold text-slate-600 mb-1">Reminder H-</label>
            <input type="number" min={0} max={7} value={form.reminder_h_minus}
              onChange={(e) => setForm({ ...form, reminder_h_minus: Number(e.target.value) })}
              className="w-full border-2 border-slate-100 rounded-xl px-3 py-2.5 text-sm focus:border-blue-500 outline-none" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Lokasi Default</label>
          <input type="text" value={form.default_lokasi}
            onChange={(e) => setForm({ ...form, default_lokasi: e.target.value })}
            placeholder="Zoom Link / Meeting Room / Lapangan"
            className="w-full border-2 border-slate-100 rounded-xl px-3 py-2.5 text-sm focus:border-blue-500 outline-none" />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Site</label>
          <input type="text" value={form.default_site}
            onChange={(e) => setForm({ ...form, default_site: e.target.value })}
            placeholder="PPA-MLP"
            className="w-full border-2 border-slate-100 rounded-xl px-3 py-2.5 text-sm focus:border-blue-500 outline-none" />
        </div>

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose}
            className="flex-1 px-4 py-2.5 border-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">
            Batal
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 px-4 py-2.5 bg-[#003D79] text-white rounded-xl text-sm font-bold hover:bg-[#002a57] disabled:opacity-50">
            {saving ? 'Menyimpan...' : (template ? '✅ Update' : '✅ Simpan')}
          </button>
        </div>
      </form>
    </ModalOverlay>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL: GENERATE EVENTS FROM TEMPLATE
// ═══════════════════════════════════════════════════════════════════════════
function GenerateEventsModal({ template, onClose, onSuccess }: {
  template: any
  onClose: () => void
  onSuccess: () => void
}) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [generating, setGenerating] = useState(false)
  const [preview, setPreview] = useState<string[]>([])

  useEffect(() => {
    const dates: string[] = []
    const daysInMonth = new Date(year, month, 0).getDate()
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day)
      if ((template.recurring_days || []).includes(date.getDay())) {
        const label = date.toLocaleDateString('id-ID', { 
          weekday: 'short', day: '2-digit', month: 'short' 
        })
        dates.push(label)
      }
    }
    setPreview(dates)
  }, [year, month, template.recurring_days])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await fetch(`/api/event-templates/${template.id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, month })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      alert('✅ ' + json.message)
      onSuccess()
    } catch (err: any) { alert('❌ ' + err.message) }
    finally { setGenerating(false) }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="text-lg font-black text-slate-800 mb-4">🚀 Generate Events</h2>

      <div className="bg-blue-50 rounded-xl p-3 mb-4">
        <div className="text-[10px] font-black text-blue-700 uppercase">Template</div>
        <div className="text-sm font-black text-[#003D79]">{template.nama}</div>
        <div className="text-[10px] text-slate-500 mt-1">
          Setiap: {(template.recurring_days || []).map((d: number) => DAY_FULL[d]).join(', ')}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Bulan</label>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
            className="w-full border-2 border-slate-100 rounded-xl px-3 py-2.5 text-sm focus:border-blue-500 outline-none">
            {MONTH_LABELS.map((label, idx) => (
              <option key={idx} value={idx + 1}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Tahun</label>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}
            className="w-full border-2 border-slate-100 rounded-xl px-3 py-2.5 text-sm focus:border-blue-500 outline-none">
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1, now.getFullYear() + 2].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl p-3 mb-4">
        <div className="text-[10px] font-black text-slate-500 uppercase mb-2">
          ℹ️ Akan generate {preview.length} events:
        </div>
        {preview.length === 0 ? (
          <div className="text-xs text-slate-400 italic">Tidak ada tanggal match untuk bulan ini</div>
        ) : (
          <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-700 font-bold max-h-32 overflow-y-auto">
            {preview.map((d, i) => (
              <div key={i} className="bg-white rounded px-2 py-1">• {d}</div>
            ))}
          </div>
        )}
        <div className="text-[9px] text-amber-700 mt-2 flex items-start gap-1">
          <span>⚠️</span>
          <span>Status awal: <strong>DRAFT</strong>. Perlu konfirmasi admin H-{template.reminder_h_minus} sebelum sync ke Google Calendar.</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={onClose}
          className="flex-1 px-4 py-2.5 border-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">
          Batal
        </button>
        <button onClick={handleGenerate} disabled={generating || preview.length === 0}
          className="flex-1 px-4 py-2.5 bg-[#003D79] text-white rounded-xl text-sm font-bold hover:bg-[#002a57] disabled:opacity-50 flex items-center justify-center gap-2">
          {generating ? '...' : '🚀 Generate'}
        </button>
      </div>
    </ModalOverlay>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════
function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
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
    return new Date(iso).toLocaleDateString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric'
    })
  } catch { return iso }
}