'use client'

import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '@/app/lib/AuthContext'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════
type TabKey = 'monitoring' | 'tiket'

type MonitoringItem = {
  nrp: string
  nama: string
  jabatan: string
  departemen: string
  site: string
  total_hari_cr: number
  tanggal_cr_pertama: string
  tanggal_cr_terakhir: string
  status: 'BELUM_AJUKAN' | 'MENUNGGU' | 'DISETUJUI' | 'DITOLAK'
  badge: string
  tanggal_ajukan: string | null
  tanggal_cuti_mulai: string | null
  tanggal_cuti_selesai: string | null
  leave_request_id: string | null
}

type TiketItem = {
  id: string
  leave_request_id: string
  nrp: string
  nama: string
  jabatan: string
  site: string
  trip_type: string
  tanggal: string
  tujuan: string
  status: string
  catatan?: string
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════
export default function DashboardCutiPage() {
  const { user, isSuperAdmin } = useAuth()
  const [activeTab, setActiveTab] = useState<TabKey>('monitoring')

  // Filter
  const now = new Date()
  const [bulan, setBulan] = useState(String(now.getMonth() + 1).padStart(2, '0'))
  const [tahun, setTahun] = useState(String(now.getFullYear()))
  const [site, setSite] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  // Data
  const [monitoringData, setMonitoringData] = useState<MonitoringItem[]>([])
  const [tiketData, setTiketData] = useState<TiketItem[]>([])
  const [monitoringStats, setMonitoringStats] = useState<any>({})
  const [tiketStats, setTiketStats] = useState<any>({})
  const [sites, setSites] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  // Role scope
  const userRoles = (user?.roles || []).map((r: string) => r.toLowerCase())
  const isHOScope =
    isSuperAdmin ||
    userRoles.some((r: string) =>
      ['hr_ho', 'hrga', 'hrga_pusat', 'admin',
       'director_ops', 'manager_ops', 'business_dev', 'spv_she_ho'].includes(r)
    )
  const userSite = user?.scope_site || user?.site || ''
  const siteFilterLocked = !isHOScope

  useEffect(() => {
    if (siteFilterLocked && userSite) setSite(userSite)
  }, [siteFilterLocked, userSite])

  // ═════ FETCH DATA ═══════════════════════════════════════════════════════
  const fetchData = async () => {
    setLoading(true)
    try {
      if (activeTab === 'monitoring') {
        const params = new URLSearchParams({
          periode: `${tahun}-${bulan}`,
          ...(site && { site }),
        })
        const res = await fetch(`/api/monitoring-roster-cr?${params}`)
        const data = await res.json()
        setMonitoringData(data.data || [])
        setMonitoringStats(data.stats || {})
        if (data.sites?.length) setSites(data.sites)
      } else {
        const params = new URLSearchParams({
          bulan, tahun,
          ...(site && { site }),
        })
        const res = await fetch(`/api/monitoring-cuti?${params}`)
        const data = await res.json()
        setTiketData(data.tiket || [])
        setTiketStats(data.stats || {})
        if (data.sites?.length) setSites(data.sites)
      }
    } catch (err) {
      console.error('[dashboard-cuti] fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, bulan, tahun, site])

  // ═════ FILTER LOCAL ═══════════════════════════════════════════════════
  const filteredMonitoring = useMemo(() => {
    let result = monitoringData
    if (statusFilter) result = result.filter((m) => m.status === statusFilter)
    if (search) {
      const s = search.toLowerCase()
      result = result.filter(
        (m) =>
          m.nama?.toLowerCase().includes(s) ||
          m.nrp?.toLowerCase().includes(s) ||
          m.jabatan?.toLowerCase().includes(s)
      )
    }
    return result
  }, [monitoringData, search, statusFilter])

  const filteredTiket = useMemo(() => {
    let result = tiketData
    if (statusFilter) result = result.filter((t) => t.status === statusFilter)
    if (search) {
      const s = search.toLowerCase()
      result = result.filter(
        (t) =>
          t.nama?.toLowerCase().includes(s) ||
          t.nrp?.toLowerCase().includes(s) ||
          t.tujuan?.toLowerCase().includes(s)
      )
    }
    return result
  }, [tiketData, search, statusFilter])

  const namaBulan = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ]

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="p-3 md:p-4 space-y-3">
      {/* ═════ HEADER + TABS ═════════════════════════════════════════════ */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white p-5 shadow-lg">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl">
            🌴
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Dashboard Cuti</h1>
            <p className="text-white/80 text-xs">
              Monitoring Cuti & Manajemen Tiket
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setActiveTab('monitoring'); setStatusFilter('') }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'monitoring'
                ? 'bg-white text-blue-700 shadow'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            🌴 Monitoring Cuti
          </button>
          <button
            onClick={() => { setActiveTab('tiket'); setStatusFilter('') }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'tiket'
                ? 'bg-white text-blue-700 shadow'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            ✈️ Tiket
          </button>
        </div>
      </div>

      {/* ═════ FILTER GLOBAL ═════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl shadow-sm border p-3">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <select
            value={bulan}
            onChange={(e) => setBulan(e.target.value)}
            className="border rounded-lg px-2 py-1.5 text-xs md:text-sm"
          >
            {namaBulan.map((n, i) => (
              <option key={i} value={String(i + 1).padStart(2, '0')}>
                📅 {n}
              </option>
            ))}
          </select>

          <select
            value={tahun}
            onChange={(e) => setTahun(e.target.value)}
            className="border rounded-lg px-2 py-1.5 text-xs md:text-sm"
          >
            {[2025, 2026, 2027, 2028].map((y) => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>

          <select
            value={site}
            onChange={(e) => setSite(e.target.value)}
            disabled={siteFilterLocked}
            className={`border rounded-lg px-2 py-1.5 text-xs md:text-sm ${
              siteFilterLocked ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          >
            <option value="">🏢 Semua Site</option>
            {sites.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {activeTab === 'monitoring' ? (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded-lg px-2 py-1.5 text-xs md:text-sm"
            >
              <option value="">📋 Semua Status</option>
              <option value="BELUM_AJUKAN">⚠️ Belum Ajukan</option>
              <option value="MENUNGGU">⏳ Menunggu</option>
              <option value="DISETUJUI">✅ Disetujui</option>
              <option value="DITOLAK">❌ Ditolak</option>
            </select>
          ) : (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded-lg px-2 py-1.5 text-xs md:text-sm"
            >
              <option value="">📋 Semua Status</option>
              <option value="MENUNGGU_PEMESANAN">⏳ Menunggu Pesan</option>
              <option value="SUDAH_DIPESAN">✅ Sudah Dipesan</option>
              <option value="E_TICKET_TERKIRIM">📧 E-Ticket Terkirim</option>
              <option value="SELESAI">🎉 Selesai</option>
              <option value="DIBATALKAN">❌ Dibatalkan</option>
            </select>
          )}

          <input
            type="text"
            placeholder="🔍 Cari nama / NRP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded-lg px-2 py-1.5 text-xs md:text-sm"
          />
        </div>
        {siteFilterLocked && (
          <p className="text-[10px] text-gray-500 mt-1.5">
            🔒 Site di-lock ke <strong>{userSite}</strong>
          </p>
        )}
      </div>

      {/* ═════ STATS CARDS (CLICKABLE) ═══════════════════════════════════ */}
      {activeTab === 'monitoring' ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <StatCard
            color="blue"
            label="Total CR"
            value={monitoringStats.total_karyawan || 0}
            icon="👥"
            active={statusFilter === ''}
            onClick={() => setStatusFilter('')}
          />
          <StatCard
            color="green"
            label="Sudah Ajukan"
            value={monitoringStats.sudah_ajukan || 0}
            icon="✅"
            active={statusFilter === 'DISETUJUI'}
            onClick={() => setStatusFilter(statusFilter === 'DISETUJUI' ? '' : 'DISETUJUI')}
          />
          <StatCard
            color="yellow"
            label="Menunggu"
            value={monitoringStats.menunggu || 0}
            icon="⏳"
            active={statusFilter === 'MENUNGGU'}
            onClick={() => setStatusFilter(statusFilter === 'MENUNGGU' ? '' : 'MENUNGGU')}
          />
          <StatCard
            color="orange"
            label="Belum Ajukan"
            value={monitoringStats.belum_ajukan || 0}
            icon="⚠️"
            active={statusFilter === 'BELUM_AJUKAN'}
            onClick={() => setStatusFilter(statusFilter === 'BELUM_AJUKAN' ? '' : 'BELUM_AJUKAN')}
          />
          <StatCard
            color="red"
            label="Ditolak"
            value={monitoringStats.ditolak || 0}
            icon="❌"
            active={statusFilter === 'DITOLAK'}
            onClick={() => setStatusFilter(statusFilter === 'DITOLAK' ? '' : 'DITOLAK')}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <StatCard
            color="blue"
            label="Total Tiket"
            value={tiketStats.total_tiket || 0}
            icon="✈️"
            active={statusFilter === ''}
            onClick={() => setStatusFilter('')}
          />
          <StatCard
            color="orange"
            label="Menunggu Pesan"
            value={tiketStats.tiket_menunggu || 0}
            icon="⏳"
            active={statusFilter === 'MENUNGGU_PEMESANAN'}
            onClick={() => setStatusFilter(statusFilter === 'MENUNGGU_PEMESANAN' ? '' : 'MENUNGGU_PEMESANAN')}
          />
          <StatCard
            color="green"
            label="Sudah Dipesan"
            value={tiketStats.tiket_dipesan || 0}
            icon="✅"
            active={statusFilter === 'SUDAH_DIPESAN'}
            onClick={() => setStatusFilter(statusFilter === 'SUDAH_DIPESAN' ? '' : 'SUDAH_DIPESAN')}
          />
          <StatCard
            color="purple"
            label="E-Ticket Terkirim"
            value={tiketStats.tiket_terkirim || 0}
            icon="📧"
            active={statusFilter === 'E_TICKET_TERKIRIM'}
            onClick={() => setStatusFilter(statusFilter === 'E_TICKET_TERKIRIM' ? '' : 'E_TICKET_TERKIRIM')}
          />
        </div>
      )}

      {/* ═════ CONTENT TABLE ═════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="text-center py-10 text-gray-500">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mb-2"></div>
            <p className="text-sm">Memuat data...</p>
          </div>
        ) : activeTab === 'monitoring' ? (
          <MonitoringTable
            data={filteredMonitoring}
            totalRaw={monitoringData.length}
            activeFilter={statusFilter}
          />
        ) : (
          <TiketTable
            data={filteredTiket}
            totalRaw={tiketData.length}
            activeFilter={statusFilter}
            onRefresh={fetchData}
          />
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// STAT CARD (CLICKABLE)
// ═══════════════════════════════════════════════════════════════════════════
function StatCard({
  color, label, value, icon, active, onClick,
}: {
  color: 'blue' | 'green' | 'yellow' | 'orange' | 'red' | 'purple'
  label: string
  value: number
  icon: string
  active: boolean
  onClick: () => void
}) {
  const colorMap: Record<string, { bg: string; text: string; ring: string }> = {
    blue: { bg: 'bg-blue-50 hover:bg-blue-100', text: 'text-blue-700', ring: 'ring-blue-500' },
    green: { bg: 'bg-green-50 hover:bg-green-100', text: 'text-green-700', ring: 'ring-green-500' },
    yellow: { bg: 'bg-yellow-50 hover:bg-yellow-100', text: 'text-yellow-700', ring: 'ring-yellow-500' },
    orange: { bg: 'bg-orange-50 hover:bg-orange-100', text: 'text-orange-700', ring: 'ring-orange-500' },
    red: { bg: 'bg-red-50 hover:bg-red-100', text: 'text-red-700', ring: 'ring-red-500' },
    purple: { bg: 'bg-purple-50 hover:bg-purple-100', text: 'text-purple-700', ring: 'ring-purple-500' },
  }
  const c = colorMap[color]

  return (
    <button
      onClick={onClick}
      className={`${c.bg} ${c.text} rounded-lg border p-2.5 text-left transition-all ${
        active ? `ring-2 ${c.ring} shadow-md scale-[1.02]` : 'hover:shadow-sm'
      }`}
    >
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
          {label}
        </span>
        <span className="text-base">{icon}</span>
      </div>
      <div className="text-2xl font-bold leading-tight">{value}</div>
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TABLE: MONITORING
// ═══════════════════════════════════════════════════════════════════════════
function MonitoringTable({
  data, totalRaw, activeFilter,
}: {
  data: MonitoringItem[]
  totalRaw: number
  activeFilter: string
}) {
  if (!data.length) {
    return (
      <div className="text-center py-10 text-gray-500">
        <div className="text-3xl mb-2">📭</div>
        <p className="text-sm">
          {totalRaw === 0
            ? 'Tidak ada karyawan dengan jadwal CR pada periode ini'
            : 'Tidak ada data yang cocok dengan filter'}
        </p>
      </div>
    )
  }

  const badgeMap: Record<string, string> = {
    BELUM_AJUKAN: 'bg-orange-100 text-orange-700 border-orange-300',
    MENUNGGU: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    DISETUJUI: 'bg-green-100 text-green-700 border-green-300',
    DITOLAK: 'bg-red-100 text-red-700 border-red-300',
  }
  const badgeLabel: Record<string, string> = {
    BELUM_AJUKAN: '⚠️ Belum Ajukan',
    MENUNGGU: '⏳ Menunggu',
    DISETUJUI: '✅ Disetujui',
    DITOLAK: '❌ Ditolak',
  }

  return (
    <>
      <div className="px-3 py-2 border-b bg-gray-50 text-xs text-gray-600 flex justify-between items-center">
        <span>
          Menampilkan <strong>{data.length}</strong> dari <strong>{totalRaw}</strong> karyawan
          {activeFilter && (
            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px]">
              Filter: {badgeLabel[activeFilter]}
            </span>
          )}
        </span>
      </div>

      {/* DESKTOP TABLE */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-slate-600">Karyawan</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-600">Site</th>
              <th className="px-3 py-2 text-center font-semibold text-slate-600">Jadwal CR</th>
              <th className="px-3 py-2 text-center font-semibold text-slate-600">Hari</th>
              <th className="px-3 py-2 text-center font-semibold text-slate-600">Tgl Ajukan</th>
              <th className="px-3 py-2 text-center font-semibold text-slate-600">Periode Cuti</th>
              <th className="px-3 py-2 text-center font-semibold text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((m, idx) => (
              <tr key={m.leave_request_id || `${m.nrp}-${idx}`} className="border-b hover:bg-slate-50">
                <td className="px-3 py-2">
                  <div className="font-semibold">{m.nama}</div>
                  <div className="text-[11px] text-gray-500">{m.nrp} • {m.jabatan}</div>
                </td>
                <td className="px-3 py-2 text-gray-600">{m.site}</td>
                <td className="px-3 py-2 text-center whitespace-nowrap">
                  {fmtDateShort(m.tanggal_cr_pertama)} – {fmtDateShort(m.tanggal_cr_terakhir)}
                </td>
                <td className="px-3 py-2 text-center font-semibold">{m.total_hari_cr}</td>
                <td className="px-3 py-2 text-center whitespace-nowrap">
                  {m.tanggal_ajukan ? fmtDateShort(m.tanggal_ajukan) : <span className="text-gray-400">—</span>}
                </td>
                <td className="px-3 py-2 text-center whitespace-nowrap">
                  {m.tanggal_cuti_mulai ? (
                    <>{fmtDateShort(m.tanggal_cuti_mulai)} – {fmtDateShort(m.tanggal_cuti_selesai || '')}</>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold whitespace-nowrap ${badgeMap[m.status]}`}>
                    {badgeLabel[m.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MOBILE CARDS */}
      <div className="md:hidden divide-y">
        {data.map((m, idx) => (
          <div key={m.leave_request_id || `${m.nrp}-${idx}`} className="p-3">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-semibold text-sm">{m.nama}</div>
                <div className="text-[11px] text-gray-500">{m.nrp} • {m.jabatan}</div>
                <div className="text-[11px] text-gray-500">🏢 {m.site}</div>
              </div>
              <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${badgeMap[m.status]}`}>
                {badgeLabel[m.status]}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <div className="text-gray-500">📅 Jadwal CR ({m.total_hari_cr}h)</div>
                <div className="font-semibold">{fmtDateShort(m.tanggal_cr_pertama)} – {fmtDateShort(m.tanggal_cr_terakhir)}</div>
              </div>
              <div>
                <div className="text-gray-500">📝 Tgl Ajukan</div>
                <div className="font-semibold">{m.tanggal_ajukan ? fmtDateShort(m.tanggal_ajukan) : '—'}</div>
              </div>
              {m.tanggal_cuti_mulai && (
                <div className="col-span-2">
                  <div className="text-gray-500">🌴 Periode Cuti</div>
                  <div className="font-semibold">{fmtDateShort(m.tanggal_cuti_mulai)} – {fmtDateShort(m.tanggal_cuti_selesai || '')}</div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TABLE: TIKET
// ═══════════════════════════════════════════════════════════════════════════
function TiketTable({
  data, totalRaw, activeFilter, onRefresh,
}: {
  data: TiketItem[]
  totalRaw: number
  activeFilter: string
  onRefresh: () => void
}) {
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  if (!data.length) {
    return (
      <div className="text-center py-10 text-gray-500">
        <div className="text-3xl mb-2">✈️</div>
        <p className="text-sm">
          {totalRaw === 0
            ? 'Tidak ada data tiket untuk periode ini'
            : 'Tidak ada data yang cocok dengan filter'}
        </p>
      </div>
    )
  }

  const badgeMap: Record<string, string> = {
    MENUNGGU_PEMESANAN: 'bg-orange-100 text-orange-700 border-orange-300',
    SUDAH_DIPESAN: 'bg-blue-100 text-blue-700 border-blue-300',
    E_TICKET_TERKIRIM: 'bg-purple-100 text-purple-700 border-purple-300',
    SELESAI: 'bg-green-100 text-green-700 border-green-300',
    DIBATALKAN: 'bg-red-100 text-red-700 border-red-300',
  }
  const badgeLabel: Record<string, string> = {
    MENUNGGU_PEMESANAN: '⏳ Menunggu',
    SUDAH_DIPESAN: '✅ Dipesan',
    E_TICKET_TERKIRIM: '📧 E-Ticket',
    SELESAI: '🎉 Selesai',
    DIBATALKAN: '❌ Batal',
  }

  const updateStatus = async (ticket_id: string, status: string) => {
    if (!confirm(`Ubah status tiket ke: ${badgeLabel[status]}?`)) return
    setUpdatingId(ticket_id)
    try {
      const res = await fetch('/api/monitoring-cuti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id, status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Update gagal')
      alert('✅ ' + data.message)
      onRefresh()
    } catch (err: any) {
      alert('❌ ' + err.message)
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <>
      <div className="px-3 py-2 border-b bg-gray-50 text-xs text-gray-600 flex justify-between items-center">
        <span>
          Menampilkan <strong>{data.length}</strong> dari <strong>{totalRaw}</strong> tiket
          {activeFilter && (
            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px]">
              Filter: {badgeLabel[activeFilter]}
            </span>
          )}
        </span>
      </div>

      {/* DESKTOP TABLE */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-slate-600">Karyawan</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-600">Site</th>
              <th className="px-3 py-2 text-center font-semibold text-slate-600">Trip</th>
              <th className="px-3 py-2 text-center font-semibold text-slate-600">Tanggal</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-600">Tujuan</th>
              <th className="px-3 py-2 text-center font-semibold text-slate-600">Status</th>
              <th className="px-3 py-2 text-center font-semibold text-slate-600">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {data.map((t) => (
              <tr key={t.id} className="border-b hover:bg-slate-50">
                <td className="px-3 py-2">
                  <div className="font-semibold">{t.nama}</div>
                  <div className="text-[11px] text-gray-500">{t.nrp} • {t.jabatan}</div>
                </td>
                <td className="px-3 py-2 text-gray-600">{t.site}</td>
                <td className="px-3 py-2 text-center text-[11px] font-semibold">{t.trip_type}</td>
                <td className="px-3 py-2 text-center whitespace-nowrap">{fmtDateShort(t.tanggal)}</td>
                <td className="px-3 py-2">{t.tujuan || '—'}</td>
                <td className="px-3 py-2 text-center">
                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold whitespace-nowrap ${badgeMap[t.status]}`}>
                    {badgeLabel[t.status]}
                  </span>
                </td>
                <td className="px-3 py-2 text-center">
                  <ActionButtons t={t} onUpdate={updateStatus} disabled={updatingId === t.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MOBILE CARDS */}
      <div className="md:hidden divide-y">
        {data.map((t) => (
          <div key={t.id} className="p-3">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-semibold text-sm">{t.nama}</div>
                <div className="text-[11px] text-gray-500">{t.nrp} • {t.jabatan}</div>
              </div>
              <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${badgeMap[t.status]}`}>
                {badgeLabel[t.status]}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[11px] mb-2">
              <div><div className="text-gray-500">Trip</div><div className="font-semibold">{t.trip_type}</div></div>
              <div><div className="text-gray-500">Tanggal</div><div className="font-semibold">{fmtDateShort(t.tanggal)}</div></div>
              <div><div className="text-gray-500">Tujuan</div><div className="font-semibold">{t.tujuan || '—'}</div></div>
            </div>
            <ActionButtons t={t} onUpdate={updateStatus} disabled={updatingId === t.id} />
          </div>
        ))}
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// ACTION BUTTONS
// ═══════════════════════════════════════════════════════════════════════════
function ActionButtons({
  t, onUpdate, disabled,
}: {
  t: TiketItem
  onUpdate: (id: string, status: string) => void
  disabled: boolean
}) {
  return (
    <div className="flex flex-wrap gap-1 justify-center">
      {t.status === 'MENUNGGU_PEMESANAN' && (
        <button
          onClick={() => onUpdate(t.id, 'SUDAH_DIPESAN')}
          disabled={disabled}
          className="px-2 py-1 bg-blue-600 text-white rounded text-[10px] font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          ✅ Pesan
        </button>
      )}
      {t.status === 'SUDAH_DIPESAN' && (
        <button
          onClick={() => onUpdate(t.id, 'E_TICKET_TERKIRIM')}
          disabled={disabled}
          className="px-2 py-1 bg-purple-600 text-white rounded text-[10px] font-semibold hover:bg-purple-700 disabled:opacity-50"
        >
          📧 Kirim
        </button>
      )}
      {t.status === 'E_TICKET_TERKIRIM' && (
        <button
          onClick={() => onUpdate(t.id, 'SELESAI')}
          disabled={disabled}
          className="px-2 py-1 bg-green-600 text-white rounded text-[10px] font-semibold hover:bg-green-700 disabled:opacity-50"
        >
          🎉 Selesai
        </button>
      )}
      {['MENUNGGU_PEMESANAN', 'SUDAH_DIPESAN'].includes(t.status) && (
        <button
          onClick={() => onUpdate(t.id, 'DIBATALKAN')}
          disabled={disabled}
          className="px-2 py-1 bg-red-600 text-white rounded text-[10px] font-semibold hover:bg-red-700 disabled:opacity-50"
        >
          ❌
        </button>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════
function fmtDateShort(iso: string): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' })
  } catch {
    return iso
  }
}