'use client'


// app/dashboard/monitoring-mcu/page.tsx
// Smart Table MCU — Merge List + Matrix (Chat 21)
// Design: BTM Luxury Mobile v1.0
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  HeartPulse, Search, Download, RefreshCw, Loader2,
  AlertCircle, CheckCircle, Clock, ChevronDown, ChevronUp,
  Plus, FileText, BarChart2, Calendar, User, Building2,
  XCircle, Filter, ChevronRight
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────
interface McuColumn {
  no: number
  id: string | null
  tanggal: string | null
  hasil: string | null
  temuan_summary: string | null
  status_mcu: string | null
}

interface McuRow {
  no: number
  nrp: string
  nama: string
  jabatan: string
  departemen: string
  site: string
  status_karyawan: string
  total_mcu: number
  mcu_columns: McuColumn[]
  mcu_terakhir: string | null
  masa_berlaku: string | null
  status_expired: 'AMAN' | 'AKAN_EXPIRED' | 'EXPIRED' | 'BELUM_MCU'
  days_to_expired: number | null
  status_mcu: string
  last_hasil: string | null
}

interface Stats {
  total: number
  aman: number
  akan_expired: number
  expired: number
  belum_mcu: number
}

// ─── Helpers ────────────────────────────────────────────────
function formatDate(d: string | null) {
  if (!d) return '-'
  const date = new Date(d + 'T00:00:00')
  return date.toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: '2-digit'
  }).replace(/ /g, ' ')
}

function formatDateShort(d: string | null) {
  if (!d) return '-'
  const date = new Date(d + 'T00:00:00')
  return date.toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: '2-digit'
  })
}

// ─── Status Config ──────────────────────────────────────────
function getExpiredConfig(status: string, days: number | null) {
  switch (status) {
    case 'AMAN':
      return {
        bg: 'bg-emerald-50 border-emerald-200',
        badge: 'bg-emerald-100 text-emerald-700 border-emerald-300',
        dot: 'bg-emerald-500',
        label: 'AMAN',
        icon: <CheckCircle className="w-3 h-3" />
      }
    case 'AKAN_EXPIRED':
      return {
        bg: 'bg-amber-50 border-amber-200',
        badge: 'bg-amber-100 text-amber-700 border-amber-300',
        dot: 'bg-[#003d79] text-white',
        label: days !== null ? `${days}h lagi` : 'SEGERA',
        icon: <Clock className="w-3 h-3" />
      }
    case 'EXPIRED':
      return {
        bg: 'bg-rose-50 border-rose-200',
        badge: 'bg-rose-100 text-rose-700 border-rose-300',
        dot: 'bg-rose-500',
        label: 'EXPIRED',
        icon: <XCircle className="w-3 h-3" />
      }
    case 'BELUM_MCU':
      return {
        bg: 'bg-slate-50 border-slate-200',
        badge: 'bg-slate-100 text-slate-500 border-slate-300',
        dot: 'bg-slate-400',
        label: 'BELUM MCU',
        icon: <AlertCircle className="w-3 h-3" />
      }
    default:
      return {
        bg: 'bg-slate-50 border-slate-200',
        badge: 'bg-slate-100 text-slate-500 border-slate-300',
        dot: 'bg-slate-400',
        label: '-',
        icon: null
      }
  }
}

function getHasilConfig(hasil: string | null) {
  switch (hasil) {
    case 'FIT':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    case 'FIT WITH NOTE':
    case 'FIT_WITH_NOTE':
      return 'bg-amber-100 text-amber-700 border-amber-200'
    case 'UNFIT':
      return 'bg-rose-100 text-rose-700 border-rose-200'
    default:
      return 'bg-slate-100 text-slate-500 border-slate-200'
  }
}

// ─── MCU Column Cell ────────────────────────────────────────
function McuCell({ col }: { col: McuColumn }) {
  if (!col.tanggal) {
    return (
      <div className="text-center text-[#5a6a7e] text-[10px]">
      
—</div>
    )
  }
  return (
    <div className="text-center">
      <div className="text-[10px] font-bold text-slate-700">
        {formatDateShort(col.tanggal)}
      </div>
      {col.hasil && (
        <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${getHasilConfig(col.hasil)}`}>
          {col.hasil === 'FIT_WITH_NOTE' ? 'FIT*' : col.hasil}
        </span>
      )}
    </div>
  )
}

// ─── Accordion Content ──────────────────────────────────────
function AccordionDetail({
  row,
  onNavigate
}: {
  row: McuRow
  onNavigate: (path: string) => void
}) {
  const lastMcu = row.mcu_columns.filter(c => c.tanggal).slice(-1)[0]

  return (
    <div className="bg-white border-t border-slate-100 px-4 py-4 space-y-3">

      {/* Info MCU Terbaru */}
      {lastMcu ? (
        <div className="bg-slate-50 rounded-2xl p-3 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <HeartPulse className="w-4 h-4 text-[#003D79]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#003D79]">
              MCU Terbaru
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-[9px] font-black uppercase tracking-widest text-[#5a6a7e]">Tanggal MCU</div>
              <div className="font-bold text-slate-700">{formatDate(lastMcu.tanggal)}</div>
            </div>
            <div>
              <div className="text-[9px] font-black uppercase tracking-widest text-[#5a6a7e]">Hasil</div>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${getHasilConfig(lastMcu.hasil)}`}>
                {lastMcu.hasil || '-'}
              </span>
            </div>
            <div>
              <div className="text-[9px] font-black uppercase tracking-widest text-[#5a6a7e]">Masa Berlaku</div>
              <div className="font-bold text-slate-700">{formatDate(row.masa_berlaku)}</div>
            </div>
            <div>
              <div className="text-[9px] font-black uppercase tracking-widest text-[#5a6a7e]">Total MCU</div>
              <div className="font-bold text-slate-700">{row.total_mcu}x</div>
            </div>
          </div>

          {/* Temuan */}
          {lastMcu.temuan_summary ? (
            <div className="mt-2 p-2 bg-amber-50 rounded-xl border border-amber-200">
              <div className="text-[9px] font-black uppercase tracking-widest text-amber-600 mb-1">⚠️ Temuan</div>
              <div className="text-xs text-amber-800">{lastMcu.temuan_summary}</div>
            </div>
          ) : (
            <div className="mt-2 p-2 bg-emerald-50 rounded-xl border border-emerald-200">
              <div className="text-[10px] text-emerald-700 font-bold">✅ Tidak ada temuan</div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-50 rounded-2xl p-4 text-center">
          <AlertCircle className="w-8 h-8 text-[#5a6a7e] mx-auto mb-2" />
          <div className="text-sm font-bold text-[#5a6a7e]">Belum ada data MCU</div>
          <div className="text-xs text-[#5a6a7e]">Karyawan ini belum pernah MCU</div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {lastMcu?.id && (
          <button
            onClick={() => onNavigate(`/dashboard/monitoring-mcu/${lastMcu.id}`)}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#003D79] text-white rounded-xl text-xs font-bold hover:bg-[#002d5a] transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            Detail & Aksi
          </button>
        )}
        <button
          onClick={() => onNavigate(`/dashboard/monitoring-mcu/karyawan/${row.nrp}`)}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors"
        >
          <BarChart2 className="w-3.5 h-3.5" />
          Timeline
        </button>
        <button
          onClick={() => onNavigate(`/dashboard/monitoring-mcu/${lastMcu?.id || 'new'}?input=1&nrp=${row.nrp}`)}
          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-200 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Input MCU
        </button>
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────
export default function MonitoringMcuPage() {
  const router = useRouter()

  // State
  const [rows, setRows] = useState<McuRow[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, aman: 0, akan_expired: 0, expired: 0, belum_mcu: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedNrp, setExpandedNrp] = useState<string | null>(null)

  // Filter state
  const [search, setSearch] = useState('')
  const [filterSite, setFilterSite] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [sites, setSites] = useState<string[]>([])
  const [depts, setDepts] = useState<string[]>([])

  // ─── Fetch Data ──────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('btm_session_token_v1')
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const params = new URLSearchParams()
      if (filterSite) params.set('site', filterSite)
      if (filterDept) params.set('departemen', filterDept)
      if (filterStatus) params.set('status_mcu', filterStatus)
      if (search) params.set('search', search)
      params.set('limit', '200')

      const res = await fetch(`/api/mcu/matrix?${params}`, { headers })
      const json = await res.json()

      if (!res.ok) throw new Error(json.error || 'Gagal load data')

      const data: McuRow[] = json.rows || json.data || []
      setRows(data)

      // Hitung stats
      const s: Stats = {
        total: data.length,
        aman: data.filter(r => r.status_expired === 'AMAN').length,
        akan_expired: data.filter(r => r.status_expired === 'AKAN_EXPIRED').length,
        expired: data.filter(r => r.status_expired === 'EXPIRED').length,
        belum_mcu: data.filter(r => r.status_expired === 'BELUM_MCU').length,
      }
      setStats(s)

      // Extract sites & depts unik
      const uniqueSites = [...new Set(data.map(r => r.site).filter(Boolean))].sort()
      const uniqueDepts = [...new Set(data.map(r => r.departemen).filter(Boolean))].sort()
      setSites(uniqueSites)
      setDepts(uniqueDepts)

    } catch (e: any) {
      setError(e.message || 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }, [filterSite, filterDept, filterStatus, search])

  useEffect(() => { fetchData() }, [fetchData])

  // ─── Filter client-side untuk search cepat ───────────────
  const filtered = rows.filter(r => {
    if (!search) return true
    const q = search.toLowerCase()
    return r.nama.toLowerCase().includes(q) || r.nrp.includes(q)
  })

  // ─── Navigate ────────────────────────────────────────────
  const handleNavigate = (path: string) => router.push(path)

  // ─── Toggle Accordion ────────────────────────────────────
  const toggleExpand = (nrp: string) => {
    setExpandedNrp(prev => prev === nrp ? null : nrp)
  }

  // ─── Export ──────────────────────────────────────────────
  const handleExport = async () => {
    try {
      const token = localStorage.getItem('btm_session_token_v1')
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      const params = new URLSearchParams()
      if (filterSite) params.set('site', filterSite)
      if (filterDept) params.set('departemen', filterDept)
      if (filterStatus) params.set('status_mcu', filterStatus)

      const res = await fetch(`/api/mcu/matrix/export?${params}`, { headers })
      if (!res.ok) throw new Error('Gagal export')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `monitoring-mcu-${new Date().toISOString().split('T')[0]}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      alert('Gagal export: ' + e.message)
    }
  }

  // ─── Render ──────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-24 sm:pb-8  bg-[#f4f7fa]" style={{ backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">

        {/* ── Header ── */}
        <div className="bg-white rounded-[2rem] shadow-xl p-5 border border-slate-100">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#003D79] rounded-2xl flex items-center justify-center shadow-lg">
                <HeartPulse className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-800 tracking-tight">Monitoring MCU</h1>
                <p className="text-xs text-slate-500">Medical Check Up — {stats.total} karyawan</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchData}
                className="p-2.5 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <button
                onClick={() => router.push('/dashboard/monitoring-mcu/new')}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#003D79] text-white rounded-xl text-sm font-bold hover:bg-[#002d5a] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Input MCU
              </button>
            </div>
          </div>
        </div>

        {/* ── Stats Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: stats.total, color: 'text-[#003D79]', bg: 'bg-blue-50', border: 'border-blue-100', onClick: () => setFilterStatus('') },
            { label: 'Aman', value: stats.aman, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100', onClick: () => setFilterStatus('FIT') },
            { label: 'Akan Expired', value: stats.akan_expired, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-100', onClick: () => setFilterStatus('AKAN_EXPIRED') },
            { label: 'Expired', value: stats.expired + stats.belum_mcu, color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-100', onClick: () => setFilterStatus('EXP_DATE') },
          ].map(s => (
            <button
              key={s.label}
              onClick={s.onClick}
              className={`${s.bg} ${s.border} border rounded-[1.5rem] p-4 text-left hover:shadow-md transition-all`}
            >
              <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-0.5">{s.label}</div>
            </button>
          ))}
        </div>

        {/* ── Filter Bar ── */}
        <div className="bg-white rounded-[1.5rem] shadow-md p-4 border border-slate-100 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a6a7e]" />
            <input
              type="text"
              placeholder="Cari nama atau NRP..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-[1.2rem] text-sm focus:outline-none focus:ring-2 focus:ring-[#003D79]/20 focus:border-[#003D79]"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap gap-2">
            <select
              value={filterSite}
              onChange={e => setFilterSite(e.target.value)}
              className="flex-1 min-w-[120px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-[1.2rem] text-sm focus:outline-none focus:ring-2 focus:ring-[#003D79]/20"
            >
              <option value="">Semua Site</option>
              {sites.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <select
              value={filterDept}
              onChange={e => setFilterDept(e.target.value)}
              className="flex-1 min-w-[120px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-[1.2rem] text-sm focus:outline-none focus:ring-2 focus:ring-[#003D79]/20"
            >
              <option value="">Semua Dept</option>
              {depts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>

            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="flex-1 min-w-[120px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-[1.2rem] text-sm focus:outline-none focus:ring-2 focus:ring-[#003D79]/20"
            >
              <option value="">Semua Status</option>
              <option value="FIT">✅ Aman</option>
              <option value="AKAN_EXPIRED">⚠️ Akan Expired</option>
              <option value="EXP_DATE">🔴 Expired</option>
              <option value="BELUM_MCU">⬜ Belum MCU</option>
            </select>
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
            <div>
              <div className="text-sm font-bold text-rose-700">Gagal memuat data</div>
              <div className="text-xs text-rose-600">{error}</div>
            </div>
            <button onClick={fetchData} className="ml-auto px-3 py-1.5 bg-rose-100 text-rose-700 rounded-xl text-xs font-bold hover:bg-rose-200">
              Retry
            </button>
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div className="bg-white rounded-[2rem] shadow-xl p-12 flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-[#003D79] animate-spin" />
            <div className="text-sm font-bold text-slate-500">Memuat data MCU...</div>
          </div>
        )}

        {/* ── Smart Table ── */}
        {!loading && !error && (
          <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">

            {/* Table Header */}
            <div className="hidden sm:grid bg-[#003D79] text-white text-[10px] font-black uppercase tracking-widest"
              style={{ gridTemplateColumns: '40px 1fr 80px 80px 80px 80px 100px 90px' }}>
              <div className="px-3 py-3 text-center">No</div>
              <div className="px-3 py-3">Karyawan</div>
              <div className="px-3 py-3 text-center">MCU 1</div>
              <div className="px-3 py-3 text-center">MCU 2</div>
              <div className="px-3 py-3 text-center">MCU 3</div>
              <div className="px-3 py-3 text-center">MCU 4</div>
              <div className="px-3 py-3 text-center">Berlaku s/d</div>
              <div className="px-3 py-3 text-center">Status</div>
            </div>

            {/* Empty State */}
            {filtered.length === 0 && (
              <div className="p-12 text-center">
                <HeartPulse className="w-12 h-12 text-[#1a2332] mx-auto mb-3" />
                <div className="text-sm font-bold text-[#5a6a7e]">Tidak ada data</div>
                <div className="text-xs text-[#5a6a7e]">Coba ubah filter pencarian</div>
              </div>
            )}

            {/* Rows */}
            <div className="divide-y divide-slate-100">
              {filtered.map((row, idx) => {
                const cfg = getExpiredConfig(row.status_expired, row.days_to_expired)
                const isExpanded = expandedNrp === row.nrp
                const cols = row.mcu_columns || []

                return (
                  <div key={row.nrp} className={`${cfg.bg} transition-colors`}>

                    {/* ── Row Desktop ── */}
                    <div
                      className="hidden sm:grid items-center cursor-pointer hover:brightness-95 transition-all"
                      style={{ gridTemplateColumns: '40px 1fr 80px 80px 80px 80px 100px 90px' }}
                      onClick={() => toggleExpand(row.nrp)}
                    >
                      {/* No */}
                      <div className="px-3 py-3 text-center text-xs font-bold text-slate-500">{idx + 1}</div>

                      {/* Karyawan */}
                      <div className="px-3 py-3">
                        <div className="font-bold text-sm text-slate-800">{row.nama}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>{row.nrp}</span>
                          <span>·</span>
                          <span>{row.jabatan || '-'}</span>
                          <span>·</span>
                          <span>{row.site || '-'}</span>
                        </div>
                      </div>

                      {/* MCU 1-4 */}
                      {[0, 1, 2, 3].map(i => (
                        <div key={i} className="px-2 py-3">
                          <McuCell col={cols[i] || { no: i + 1, id: null, tanggal: null, hasil: null, temuan_summary: null, status_mcu: null }} />
                        </div>
                      ))}

                      {/* Berlaku s/d */}
                      <div className="px-2 py-3 text-center">
                        <div className="text-[10px] font-bold text-slate-700">{formatDate(row.masa_berlaku)}</div>
                        {row.days_to_expired !== null && row.status_expired === 'AKAN_EXPIRED' && (
                          <div className="text-[9px] text-amber-600 font-bold">{row.days_to_expired}h lagi</div>
                        )}
                      </div>

                      {/* Status */}
                      <div className="px-2 py-3 flex items-center justify-center gap-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-black border ${cfg.badge}`}>
                          {cfg.icon}
                          {cfg.label}
                        </span>
                        {isExpanded
                          ? <ChevronUp className="w-3 h-3 text-[#5a6a7e]" />
                          : <ChevronDown className="w-3 h-3 text-[#5a6a7e]" />
                        }
                      </div>
                    </div>

                    {/* ── Row Mobile ── */}
                    <div
                      className="sm:hidden flex items-center gap-3 px-4 py-3 cursor-pointer"
                      onClick={() => toggleExpand(row.nrp)}
                    >
                      {/* Dot status */}
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-slate-800 truncate">{row.nama}</div>
                        <div className="text-[10px] text-slate-500">
                          {row.nrp} · {row.departemen || '-'} · {row.site || '-'}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          MCU terakhir: {formatDate(row.mcu_terakhir)} · Berlaku: {formatDate(row.masa_berlaku)}
                        </div>
                      </div>

                      {/* Badge + chevron */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-black border ${cfg.badge}`}>
                          {cfg.icon}
                          {cfg.label}
                        </span>
                        {isExpanded
                          ? <ChevronUp className="w-4 h-4 text-[#5a6a7e]" />
                          : <ChevronDown className="w-4 h-4 text-[#5a6a7e]" />
                        }
                      </div>
                    </div>

                    {/* ── Accordion Detail ── */}
                    {isExpanded && (
                      <AccordionDetail row={row} onNavigate={handleNavigate} />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Footer count */}
            {filtered.length > 0 && (
              <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 rounded-b-[2rem]">
                <div className="text-xs text-slate-500 text-center">
                  Menampilkan <span className="font-bold text-slate-700">{filtered.length}</span> dari <span className="font-bold text-slate-700">{rows.length}</span> karyawan
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    

      </div>
  )
}