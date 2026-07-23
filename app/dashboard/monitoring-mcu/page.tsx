// app/dashboard/monitoring-mcu/page.tsx
'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ClipboardPlus, Search, Filter, ChevronRight,
  Plus, Download, RefreshCw, AlertCircle,
  CheckCircle, Clock, XCircle, Loader2,
  HeartPulse, Calendar, User, Building2
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────
interface McuFinding {
  id: string
  jenis_temuan: string
  status_followup: 'BELUM_FU' | 'SUDAH_FU' | 'DITOLAK' | 'SELESAI'
}

interface McuItem {
  id: string
  nrp: string
  nama_karyawan: string
  tanggal_mcu: string
  jenis_mcu: string
  hasil: string
  tanggal_expired: string
  status_mcu: 'FIT' | 'OPEN' | 'CLOSED' | 'PERLU_PERHATIAN'
  butuh_followup: boolean
  followup_deadline: string
  temuan_summary: string
  foto_catatan_url: string
  mcu_findings: McuFinding[]
  employees: { jabatan: string; departemen: string; site: string }
}

// ─── Status Badge ─────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    FIT:             { label: 'FIT',            cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle className="w-3 h-3" /> },
    OPEN:            { label: 'OPEN',           cls: 'bg-amber-100 text-amber-700 border-amber-200',       icon: <Clock className="w-3 h-3" /> },
    CLOSED:          { label: 'CLOSED',         cls: 'bg-blue-100 text-blue-700 border-blue-200',          icon: <CheckCircle className="w-3 h-3" /> },
    PERLU_PERHATIAN: { label: 'PERHATIAN',      cls: 'bg-rose-100 text-rose-700 border-rose-200',          icon: <AlertCircle className="w-3 h-3" /> },
    BELUM_FU:        { label: 'Belum FU',       cls: 'bg-slate-100 text-slate-600 border-slate-200',       icon: <Clock className="w-3 h-3" /> },
    SUDAH_FU:        { label: 'Menunggu Verif', cls: 'bg-orange-100 text-orange-700 border-orange-200',    icon: <Clock className="w-3 h-3" /> },
    SELESAI:         { label: 'Selesai',        cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle className="w-3 h-3" /> },
    DITOLAK:         { label: 'Ditolak',        cls: 'bg-rose-100 text-rose-700 border-rose-200',          icon: <XCircle className="w-3 h-3" /> },
  }
  const s = map[status] || { label: status, cls: 'bg-slate-100 text-slate-600 border-slate-200', icon: null }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${s.cls}`}>
      {s.icon}{s.label}
    </span>
  )
}

// ─── Main Page ────────────────────────────────────────────────
export default function MonitoringMcuPage() {
  const router = useRouter()
  const [data, setData] = useState<McuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [sites, setSites] = useState<string[]>([])
  const [isSuperOrHO, setIsSuperOrHO] = useState(false)
  const [count, setCount] = useState(0)

  // Filters
  const [search, setSearch] = useState('')
  const [filterSite, setFilterSite] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [page, setPage] = useState(1)
  const LIMIT = 30

  // Modal tambah MCU
  const [showAddModal, setShowAddModal] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const token = typeof window !== 'undefined'
        ? localStorage.getItem('btm_session_token_v1') : null
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
        ...(search && { search }),
        ...(filterSite && { site: filterSite }),
        ...(filterStatus && { status: filterStatus }),
      })

      const res = await fetch(`/api/mcu/monitoring?${params}`, { headers })
      const json = await res.json()
      if (json.ok) {
        setData(json.data)
        setCount(json.count)
        setSites(json.sites || [])
        setIsSuperOrHO(json.isSuperOrHO)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [search, filterSite, filterStatus, page])

  useEffect(() => { fetchData() }, [fetchData])

  // Stats
  const statFit     = data.filter(d => d.status_mcu === 'FIT').length
  const statOpen    = data.filter(d => d.status_mcu === 'OPEN').length
  const statClosed  = data.filter(d => d.status_mcu === 'CLOSED').length
  const statExpired = data.filter(d => {
    if (!d.tanggal_expired) return false
    return new Date(d.tanggal_expired) < new Date()
  }).length

  return (
    <div className="min-h-screen bg-[#f4f7fa]" style={{ backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* ── Header ── */}
        <div className="bg-white rounded-[2rem] shadow-xl p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#003D79] flex items-center justify-center shadow-lg">
              <ClipboardPlus className="text-white w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-800">Monitoring MCU</h1>
              <p className="text-sm text-slate-500">Medical Check-Up Karyawan</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-[#003D79] text-white px-5 py-2.5 rounded-[1.2rem] font-bold text-sm hover:bg-[#002D5F] transition-colors shadow-lg"
          >
            <Plus className="w-4 h-4" />
            Input MCU
          </button>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'FIT', value: statFit, color: 'emerald', icon: <CheckCircle className="w-5 h-5" /> },
            { label: 'OPEN (Perlu FU)', value: statOpen, color: 'amber', icon: <Clock className="w-5 h-5" /> },
            { label: 'CLOSED', value: statClosed, color: 'blue', icon: <CheckCircle className="w-5 h-5" /> },
            { label: 'Expired', value: statExpired, color: 'rose', icon: <AlertCircle className="w-5 h-5" /> },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-[1.5rem] shadow-xl p-5">
              <div className={`w-10 h-10 rounded-xl bg-${s.color}-100 flex items-center justify-center text-${s.color}-600 mb-3`}>
                {s.icon}
              </div>
              <div className="text-2xl font-black text-slate-800">{s.value}</div>
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Filter Bar ── */}
        <div className="bg-white rounded-[1.5rem] shadow-xl p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Cari nama / NRP..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-[1.2rem] text-sm focus:outline-none focus:ring-2 focus:ring-[#003D79]/20"
            />
          </div>

          {isSuperOrHO && (
            <select
              value={filterSite}
              onChange={e => { setFilterSite(e.target.value); setPage(1) }}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-[1.2rem] text-sm focus:outline-none"
            >
              <option value="">Semua Site</option>
              {sites.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}

          <select
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-[1.2rem] text-sm focus:outline-none"
          >
            <option value="">Semua Status</option>
            <option value="FIT">FIT</option>
            <option value="OPEN">OPEN (Perlu FU)</option>
            <option value="CLOSED">CLOSED</option>
            <option value="PERLU_PERHATIAN">Perlu Perhatian</option>
          </select>

          <button onClick={fetchData} className="p-2.5 bg-slate-100 rounded-[1.2rem] hover:bg-slate-200 transition-colors">
            <RefreshCw className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        {/* ── Tabel ── */}
        <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-[#003D79]" />
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <HeartPulse className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-semibold">Belum ada data MCU</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#003D79]/5 border-b border-slate-100">
                    <th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-500">No</th>
                    <th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-500">Karyawan</th>
                    {isSuperOrHO && <th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-500">Site</th>}
                    <th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-500">Tgl MCU</th>
                    <th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-500">Expired</th>
                    <th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-500">Temuan</th>
                    <th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-500">Status</th>
                    <th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-500">Bukti FU</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item, idx) => {
                    const isExpired = item.tanggal_expired && new Date(item.tanggal_expired) < new Date()
                    const pendingFu = item.mcu_findings?.filter(f => f.status_followup === 'SUDAH_FU').length || 0

                    return (
                      <tr
                        key={item.id}
                        className="border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/dashboard/monitoring-mcu/${item.id}`)}
                      >
                        <td className="px-4 py-3 text-slate-400 text-xs">{(page - 1) * LIMIT + idx + 1}</td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-800">{item.nama_karyawan}</div>
                          <div className="text-[11px] text-slate-400">{item.nrp} • {item.employees?.jabatan}</div>
                        </td>
                        {isSuperOrHO && (
                          <td className="px-4 py-3 text-xs text-slate-500">{item.employees?.site || '-'}</td>
                        )}
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {item.tanggal_mcu ? new Date(item.tanggal_mcu).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold ${isExpired ? 'text-rose-600' : 'text-slate-600'}`}>
                            {item.tanggal_expired
                              ? new Date(item.tanggal_expired).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                              : '-'}
                          </span>
                          {isExpired && <div className="text-[9px] text-rose-500 font-bold">EXPIRED</div>}
                        </td>
                        <td className="px-4 py-3">
                          {item.mcu_findings?.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {item.mcu_findings.map(f => (
                                <StatusBadge key={f.id} status={f.status_followup} />
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={item.status_mcu} />
                          {pendingFu > 0 && (
                            <div className="text-[9px] text-orange-600 font-bold mt-1">
                              {pendingFu} menunggu verif
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {item.foto_catatan_url ? (
                            <a
                              href={item.foto_catatan_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-[#003D79] text-xs font-semibold hover:underline"
                            >
                              <Download className="w-3 h-3" />PDF
                            </a>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <ChevronRight className="w-4 h-4 text-slate-300" />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {count > LIMIT && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
              <span className="text-xs text-slate-500">Total {count} data</span>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-4 py-1.5 text-sm font-semibold bg-slate-100 rounded-full disabled:opacity-40"
                >Prev</button>
                <span className="px-4 py-1.5 text-sm font-bold bg-[#003D79] text-white rounded-full">{page}</span>
                <button
                  disabled={page * LIMIT >= count}
                  onClick={() => setPage(p => p + 1)}
                  className="px-4 py-1.5 text-sm font-semibold bg-slate-100 rounded-full disabled:opacity-40"
                >Next</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Tambah MCU */}
      {showAddModal && (
        <AddMcuModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { setShowAddModal(false); fetchData() }}
        />
      )}
    </div>
  )
}

// ─── Modal Tambah MCU (v2 - Search Autocomplete) ─────────────
function AddMcuModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{ nrp: string; nama: string; jabatan: string; site: string }>>([])
  const [selectedEmp, setSelectedEmp] = useState<{ nrp: string; nama: string; jabatan: string; site: string } | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [loadingSearch, setLoadingSearch] = useState(false)

  const [form, setForm] = useState({
    tanggal_mcu: new Date().toISOString().split('T')[0],
    jenis_mcu: 'MCU Periodik',
    hasil: 'FIT',
    dokter: '',
    rumah_sakit: '',
    tanggal_berlaku: '',
    tanggal_expired: '',
    catatan_hrga: '',
    keterangan: '',
  })
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 1) {
      setSearchResults([])
      return
    }
    if (selectedEmp && selectedEmp.nama === searchQuery) return

    const timer = setTimeout(async () => {
      setLoadingSearch(true)
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('btm_session_token_v1') : null
        const headers: Record<string, string> = {}
        if (token) headers['Authorization'] = `Bearer ${token}`

        const res = await fetch(`/api/employees/search?q=${encodeURIComponent(searchQuery)}`, { headers })
        const json = await res.json()
        if (json.ok) {
          setSearchResults(json.data)
          setShowDropdown(true)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoadingSearch(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, selectedEmp])

  const handleSelectEmp = (emp: { nrp: string; nama: string; jabatan: string; site: string }) => {
    setSelectedEmp(emp)
    setSearchQuery(emp.nama)
    setShowDropdown(false)
    setError('')
  }

  const handleClearEmp = () => {
    setSelectedEmp(null)
    setSearchQuery('')
    setSearchResults([])
    setShowDropdown(false)
  }

  const handleSubmit = async () => {
    if (!selectedEmp) {
      setError('Pilih karyawan dulu')
      return
    }
    setSaving(true)
    setError('')

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('btm_session_token_v1') : null
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      const fd = new FormData()
      fd.append('nrp', selectedEmp.nrp)
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v) })
      if (file) fd.append('file', file)

      const res = await fetch('/api/mcu/create', {
        method: 'POST',
        headers,
        body: fd,
      })
      const json = await res.json()
      if (json.ok) {
        onSuccess()
      } else {
        setError(json.error || 'Gagal simpan')
      }
    } catch (err) {
      console.error(err)
      setError('Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-slate-800">Input MCU Baru</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full font-bold text-slate-500">✕</button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-[1.2rem] text-rose-600 text-sm font-semibold">
              {error}
            </div>
          )}

          {/* ── Search Karyawan (Autocomplete) ── */}
          <div className="mb-4 relative">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 block">
              Cari Karyawan (Nama / NRP) *
            </label>
            <div className="relative">
              <input
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value)
                  if (selectedEmp) setSelectedEmp(null)
                }}
                onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                placeholder="Ketik nama atau NRP..."
                className="w-full px-4 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-[1.2rem] text-sm focus:outline-none focus:ring-2 focus:ring-[#003D79]/20"
                autoComplete="off"
              />
              {selectedEmp && (
                <button
                  onClick={handleClearEmp}
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 font-bold"
                >
                  ✕
                </button>
              )}
              {loadingSearch && !selectedEmp && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <svg className="animate-spin h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Dropdown suggestion */}
            {showDropdown && searchResults.length > 0 && !selectedEmp && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-[1.2rem] shadow-xl max-h-64 overflow-y-auto">
                {searchResults.map(emp => (
                  <button
                    key={emp.nrp}
                    type="button"
                    onClick={() => handleSelectEmp(emp)}
                    className="w-full px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-100 last:border-b-0 transition-colors"
                  >
                    <div className="font-bold text-slate-800 text-sm">{emp.nama}</div>
                    <div className="text-xs text-slate-500">
                      {emp.nrp} · {emp.jabatan || '-'} · {emp.site || '-'}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* No result */}
            {showDropdown && searchQuery.length > 0 && !loadingSearch && searchResults.length === 0 && !selectedEmp && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-[1.2rem] shadow-xl p-4 text-center text-sm text-slate-400">
                Tidak ada karyawan ditemukan
              </div>
            )}

            {/* Preview selected */}
            {selectedEmp && (
              <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="text-sm font-bold text-emerald-800">✓ {selectedEmp.nama}</div>
                <div className="text-xs text-emerald-600">
                  {selectedEmp.nrp} · {selectedEmp.jabatan || '-'} · {selectedEmp.site || '-'}
                </div>
              </div>
            )}
          </div>

          {/* ── Form Fields ── */}
          {[
            { key: 'tanggal_mcu', label: 'Tanggal MCU *', type: 'date' },
            { key: 'jenis_mcu', label: 'Jenis MCU', type: 'text', placeholder: 'MCU Periodik / Pre-Employ / dll' },
            { key: 'hasil', label: 'Hasil *', type: 'select', options: ['FIT','FIT BERSYARAT','TIDAK FIT'] },
            { key: 'dokter', label: 'Dokter', type: 'text', placeholder: 'Nama dokter' },
            { key: 'rumah_sakit', label: 'Rumah Sakit / Klinik', type: 'text' },
            { key: 'tanggal_berlaku', label: 'Tanggal Berlaku', type: 'date' },
            { key: 'tanggal_expired', label: 'Tanggal Expired', type: 'date' },
            { key: 'catatan_hrga', label: 'Catatan HRGA', type: 'textarea' },
          ].map(f => (
            <div key={f.key} className="mb-3">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 block">{f.label}</label>
              {f.type === 'select' ? (
                <select
                  value={form[f.key as keyof typeof form]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-[1.2rem] text-sm focus:outline-none"
                >
                  {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : f.type === 'textarea' ? (
                <textarea
                  value={form[f.key as keyof typeof form]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-[1.2rem] text-sm focus:outline-none resize-none"
                  rows={2}
                />
              ) : (
                <input
                  type={f.type}
                  value={form[f.key as keyof typeof form]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={(f as { placeholder?: string }).placeholder}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-[1.2rem] text-sm focus:outline-none"
                />
              )}
            </div>
          ))}

          {/* ── Upload File ── */}
          <div className="mb-6">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 block">
              Upload Hasil MCU (PDF/JPG/PNG, maks 3MB)
            </label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={e => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-[#003D79] file:text-white file:text-xs file:font-bold"
            />
            {file && (
              <p className="text-xs text-emerald-600 mt-1 font-semibold">
                ✓ {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          {/* ── Action Buttons ── */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-[1.2rem] font-bold text-sm hover:bg-slate-200"
            >
              Batal
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !selectedEmp}
              className="flex-1 py-3 bg-[#003D79] text-white rounded-[1.2rem] font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#002D5F] flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Menyimpan...
                </>
              ) : 'Simpan MCU'}
            </button>
          </div>

          {/* Info kenapa button disabled */}
          {!selectedEmp && (
            <p className="text-center text-xs text-slate-400 mt-2 italic">
              💡 Pilih karyawan dulu untuk mengaktifkan tombol simpan
            </p>
          )}
        </div>
      </div>
    </div>
  )
}