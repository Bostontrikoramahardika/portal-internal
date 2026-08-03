'use client'

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD CUTI v4.0 - Chat 34
// 3 TAB terpadu: Roster Cuti | Pengajuan Cuti | Pengajuan Tiket
// Style: HR Dashboard (pill tabs, corporate blue #003D79)
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '@/app/lib/AuthContext'

type TabKey = 'roster' | 'pengajuan' | 'tiket'

type RosterItem = {
  nrp: string
  nama: string
  jabatan: string
  departemen: string
  site: string
  total_hari_cr: number
  tanggal_cr_pertama: string
  tanggal_cr_terakhir: string
  jenis_roster: string
  status: 'BELUM_AJUKAN' | 'MENUNGGU' | 'DISETUJUI' | 'DITOLAK'
  tanggal_ajukan: string | null
  tanggal_cuti_mulai: string | null
  tanggal_cuti_selesai: string | null
  leave_request_id: string | null
}

type PengajuanItem = {
  id: string
  nrp: string
  nama: string
  jabatan: string
  site: string
  tanggal_mulai: string
  tanggal_selesai: string
  jumlah_hari: number
  jenis_cuti: string
  alasan: string
  status_atasan: string
  status_pjo: string
  status_final: string
  butuh_tiket: boolean
  tanggal_ajukan?: string
  nama_atasan?: string
  nama_pjo?: string
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
  tanggal_pesan?: string
  dipesan_oleh?: string
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════
export default function DashboardCutiPage() {
  const { user, isSuperAdmin } = useAuth()
  const [activeTab, setActiveTab] = useState<TabKey>('roster')

  const now = new Date()
  const [bulan, setBulan] = useState(String(now.getMonth() + 1).padStart(2, '0'))
  const [tahun, setTahun] = useState(String(now.getFullYear()))
  const [site, setSite] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [jenisCutiFilter, setJenisCutiFilter] = useState<string>('')

  const [rosterData, setRosterData] = useState<RosterItem[]>([])
  const [pengajuanData, setPengajuanData] = useState<PengajuanItem[]>([])
  const [tiketData, setTiketData] = useState<TiketItem[]>([])
  const [rosterStats, setRosterStats] = useState<any>({})
  const [pengajuanStats, setPengajuanStats] = useState<any>({})
  const [tiketStats, setTiketStats] = useState<any>({})
  const [sites, setSites] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

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

  // ─── FETCH DATA ───────────────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true)
    try {
      if (activeTab === 'roster') {
        const params = new URLSearchParams({
          periode: `${tahun}-${bulan}`,
          ...(site && { site }),
        })
        const res = await fetch(`/api/monitoring-roster-cr?${params}`)
        const data = await res.json()
        setRosterData(data.data || [])
        setRosterStats(data.stats || {})
        if (data.sites?.length) setSites(data.sites)
      } else {
        // Tab pengajuan & tiket sama-sama pakai monitoring-cuti
        const params = new URLSearchParams({
          bulan, tahun,
          ...(site && { site }),
          ...(jenisCutiFilter && activeTab === 'pengajuan' && { jenis_cuti: jenisCutiFilter }),
        })
        const res = await fetch(`/api/monitoring-cuti?${params}`)
        const data = await res.json()
        setPengajuanData(data.cuti || [])
        setTiketData(data.tiket || [])
        setPengajuanStats({
          total: (data.cuti || []).length,
          disetujui: (data.cuti || []).filter((c: any) => c.status_final === 'DISETUJUI').length,
          pending: (data.cuti || []).filter((c: any) => !c.status_final || c.status_final === 'PENDING').length,
          ditolak: (data.cuti || []).filter((c: any) => c.status_final === 'DITOLAK').length,
        })
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
  }, [activeTab, bulan, tahun, site, jenisCutiFilter])

  // Reset filter saat pindah tab
  useEffect(() => {
    setStatusFilter('')
    setJenisCutiFilter('')
  }, [activeTab])

  // ─── FILTER LOCAL ─────────────────────────────────────────────────────
  const filteredRoster = useMemo(() => {
    let result = rosterData
    if (statusFilter) result = result.filter((m) => m.status === statusFilter)
    if (search) {
      const s = search.toLowerCase()
      result = result.filter((m) =>
        m.nama?.toLowerCase().includes(s) ||
        m.nrp?.toLowerCase().includes(s) ||
        m.jabatan?.toLowerCase().includes(s)
      )
    }
    return result
  }, [rosterData, search, statusFilter])

  const filteredPengajuan = useMemo(() => {
    let result = pengajuanData
    if (statusFilter) result = result.filter((p) => p.status_final === statusFilter)
    if (search) {
      const s = search.toLowerCase()
      result = result.filter((p) =>
        p.nama?.toLowerCase().includes(s) ||
        p.nrp?.toLowerCase().includes(s) ||
        p.jenis_cuti?.toLowerCase().includes(s)
      )
    }
    return result
  }, [pengajuanData, search, statusFilter])

  const filteredTiket = useMemo(() => {
    let result = tiketData
    if (statusFilter) result = result.filter((t) => t.status === statusFilter)
    if (search) {
      const s = search.toLowerCase()
      result = result.filter((t) =>
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

  const tabs: { key: TabKey; icon: string; label: string }[] = [
    { key: 'roster',    icon: '🗓️', label: 'Roster Cuti' },
    { key: 'pengajuan', icon: '📝', label: 'Pengajuan Cuti' },
    { key: 'tiket',     icon: '✈️', label: 'Pengajuan Tiket' },
  ]

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#f4f7fa] pb-24">
      {/* ─── HEADER ────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-[#003D79] to-[#0056b3] px-4 pt-6 pb-4 lg:px-6 lg:pt-8 lg:pb-6 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-4xl">🌴</span>
          <div>
            <h1 className="text-white text-xl lg:text-3xl font-black tracking-tight">
              Dashboard Cuti
            </h1>
            <p className="text-blue-200 text-xs lg:text-sm font-bold">
              Roster • Pengajuan • Tiket Pesawat
            </p>
          </div>
        </div>

        {/* TAB PILL */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1 no-scrollbar">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs lg:text-sm font-bold whitespace-nowrap transition-all
                ${activeTab === t.key
                  ? 'bg-white text-[#003D79] shadow-lg'
                  : 'bg-white/20 text-white/80 hover:bg-white/30'
                }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── CONTENT ───────────────────────────────────────────────────── */}
      <div className="px-4 py-4 lg:px-6 lg:py-6 space-y-3">
        {/* FILTER GLOBAL */}
        <div className="bg-white rounded-2xl shadow-sm border p-3">
          <div className={`grid grid-cols-2 gap-2 ${activeTab === 'pengajuan' ? 'md:grid-cols-6' : 'md:grid-cols-5'}`}>
            <select
              value={bulan}
              onChange={(e) => setBulan(e.target.value)}
              className="border rounded-lg px-2 py-1.5 text-xs md:text-sm font-semibold"
            >
              {namaBulan.map((n, i) => (
                <option key={i} value={String(i + 1).padStart(2, '0')}>📅 {n}</option>
              ))}
            </select>

            <select
              value={tahun}
              onChange={(e) => setTahun(e.target.value)}
              className="border rounded-lg px-2 py-1.5 text-xs md:text-sm font-semibold"
            >
              {[2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>

            <select
              value={site}
              onChange={(e) => setSite(e.target.value)}
              disabled={siteFilterLocked}
              className={`border rounded-lg px-2 py-1.5 text-xs md:text-sm font-semibold ${
                siteFilterLocked ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
            >
              <option value="">🏢 Semua Site</option>
              {sites.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>

            {/* Status filter per tab */}
            {activeTab === 'roster' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border rounded-lg px-2 py-1.5 text-xs md:text-sm font-semibold"
              >
                <option value="">📋 Semua Status</option>
                <option value="BELUM_AJUKAN">⚠️ Belum Ajukan</option>
                <option value="MENUNGGU">⏳ Menunggu</option>
                <option value="DISETUJUI">✅ Disetujui</option>
                <option value="DITOLAK">❌ Ditolak</option>
              </select>
            )}
            {activeTab === 'pengajuan' && (
              <>
                <select
                  value={jenisCutiFilter}
                  onChange={(e) => setJenisCutiFilter(e.target.value)}
                  className="border rounded-lg px-2 py-1.5 text-xs md:text-sm font-semibold"
                >
                  <option value="">🌴 Semua Jenis</option>
                  <option value="CUTI REGULER / ROSTER">Reguler / Roster</option>
                  <option value="CUTI TAHUNAN">Tahunan</option>
                  <option value="CUTI KOMPENSASI">Kompensasi</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border rounded-lg px-2 py-1.5 text-xs md:text-sm font-semibold"
                >
                  <option value="">📋 Semua Status</option>
                  <option value="DISETUJUI">✅ Disetujui</option>
                  <option value="PENDING">⏳ Pending</option>
                  <option value="DITOLAK">❌ Ditolak</option>
                </select>
              </>
            )}
            {activeTab === 'tiket' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border rounded-lg px-2 py-1.5 text-xs md:text-sm font-semibold"
              >
                <option value="">📋 Semua Status</option>
                <option value="MENUNGGU_PEMESANAN">⏳ Menunggu Pesan</option>
                <option value="SUDAH_DIPESAN">✅ Dipesan</option>
                <option value="E_TICKET_TERKIRIM">📧 E-Ticket Terkirim</option>
                <option value="SELESAI">🎉 Selesai</option>
                <option value="DIBATALKAN">❌ Dibatalkan</option>
              </select>
            )}

            <input
              type="text"
              placeholder="🔍 Cari..."
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

        {/* STATS CARDS */}
        {activeTab === 'roster' && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <StatCard color="blue"   label="Total Roster" value={rosterStats.total_karyawan || 0} icon="👥"
              active={statusFilter === ''} onClick={() => setStatusFilter('')} />
            <StatCard color="green"  label="Sudah Ajukan" value={rosterStats.sudah_ajukan || 0} icon="✅"
              active={statusFilter === 'DISETUJUI'} onClick={() => setStatusFilter(statusFilter === 'DISETUJUI' ? '' : 'DISETUJUI')} />
            <StatCard color="yellow" label="Menunggu" value={rosterStats.menunggu || 0} icon="⏳"
              active={statusFilter === 'MENUNGGU'} onClick={() => setStatusFilter(statusFilter === 'MENUNGGU' ? '' : 'MENUNGGU')} />
            <StatCard color="orange" label="Belum Ajukan" value={rosterStats.belum_ajukan || 0} icon="⚠️"
              active={statusFilter === 'BELUM_AJUKAN'} onClick={() => setStatusFilter(statusFilter === 'BELUM_AJUKAN' ? '' : 'BELUM_AJUKAN')} />
            <StatCard color="red" label="Ditolak" value={rosterStats.ditolak || 0} icon="❌"
              active={statusFilter === 'DITOLAK'} onClick={() => setStatusFilter(statusFilter === 'DITOLAK' ? '' : 'DITOLAK')} />
          </div>
        )}
        {activeTab === 'pengajuan' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <StatCard color="blue"   label="Total Pengajuan" value={pengajuanStats.total || 0} icon="📝"
              active={statusFilter === ''} onClick={() => setStatusFilter('')} />
            <StatCard color="green"  label="Disetujui" value={pengajuanStats.disetujui || 0} icon="✅"
              active={statusFilter === 'DISETUJUI'} onClick={() => setStatusFilter(statusFilter === 'DISETUJUI' ? '' : 'DISETUJUI')} />
            <StatCard color="yellow" label="Pending" value={pengajuanStats.pending || 0} icon="⏳"
              active={statusFilter === 'PENDING'} onClick={() => setStatusFilter(statusFilter === 'PENDING' ? '' : 'PENDING')} />
            <StatCard color="red"    label="Ditolak" value={pengajuanStats.ditolak || 0} icon="❌"
              active={statusFilter === 'DITOLAK'} onClick={() => setStatusFilter(statusFilter === 'DITOLAK' ? '' : 'DITOLAK')} />
          </div>
        )}
        {activeTab === 'tiket' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <StatCard color="blue"   label="Total Tiket" value={tiketStats.total_tiket || 0} icon="✈️"
              active={statusFilter === ''} onClick={() => setStatusFilter('')} />
            <StatCard color="orange" label="Menunggu Pesan" value={tiketStats.tiket_menunggu || 0} icon="⏳"
              active={statusFilter === 'MENUNGGU_PEMESANAN'} onClick={() => setStatusFilter(statusFilter === 'MENUNGGU_PEMESANAN' ? '' : 'MENUNGGU_PEMESANAN')} />
            <StatCard color="green"  label="Sudah Dipesan" value={tiketStats.tiket_dipesan || 0} icon="✅"
              active={statusFilter === 'SUDAH_DIPESAN'} onClick={() => setStatusFilter(statusFilter === 'SUDAH_DIPESAN' ? '' : 'SUDAH_DIPESAN')} />
            <StatCard color="purple" label="E-Ticket Terkirim" value={tiketStats.tiket_terkirim || 0} icon="📧"
              active={statusFilter === 'E_TICKET_TERKIRIM'} onClick={() => setStatusFilter(statusFilter === 'E_TICKET_TERKIRIM' ? '' : 'E_TICKET_TERKIRIM')} />
          </div>
        )}

        {/* TABLE */}
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-gray-500">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#003D79] mb-2"></div>
              <p className="text-sm font-semibold">Memuat data...</p>
            </div>
          ) : activeTab === 'roster' ? (
            <RosterTable data={filteredRoster} totalRaw={rosterData.length} />
          ) : activeTab === 'pengajuan' ? (
            <PengajuanTable data={filteredPengajuan} totalRaw={pengajuanData.length} />
          ) : (
            <TiketTable data={filteredTiket} totalRaw={tiketData.length} onRefresh={fetchData} />
          )}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// STAT CARD
// ═══════════════════════════════════════════════════════════════════════════
function StatCard({ color, label, value, icon, active, onClick }: any) {
  const colorMap: Record<string, any> = {
    blue:   { bg: 'bg-blue-50 hover:bg-blue-100',     text: 'text-[#003D79]',  ring: 'ring-blue-500',   border: 'border-blue-200' },
    green:  { bg: 'bg-green-50 hover:bg-green-100',   text: 'text-green-700',  ring: 'ring-green-500',  border: 'border-green-200' },
    yellow: { bg: 'bg-yellow-50 hover:bg-yellow-100', text: 'text-yellow-700', ring: 'ring-yellow-500', border: 'border-yellow-200' },
    orange: { bg: 'bg-orange-50 hover:bg-orange-100', text: 'text-orange-700', ring: 'ring-orange-500', border: 'border-orange-200' },
    red:    { bg: 'bg-red-50 hover:bg-red-100',       text: 'text-red-700',    ring: 'ring-red-500',    border: 'border-red-200' },
    purple: { bg: 'bg-purple-50 hover:bg-purple-100', text: 'text-purple-700', ring: 'ring-purple-500', border: 'border-purple-200' },
  }
  const c = colorMap[color]
  return (
    <button
      onClick={onClick}
      className={`${c.bg} ${c.text} rounded-2xl border ${c.border} p-3 text-left transition-all ${
        active ? `ring-2 ${c.ring} shadow-md scale-[1.02]` : 'hover:shadow-sm'
      }`}
    >
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[10px] font-black uppercase tracking-wide opacity-80">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className="text-2xl md:text-3xl font-black leading-tight">{value}</div>
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TABLE: ROSTER CUTI (CR + CT dari roster)
// ═══════════════════════════════════════════════════════════════════════════
function RosterTable({ data, totalRaw }: { data: RosterItem[]; totalRaw: number }) {
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
      <div className="px-3 py-2 border-b bg-slate-50 text-xs text-slate-600">
        Menampilkan <strong>{data.length}</strong> dari <strong>{totalRaw}</strong> karyawan
      </div>
      {!data.length ? (
        <EmptyState icon="🗓️" msg="Tidak ada karyawan dengan jadwal roster CR/CT" />
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <Th>Karyawan</Th>
                  <Th>Site</Th>
                  <Th center>Jenis</Th>
                  <Th center>Periode Roster</Th>
                  <Th center>Hari</Th>
                  <Th center>Tgl Ajukan</Th>
                  <Th center>Status</Th>
                </tr>
              </thead>
              <tbody>
                {data.map((m, idx) => (
                  <tr key={m.leave_request_id || `${m.nrp}-${idx}`} className="border-b hover:bg-blue-50/50">
                    <td className="px-3 py-2">
                      <div className="font-bold text-slate-800">{m.nama}</div>
                      <div className="text-[11px] text-slate-500">{m.nrp} • {m.jabatan}</div>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{m.site}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold">
                        {m.jenis_roster || 'CR'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center whitespace-nowrap text-slate-700">
                      {fmtDateShort(m.tanggal_cr_pertama)} – {fmtDateShort(m.tanggal_cr_terakhir)}
                    </td>
                    <td className="px-3 py-2 text-center font-black text-[#003D79]">{m.total_hari_cr}</td>
                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      {m.tanggal_ajukan ? fmtDateShort(m.tanggal_ajukan) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold whitespace-nowrap ${badgeMap[m.status]}`}>
                        {badgeLabel[m.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden divide-y">
            {data.map((m, idx) => (
              <div key={m.leave_request_id || `${m.nrp}-${idx}`} className="p-3">
                <div className="flex justify-between items-start mb-2 gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-slate-800 truncate">{m.nama}</div>
                    <div className="text-[11px] text-slate-500">{m.nrp} • {m.jabatan}</div>
                    <div className="text-[11px] text-slate-500">🏢 {m.site}</div>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold">{m.jenis_roster || 'CR'}</span>
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold whitespace-nowrap ${badgeMap[m.status]}`}>
                      {badgeLabel[m.status]}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <div className="text-slate-500 font-semibold">📅 Periode ({m.total_hari_cr}h)</div>
                    <div className="font-bold text-slate-700">{fmtDateShort(m.tanggal_cr_pertama)} – {fmtDateShort(m.tanggal_cr_terakhir)}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 font-semibold">📝 Tgl Ajukan</div>
                    <div className="font-bold text-slate-700">{m.tanggal_ajukan ? fmtDateShort(m.tanggal_ajukan) : '—'}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TABLE: PENGAJUAN CUTI (semua jenis dari leave_requests)
// ═══════════════════════════════════════════════════════════════════════════
function PengajuanTable({ data, totalRaw }: { data: PengajuanItem[]; totalRaw: number }) {
  const statusBadge = (s: string) => {
    if (s === 'DISETUJUI') return 'bg-green-100 text-green-700 border-green-300'
    if (s === 'DITOLAK')   return 'bg-red-100 text-red-700 border-red-300'
    return 'bg-yellow-100 text-yellow-700 border-yellow-300'
  }
  const statusLabel = (s: string) => {
    if (s === 'DISETUJUI') return '✅'
    if (s === 'DITOLAK')   return '❌'
    return '⏳'
  }

  return (
    <>
      <div className="px-3 py-2 border-b bg-slate-50 text-xs text-slate-600">
        Menampilkan <strong>{data.length}</strong> dari <strong>{totalRaw}</strong> pengajuan
      </div>
      {!data.length ? (
        <EmptyState icon="📝" msg="Tidak ada pengajuan cuti" />
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <Th>Karyawan</Th>
                  <Th>Site</Th>
                  <Th>Jenis Cuti</Th>
                  <Th center>Periode Cuti</Th>
                  <Th center>Hari</Th>
                  <Th center>Atasan</Th>
                  <Th center>PJO</Th>
                  <Th center>Status Final</Th>
                  <Th center>Tiket</Th>
                </tr>
              </thead>
              <tbody>
                {data.map((p) => (
                  <tr key={p.id} className="border-b hover:bg-blue-50/50">
                    <td className="px-3 py-2">
                      <div className="font-bold text-slate-800">{p.nama}</div>
                      <div className="text-[11px] text-slate-500">{p.nrp} • {p.jabatan}</div>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{p.site}</td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold">{p.jenis_cuti}</span>
                    </td>
                    <td className="px-3 py-2 text-center whitespace-nowrap text-slate-700">
                      {fmtDateShort(p.tanggal_mulai)} – {fmtDateShort(p.tanggal_selesai)}
                    </td>
                    <td className="px-3 py-2 text-center font-black text-[#003D79]">{p.jumlah_hari}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${statusBadge(p.status_atasan)}`}>
                        {statusLabel(p.status_atasan)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${statusBadge(p.status_pjo)}`}>
                        {statusLabel(p.status_pjo)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${statusBadge(p.status_final)}`}>
                        {p.status_final || 'PENDING'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {p.butuh_tiket
                        ? <span className="text-indigo-600 font-black">✈️</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden divide-y">
            {data.map((p) => (
              <div key={p.id} className="p-3">
                <div className="flex justify-between items-start mb-2 gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-slate-800 truncate">{p.nama}</div>
                    <div className="text-[11px] text-slate-500">{p.nrp} • {p.jabatan}</div>
                    <div className="text-[11px] text-slate-500">🏢 {p.site}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${statusBadge(p.status_final)}`}>
                    {p.status_final || 'PENDING'}
                  </span>
                </div>
                <div className="mb-2">
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold">{p.jenis_cuti}</span>
                  {p.butuh_tiket && <span className="ml-2 px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-bold">✈️ Butuh Tiket</span>}
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <div className="text-slate-500 font-semibold">📅 Periode ({p.jumlah_hari}h)</div>
                    <div className="font-bold text-slate-700">{fmtDateShort(p.tanggal_mulai)} – {fmtDateShort(p.tanggal_selesai)}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 font-semibold">✅ Approval</div>
                    <div className="font-bold text-slate-700">
                      Atasan {statusLabel(p.status_atasan)} • PJO {statusLabel(p.status_pjo)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TABLE: TIKET
// ═══════════════════════════════════════════════════════════════════════════
function TiketTable({ data, totalRaw, onRefresh }: { data: TiketItem[]; totalRaw: number; onRefresh: () => void }) {
  const [updatingId, setUpdatingId] = useState<string | null>(null)

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
      <div className="px-3 py-2 border-b bg-slate-50 text-xs text-slate-600">
        Menampilkan <strong>{data.length}</strong> dari <strong>{totalRaw}</strong> tiket
      </div>
      {!data.length ? (
        <EmptyState icon="✈️" msg="Tidak ada data tiket" />
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <Th>Karyawan</Th>
                  <Th>Site</Th>
                  <Th center>Trip</Th>
                  <Th center>Tgl Terbang</Th>
                  <Th>Tujuan</Th>
                  <Th center>Tgl Pesan</Th>
                  <Th center>Status</Th>
                  <Th center>Aksi</Th>
                </tr>
              </thead>
              <tbody>
                {data.map((t) => (
                  <tr key={t.id} className="border-b hover:bg-blue-50/50">
                    <td className="px-3 py-2">
                      <div className="font-bold text-slate-800">{t.nama}</div>
                      <div className="text-[11px] text-slate-500">{t.nrp} • {t.jabatan}</div>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{t.site}</td>
                    <td className="px-3 py-2 text-center text-[11px] font-bold">{t.trip_type}</td>
                    <td className="px-3 py-2 text-center whitespace-nowrap">{fmtDateShort(t.tanggal)}</td>
                    <td className="px-3 py-2 text-slate-700">{t.tujuan || '—'}</td>
                    <td className="px-3 py-2 text-center whitespace-nowrap text-[11px] text-slate-600">
                      {t.tanggal_pesan ? fmtDateShort(t.tanggal_pesan) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold whitespace-nowrap ${badgeMap[t.status]}`}>
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
          <div className="md:hidden divide-y">
            {data.map((t) => (
              <div key={t.id} className="p-3">
                <div className="flex justify-between items-start mb-2 gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-slate-800 truncate">{t.nama}</div>
                    <div className="text-[11px] text-slate-500">{t.nrp} • {t.jabatan}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold whitespace-nowrap ${badgeMap[t.status]}`}>
                    {badgeLabel[t.status]}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px] mb-2">
                  <div><div className="text-slate-500 font-semibold">Trip</div><div className="font-bold text-slate-700">{t.trip_type}</div></div>
                  <div><div className="text-slate-500 font-semibold">Terbang</div><div className="font-bold text-slate-700">{fmtDateShort(t.tanggal)}</div></div>
                  <div><div className="text-slate-500 font-semibold">Tujuan</div><div className="font-bold text-slate-700 truncate">{t.tujuan || '—'}</div></div>
                </div>
                {t.tanggal_pesan && (
                  <div className="text-[10px] text-slate-500 mb-2">📅 Dipesan: <strong>{fmtDateShort(t.tanggal_pesan)}</strong></div>
                )}
                <ActionButtons t={t} onUpdate={updateStatus} disabled={updatingId === t.id} />
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}

function ActionButtons({ t, onUpdate, disabled }: any) {
  return (
    <div className="flex flex-wrap gap-1 justify-center">
      {t.status === 'MENUNGGU_PEMESANAN' && (
        <button onClick={() => onUpdate(t.id, 'SUDAH_DIPESAN')} disabled={disabled}
          className="px-2 py-1 bg-blue-600 text-white rounded text-[10px] font-bold hover:bg-blue-700 disabled:opacity-50">
          ✅ Pesan
        </button>
      )}
      {t.status === 'SUDAH_DIPESAN' && (
        <button onClick={() => onUpdate(t.id, 'E_TICKET_TERKIRIM')} disabled={disabled}
          className="px-2 py-1 bg-purple-600 text-white rounded text-[10px] font-bold hover:bg-purple-700 disabled:opacity-50">
          📧 Kirim
        </button>
      )}
      {t.status === 'E_TICKET_TERKIRIM' && (
        <button onClick={() => onUpdate(t.id, 'SELESAI')} disabled={disabled}
          className="px-2 py-1 bg-green-600 text-white rounded text-[10px] font-bold hover:bg-green-700 disabled:opacity-50">
          🎉 Selesai
        </button>
      )}
      {['MENUNGGU_PEMESANAN', 'SUDAH_DIPESAN'].includes(t.status) && (
        <button onClick={() => onUpdate(t.id, 'DIBATALKAN')} disabled={disabled}
          className="px-2 py-1 bg-red-600 text-white rounded text-[10px] font-bold hover:bg-red-700 disabled:opacity-50">
          ❌
        </button>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════
function Th({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <th className={`px-3 py-2 font-black text-slate-600 uppercase tracking-wide ${center ? 'text-center' : 'text-left'}`}>
      {children}
    </th>
  )
}

function EmptyState({ icon, msg }: { icon: string; msg: string }) {
  return (
    <div className="text-center py-10 text-gray-500">
      <div className="text-3xl mb-2">{icon}</div>
      <p className="text-sm">{msg}</p>
    </div>
  )
}

function fmtDateShort(iso: string): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' })
  } catch { return iso }
}