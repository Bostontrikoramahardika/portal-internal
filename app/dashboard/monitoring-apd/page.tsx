'use client'


// app/dashboard/monitoring-apd/page.tsx
// v1.0 — Smart Table Monitoring APD (BTM Luxury style)

import { useEffect, useState } from 'react'

interface MatrixCell {
  status: 'AMAN' | 'SEGERA_GANTI' | 'EXPIRED' | 'BELUM_TERIMA'
  tanggal: string | null
  expired: string | null
  days: number | null
  ukuran?: string
  jumlah?: number
  warna?: string
}

interface Row {
  nrp: string
  nama: string
  jabatan: string
  departemen: string
  site: string
  tanggal_masuk: string | null
  matrix: Record<string, MatrixCell>
  overallStatus: string
  totalPunya: number
  totalMaster: number
  pendingCount: number
}

interface JenisItem {
  jenis_apd: string
  icon: string
  life_time_bulan: number
}

interface Summary {
  total: number
  aman: number
  segeraGanti: number
  expired: number
  belumTerima: number
  totalPending: number
}

export default function MonitoringApdPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [totalAll, setTotalAll] = useState(0)
  const [sites, setSites] = useState<string[]>([])
  const [departemens, setDepartemens] = useState<string[]>([])
  const [jenisList, setJenisList] = useState<JenisItem[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  
  const [filterSite, setFilterSite] = useState('ALL')
  const [filterDept, setFilterDept] = useState('ALL')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [search, setSearch] = useState('')
  
  const [selectedRow, setSelectedRow] = useState<Row | null>(null)
  const [showDrawer, setShowDrawer] = useState(false)

  useEffect(() => { loadData() }, [filterSite, filterDept, filterStatus])
  
  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => loadData(), 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line
  }, [search])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const token = localStorage.getItem('btm_session_token_v1')
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      
      const params = new URLSearchParams({
        site: filterSite,
        departemen: filterDept,
        status: filterStatus,
        search
      })
      
      const res = await fetch(`/api/apd/monitoring?${params}`, { headers })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal load data')
      
      setRows(json.rows || [])
      setTotalAll(json.totalAll || 0)
      setSites(json.sites || [])
      setDepartemens(json.departemens || [])
      setJenisList(json.jenisList || [])
      setSummary(json.summary || null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (d: string | null | undefined) => {
    if (!d) return '-'
    const dt = new Date(d)
    return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`
  }

  const statusColor = (status: string) => {
    if (status === 'AMAN') return { bg: 'bg-emerald-500', text: 'text-white', ring: 'ring-emerald-200', label: 'Aman' }
    if (status === 'SEGERA_GANTI') return { bg: 'bg-[#003d79] text-white', text: 'text-white', ring: 'ring-amber-200', label: 'Ganti' }
    if (status === 'EXPIRED') return { bg: 'bg-rose-500', text: 'text-white', ring: 'ring-rose-200', label: 'Expired' }
    return { bg: 'bg-slate-200', text: 'text-slate-500', ring: 'ring-slate-100', label: 'Belum' }
  }

  const openDrawer = (row: Row) => {
    setSelectedRow(row)
    setShowDrawer(true)
  }

  const activeFilterCount = 
    (filterSite !== 'ALL' ? 1 : 0) + 
    (filterDept !== 'ALL' ? 1 : 0) + 
    (filterStatus !== 'ALL' ? 1 : 0) + 
    (search ? 1 : 0)

  return (
    <div className="bg-[#f4f7fa] p-2 sm:p-3 lg:p-4 pb-24 text-slate-800">
      

      {/* HERO */}
      <div className="hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/5 rounded-full blur-2xl"></div>
        
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-2xl backdrop-blur-sm">
              📊
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-black tracking-tight">Monitoring APD</h1>
              <p className="text-sm text-white/70 font-medium">Pantau distribusi APD karyawan</p>
            </div>
          </div>

          {/* Stats Cards - Clickable */}
          {summary && (
            <div className="grid grid-cols-4 gap-2 mt-4">
              <button
                onClick={() => setFilterStatus('ALL')}
                className={`bg-white/10 backdrop-blur-md rounded-2xl p-3 border transition-all ${
                  filterStatus === 'ALL' ? 'border-white/40 bg-white/20' : 'border-white/10 hover:bg-white/15'
                }`}
              >
                <div className="text-[9px] font-black uppercase tracking-widest text-white/60 mb-1">Total</div>
                <div className="text-2xl font-black">{summary.total}</div>
              </button>
              <button
                onClick={() => setFilterStatus(filterStatus === 'AMAN' ? 'ALL' : 'AMAN')}
                className={`bg-emerald-500/20 backdrop-blur-md rounded-2xl p-3 border transition-all ${
                  filterStatus === 'AMAN' ? 'border-emerald-400/60 bg-emerald-500/30' : 'border-emerald-400/30 hover:bg-emerald-500/25'
                }`}
              >
                <div className="text-[9px] font-black uppercase tracking-widest text-emerald-100 mb-1">Aman</div>
                <div className="text-2xl font-black">{summary.aman}</div>
              </button>
              <button
                onClick={() => setFilterStatus(filterStatus === 'SEGERA_GANTI' ? 'ALL' : 'SEGERA_GANTI')}
                className={`bg-[#003d79] text-white/20 backdrop-blur-md rounded-2xl p-3 border transition-all ${
                  filterStatus === 'SEGERA_GANTI' ? 'border-amber-400/60 bg-[#003d79] text-white/30' : 'border-amber-400/30 hover:bg-[#003d79] text-white/25'
                }`}
              >
                <div className="text-[9px] font-black uppercase tracking-widest text-amber-100 mb-1">Ganti</div>
                <div className="text-2xl font-black">{summary.segeraGanti}</div>
              </button>
              <button
                onClick={() => setFilterStatus(filterStatus === 'EXPIRED' ? 'ALL' : 'EXPIRED')}
                className={`bg-rose-500/20 backdrop-blur-md rounded-2xl p-3 border transition-all ${
                  filterStatus === 'EXPIRED' ? 'border-rose-400/60 bg-rose-500/30' : 'border-rose-400/30 hover:bg-rose-500/25'
                }`}
              >
                <div className="text-[9px] font-black uppercase tracking-widest text-rose-100 mb-1">Expired</div>
                <div className="text-2xl font-black">{summary.expired}</div>
              </button>
            </div>
          )}

          {summary && summary.totalPending > 0 && (
            <div className="mt-3 bg-[#003d79] text-white rounded-2xl px-3 py-2 text-center text-[11px] font-black">
              ⏳ {summary.totalPending} request menunggu verifikasi di Kelola APD
            </div>
          )}
        </div>
      </div>

      {/* SEARCH & FILTERS */}
      <div className="px-4 mt-4">
        <div className="bg-white rounded-[1.5rem] shadow-lg p-3">
          {/* Search */}
          <div className="relative mb-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Cari nama atau NRP..."
              className="w-full bg-slate-50 border border-slate-200 rounded-[1.2rem] pl-4 pr-4 py-2.5 text-sm font-medium focus:outline-none focus:border-[#003D79]"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="grid grid-cols-2 gap-2">
            <select
              value={filterSite}
              onChange={(e) => setFilterSite(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#003D79]"
            >
              <option value="ALL">🌍 Semua Site</option>
              {sites.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#003D79]"
            >
              <option value="ALL">🏢 Semua Dept</option>
              {departemens.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                setFilterSite('ALL')
                setFilterDept('ALL')
                setFilterStatus('ALL')
                setSearch('')
              }}
              className="mt-2 w-full bg-slate-100 text-slate-600 py-2 rounded-xl text-[11px] font-black hover:bg-slate-200 transition-all"
            >
              ✕ Reset {activeFilterCount} Filter
            </button>
          )}
        </div>
      </div>

      {/* CONTENT */}
      <div className="px-4 mt-4">
        {loading ? (
          <div className="bg-white rounded-[2rem] shadow-xl p-8 text-center">
            <div className="text-4xl mb-3 animate-pulse">📊</div>
            <div className="text-sm text-slate-500 font-medium">Memuat data...</div>
          </div>
        ) : error ? (
          <div className="bg-white rounded-[2rem] shadow-xl p-8 text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <div className="text-sm font-black text-slate-900 mb-2">Error</div>
            <div className="text-xs text-slate-500 mb-4">{error}</div>
            <button onClick={loadData} className="bg-[#003D79] text-white px-4 py-2 rounded-xl font-black text-xs">
              🔄 Coba Lagi
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-white rounded-[2rem] shadow-xl p-8 text-center">
            <div className="text-5xl mb-4">🔍</div>
            <div className="text-sm font-black text-slate-700 mb-1">Tidak Ada Data</div>
            <div className="text-xs text-slate-500 font-medium">
              Coba ubah filter atau kata kunci pencarian
            </div>
          </div>
        ) : (
          <>
            {/* DESKTOP: Full Matrix Table */}
            <div className="hidden lg:block bg-white rounded-[1.5rem] shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-3 py-3 font-black uppercase tracking-widest text-[9px] text-slate-500 sticky left-0 bg-slate-50 z-10">
                        Nama / NRP
                      </th>
                      <th className="text-left px-2 py-3 font-black uppercase tracking-widest text-[9px] text-slate-500">
                        Site
                      </th>
                      {jenisList.map((j) => (
                        <th key={j.jenis_apd} className="text-center px-2 py-3 font-black uppercase tracking-widest text-[9px] text-slate-500 min-w-[60px]">
                          <div className="text-base">{j.icon}</div>
                          <div className="mt-1 truncate max-w-[70px] mx-auto">{j.jenis_apd.split(' ')[0]}</div>
                        </th>
                      ))}
                      <th className="text-center px-2 py-3 font-black uppercase tracking-widest text-[9px] text-slate-500">
                        Progress
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr
                        key={r.nrp}
                        onClick={() => openDrawer(r)}
                        className={`border-b border-slate-100 hover:bg-blue-50 cursor-pointer transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
                      >
                        <td className="px-3 py-3 sticky left-0 bg-inherit z-10">
                          <div className="font-black text-slate-900 text-[11px]">
                            {r.nama}
                            {r.pendingCount > 0 && (
                              <span className="ml-2 bg-[#003d79] text-white rounded-full px-1.5 py-0.5 text-[8px]">
                                {r.pendingCount}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium">{r.nrp}</div>
                          <div className="text-[9px] text-[#5a6a7e] truncate max-w-[150px]">{r.jabatan}</div>
                        </td>
                        <td className="px-2 py-3 text-[10px] text-slate-600 font-medium">{r.site}</td>
                        {jenisList.map((j) => {
                          const cell = r.matrix[j.jenis_apd]
                          const c = statusColor(cell.status)
                          return (
                            <td key={j.jenis_apd} className="px-2 py-3 text-center">
                              <div
                                className={`inline-flex flex-col items-center justify-center w-10 h-10 rounded-full ${c.bg} ${c.text} font-black text-[9px] ring-4 ${c.ring} mx-auto`}
                                title={cell.tanggal ? `${formatDate(cell.tanggal)} • ${cell.ukuran} × ${cell.jumlah}` : 'Belum terima'}
                              >
                                {cell.status === 'BELUM_TERIMA' ? '—' : (cell.days !== null && cell.days < 0 ? '!' : '✓')}
                              </div>
                            </td>
                          )
                        })}
                        <td className="px-2 py-3 text-center">
                          <div className="text-[10px] font-black text-slate-700">
                            {r.totalPunya}/{r.totalMaster}
                          </div>
                          <div className="w-14 h-1.5 bg-slate-200 rounded-full mx-auto mt-1">
                            <div
                              className="h-full bg-[#003D79] rounded-full"
                              style={{ width: `${(r.totalPunya / r.totalMaster) * 100}%` }}
                            ></div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* MOBILE: Card List */}
            <div className="lg:hidden space-y-3">
              {rows.map((r) => {
                const overall = statusColor(r.overallStatus)
                return (
                  <button
                    key={r.nrp}
                    onClick={() => openDrawer(r)}
                    className="w-full bg-white rounded-[1.5rem] shadow-lg border border-slate-100 p-4 text-left hover:shadow-xl active:scale-[0.98] transition-all"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-black text-slate-900 truncate">
                            {r.nama}
                          </div>
                          {r.pendingCount > 0 && (
                            <span className="bg-[#003d79] text-white rounded-full px-1.5 py-0.5 text-[9px] font-black">
                              ⏳ {r.pendingCount}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          NRP {r.nrp} • {r.site}
                        </div>
                        <div className="text-[9px] text-[#5a6a7e] truncate">
                          {r.jabatan}
                        </div>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${overall.bg} ring-4 ${overall.ring} flex-shrink-0 mt-1`}></div>
                    </div>

                    {/* Dot Grid Status */}
                    <div className="flex items-center gap-1.5 flex-wrap mb-3">
                      {jenisList.map((j) => {
                        const cell = r.matrix[j.jenis_apd]
                        const c = statusColor(cell.status)
                        return (
                          <div
                            key={j.jenis_apd}
                            className={`flex items-center gap-1 ${c.bg} ${c.text} rounded-full px-2 py-1 text-[9px] font-black`}
                            title={cell.tanggal ? formatDate(cell.tanggal) : 'Belum'}
                          >
                            <span>{j.icon}</span>
                            <span>{cell.status === 'BELUM_TERIMA' ? '—' : (cell.days !== null && cell.days < 0 ? '!' : '✓')}</span>
                          </div>
                        )
                      })}
                    </div>

                    {/* Progress */}
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] text-slate-500 font-medium">
                        {r.totalPunya} dari {r.totalMaster} jenis
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-200 rounded-full">
                          <div
                            className="h-full bg-[#003D79] rounded-full"
                            style={{ width: `${(r.totalPunya / r.totalMaster) * 100}%` }}
                          ></div>
                        </div>
                        <div className="text-[10px] font-black text-slate-700">
                          {Math.round((r.totalPunya / r.totalMaster) * 100)}%
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* LEGEND */}
            <div className="mt-4 bg-white rounded-[1.5rem] shadow-lg p-3">
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">
                Legend Status
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-200"></div>
                  <span className="text-slate-600 font-medium">Aman</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#003d79] text-white ring-2 ring-amber-200"></div>
                  <span className="text-slate-600 font-medium">Segera Ganti (≤60hr)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500 ring-2 ring-rose-200"></div>
                  <span className="text-slate-600 font-medium">Expired</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-slate-200 ring-2 ring-slate-100"></div>
                  <span className="text-slate-600 font-medium">Belum Terima</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* DRAWER DETAIL */}
      {showDrawer && selectedRow && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white w-full md:max-w-lg rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-[#003D79] text-white px-5 py-4 rounded-t-[2.5rem] sticky top-0 z-10 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-black truncate">{selectedRow.nama}</div>
                <div className="text-[10px] text-white/70 font-medium">
                  NRP {selectedRow.nrp} • {selectedRow.site}
                </div>
              </div>
              <button onClick={() => setShowDrawer(false)} className="text-white/70 hover:text-white text-2xl ml-2">
                ×
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Info Karyawan */}
              <div className="bg-slate-50 rounded-2xl p-3">
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <div className="text-[#5a6a7e] font-black uppercase tracking-widest">Jabatan</div>
                    <div className="font-black text-slate-900">{selectedRow.jabatan || '-'}</div>
                  </div>
                  <div>
                    <div className="text-[#5a6a7e] font-black uppercase tracking-widest">Departemen</div>
                    <div className="font-black text-slate-900">{selectedRow.departemen || '-'}</div>
                  </div>
                  <div>
                    <div className="text-[#5a6a7e] font-black uppercase tracking-widest">Site</div>
                    <div className="font-black text-slate-900">{selectedRow.site || '-'}</div>
                  </div>
                  <div>
                    <div className="text-[#5a6a7e] font-black uppercase tracking-widest">Progress</div>
                    <div className="font-black text-slate-900">
                      {selectedRow.totalPunya}/{selectedRow.totalMaster}
                      <span className="text-slate-500 ml-1">
                        ({Math.round((selectedRow.totalPunya / selectedRow.totalMaster) * 100)}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {selectedRow.pendingCount > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800 font-medium">
                  ⏳ Ada <span className="font-black">{selectedRow.pendingCount} request</span> menunggu verifikasi
                </div>
              )}

              {/* Detail per Jenis */}
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                  🦺 Detail per Jenis APD
                </div>
                <div className="space-y-2">
                  {jenisList.map((j) => {
                    const cell = selectedRow.matrix[j.jenis_apd]
                    const c = statusColor(cell.status)
                    return (
                      <div key={j.jenis_apd} className="bg-white rounded-xl border border-slate-100 p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="text-xl">{j.icon}</div>
                            <div>
                              <div className="text-xs font-black text-slate-900">{j.jenis_apd}</div>
                              <div className="text-[9px] text-slate-500 font-medium">
                                Masa pakai {j.life_time_bulan} bulan
                              </div>
                            </div>
                          </div>
                          <div className={`${c.bg} ${c.text} px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest`}>
                            {c.label}
                          </div>
                        </div>

                        {cell.status === 'BELUM_TERIMA' ? (
                          <div className="text-[10px] text-[#5a6a7e] italic">Belum pernah menerima</div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2 mt-2 text-[10px]">
                            <div>
                              <div className="text-[#5a6a7e]">Terima</div>
                              <div className="font-black text-slate-900">{formatDate(cell.tanggal)}</div>
                            </div>
                            <div>
                              <div className="text-[#5a6a7e]">Expired</div>
                              <div className="font-black text-slate-900">{formatDate(cell.expired)}</div>
                            </div>
                            <div>
                              <div className="text-[#5a6a7e]">Ukuran</div>
                              <div className="font-black text-slate-900">{cell.ukuran || '-'}</div>
                            </div>
                            <div>
                              <div className="text-[#5a6a7e]">Jumlah</div>
                              <div className="font-black text-slate-900">{cell.jumlah || '-'} pcs</div>
                            </div>
                            {cell.days !== null && (
                              <div className="col-span-2">
                                <div className="text-[#5a6a7e]">Status Waktu</div>
                                <div className={`font-black ${c.text.replace('text-white', 'text-slate-900')}`}>
                                  {cell.days < 0 
                                    ? `Expired ${Math.abs(cell.days)} hari lalu`
                                    : `${cell.days} hari lagi`}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-slate-100 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowDrawer(false)}
                className="w-full bg-slate-100 text-slate-700 py-3 rounded-[1.2rem] font-black text-sm hover:bg-slate-200"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    

      </div>
  )
}