// app/dashboard/monitoring-mcu-matrix/page.tsx
'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, Download, RefreshCw, Loader2, HeartPulse,
  AlertCircle, CheckCircle, Clock, Calendar, Users, ChevronRight
} from 'lucide-react'

interface McuColumn {
  no: number
  id: string | null
  tanggal: string | null
  hasil: string | null
  temuan_summary: string | null
}

interface Row {
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

function formatDate(d: string | null) {
  if (!d) return ''
  const date = new Date(d + 'T00:00:00')
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-')
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    FIT: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    FIT_WITH_NOTE: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    UNFIT: 'bg-rose-100 text-rose-700 border-rose-200',
    EXP_DATE: 'bg-rose-600 text-white border-rose-700',
    BELUM_MCU: 'bg-slate-100 text-slate-500 border-slate-200',
  }
  const label: Record<string, string> = {
    FIT: 'FIT',
    FIT_WITH_NOTE: 'FIT WITH NOTE',
    PENDING: 'PENDING',
    UNFIT: 'UNFIT',
    EXP_DATE: 'EXP DATE',
    BELUM_MCU: 'BELUM MCU',
  }
  return (
    <span className={`inline-block px-2 py-1 rounded-md text-[10px] font-black border ${map[status] || 'bg-slate-100 text-slate-600'}`}>
      {label[status] || status}
    </span>
  )
}

function MasaBerlakuBadge({ tanggal, days }: { tanggal: string | null, days: number | null }) {
  if (!tanggal) return <span className="text-xs text-slate-300">-</span>

  let cls = 'bg-emerald-100 text-emerald-700'
  if (days !== null) {
    if (days < 0) cls = 'bg-rose-600 text-white font-bold'
    else if (days <= 30) cls = 'bg-yellow-200 text-yellow-900 font-bold'
  }

  return (
    <span className={`inline-block px-2 py-1 rounded-md text-xs font-bold ${cls}`}>
      {formatDate(tanggal)}
    </span>
  )
}

export default function MonitoringMcuMatrixPage() {
  const router = useRouter()
  const [rows, setRows] = useState<Row[]>([])
  const [sites, setSites] = useState<string[]>([])
  const [summary, setSummary] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [isHO, setIsHO] = useState(false)

  const [search, setSearch] = useState('')
  const [filterSite, setFilterSite] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('btm_session_token_v1') : null
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filterSite) params.set('site', filterSite)
      if (filterDept) params.set('departemen', filterDept)
      if (filterStatus) params.set('status_mcu', filterStatus)

      const res = await fetch(`/api/mcu/matrix?${params}`, { headers })
      const json = await res.json()
      if (json.ok) {
        setRows(json.rows || [])
        setSites(json.sites || [])
        setSummary(json.summary || {})
        setIsHO(json.isHO)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [search, filterSite, filterDept, filterStatus])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleExport() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('btm_session_token_v1') : null
    const params = new URLSearchParams()
    if (filterSite) params.set('site', filterSite)
    if (filterDept) params.set('departemen', filterDept)
    if (token) params.set('_token', token)

    // Trigger download langsung
    window.open(`/api/mcu/matrix/export?${params}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-[#f4f7fa]" style={{ backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
      <div className="max-w-[1600px] mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div className="bg-gradient-to-br from-[#003D79] to-[#0056b3] rounded-[2rem] shadow-2xl p-6 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
                <HeartPulse className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight">Monitoring Matrix MCU</h1>
                <p className="text-blue-100/80 text-sm mt-1">History MCU per karyawan (MCU 1, MCU 2, dst)</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={fetchData}
                className="px-4 py-2.5 bg-white/15 backdrop-blur rounded-xl hover:bg-white/25 font-bold text-sm flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
              <button
                onClick={handleExport}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg"
              >
                <Download className="w-4 h-4" /> Export Excel
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: 'Total', value: summary.total_karyawan || 0, icon: Users, color: 'blue' },
            { label: 'Belum MCU', value: summary.belum_mcu || 0, icon: AlertCircle, color: 'slate' },
            { label: 'FIT', value: summary.fit || 0, icon: CheckCircle, color: 'emerald' },
            { label: 'Fit W/Note', value: summary.fit_with_note || 0, icon: CheckCircle, color: 'yellow' },
            { label: 'Pending', value: summary.pending || 0, icon: Clock, color: 'amber' },
            { label: 'Akan Expired', value: summary.akan_expired || 0, icon: Calendar, color: 'orange' },
            { label: 'Expired', value: summary.expired || 0, icon: AlertCircle, color: 'rose' },
          ].map(s => {
            const Icon = s.icon
            return (
              <div key={s.label} className="bg-white p-4 rounded-2xl shadow-lg">
                <Icon className={`w-4 h-4 text-${s.color}-600 mb-2`} />
                <div className="text-2xl font-black text-slate-800">{s.value}</div>
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-1">{s.label}</div>
              </div>
            )
          })}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-[1.5rem] shadow-xl p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari NRP / Nama..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003D79]/20"
            />
          </div>

          {isHO && (
            <select
              value={filterSite}
              onChange={e => setFilterSite(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
            >
              <option value="">Semua Site</option>
              {sites.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}

          <select
            value={filterDept}
            onChange={e => setFilterDept(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
          >
            <option value="">Semua Dept</option>
            <option value="Staff">Staff</option>
            <option value="Plant">Plant</option>
            <option value="Operator">Operator</option>
          </select>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
          >
            <option value="">Semua Status</option>
            <option value="BELUM_MCU">Belum MCU</option>
            <option value="FIT">FIT</option>
            <option value="FIT_WITH_NOTE">Fit With Note</option>
            <option value="PENDING">Pending</option>
            <option value="EXP_DATE">Exp Date</option>
            <option value="UNFIT">Unfit</option>
          </select>
        </div>

        {/* Table Matrix */}
        <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-[#003D79]" />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <HeartPulse className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-semibold">Tidak ada data</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-[#003D79] text-white">
                  <tr>
                    <th className="p-3 text-center font-black text-xs" rowSpan={1}>NO</th>
                    <th className="p-3 text-left font-black text-xs">NAMA</th>
                    {isHO && <th className="p-3 text-center font-black text-xs">SITE</th>}
                    <th className="p-3 text-center font-black text-xs bg-blue-800">MCU 1</th>
                    <th className="p-3 text-center font-black text-xs bg-blue-800">MCU 2</th>
                    <th className="p-3 text-center font-black text-xs bg-blue-800">MCU 3</th>
                    <th className="p-3 text-center font-black text-xs bg-blue-800">MCU 4</th>
                    <th className="p-3 text-center font-black text-xs bg-blue-800">MCU 5</th>
                    <th className="p-3 text-center font-black text-xs">MCU TERAKHIR</th>
                    <th className="p-3 text-center font-black text-xs">MASA BERLAKU</th>
                    <th className="p-3 text-center font-black text-xs">STATUS KARYAWAN</th>
                    <th className="p-3 text-center font-black text-xs">STATUS MCU</th>
                    <th className="p-3 text-center font-black text-xs"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr key={r.nrp} className="border-b border-slate-100 hover:bg-blue-50/30 transition">
                      <td className="p-3 text-center text-slate-500 text-xs font-bold">{idx + 1}</td>
                      <td className="p-3">
                        <div className="font-bold text-slate-800 text-sm">{r.nama}</div>
                        <div className="text-[10px] text-slate-500">{r.nrp} · {r.jabatan || '-'}</div>
                      </td>
                      {isHO && (
                        <td className="p-3 text-center text-xs font-semibold text-slate-600">{r.site || '-'}</td>
                      )}
                      {r.mcu_columns.map((col, i) => (
                        <td key={i} className="p-3 text-center">
                          {col.tanggal ? (
                            <button
                              onClick={() => col.id && router.push(`/dashboard/monitoring-mcu/${col.id}`)}
                              className="text-xs font-semibold text-slate-700 hover:text-[#003D79] hover:underline"
                              title={col.hasil || ''}
                            >
                              {formatDate(col.tanggal)}
                            </button>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      ))}
                      <td className="p-3 text-center text-xs font-bold text-slate-700">
                        {formatDate(r.mcu_terakhir)}
                      </td>
                      <td className="p-3 text-center">
                        <MasaBerlakuBadge tanggal={r.masa_berlaku} days={r.days_to_expired} />
                      </td>
                      <td className="p-3 text-center">
                        <span className="inline-block px-2 py-1 rounded-md text-[10px] font-black bg-emerald-500 text-white">
                          {r.status_karyawan || 'Aktif'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <StatusPill status={r.status_mcu} />
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => router.push(`/dashboard/monitoring-mcu/karyawan/${r.nrp}`)}
                          className="text-[10px] font-black text-[#003D79] hover:underline uppercase tracking-widest whitespace-nowrap"
                          title="Timeline MCU"
                        >
                          📊
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="text-xs text-slate-500 text-center">
          💡 Klik tanggal MCU untuk lihat detail · Klik 📊 untuk timeline lengkap karyawan
        </div>
      </div>
    </div>
  )
}