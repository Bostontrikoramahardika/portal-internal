'use client'

import AppFooter from '@/app/components/AppFooter'

import PageHeader from "@/app/components/PageHeader";
// app/dashboard/kelola-apd/page.tsx — v2.0 (6 tab lengkap)
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Shield, CheckCircle, XCircle, Clock, Package,
  BarChart3, Calendar, Plus, Edit2, Trash2, ChevronDown,
  ChevronUp, Search, Filter, RefreshCw, AlertTriangle,
  TrendingUp, Users, Box, ArrowUpCircle, ArrowDownCircle,
  FileSpreadsheet, Check, X, Info, Save, Eye
} from 'lucide-react'

// ════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════
type Tab = 'verifikasi' | 'monitoring' | 'master' | 'distribusi' | 'stok' | 'plan'

interface ApdMaster {
  id: string
  jenis_apd: string
  life_time_bulan: number
  ukuran_tersedia: string[]
  warna_tersedia: string[]
  icon: string
  urutan: number
  active: boolean
  keterangan: string | null
}

interface StokSummaryRow {
  ukuran: string
  warna: string
  qty: number
  status: 'OK' | 'MENIPIS' | 'HABIS'
}

interface StokSummary {
  jenis_apd: string
  icon: string
  total_qty: number
  rows: StokSummaryRow[]
}

interface StokLog {
  id: string
  jenis_apd: string
  ukuran: string | null
  warna: string | null
  qty: number
  tipe: 'masuk' | 'keluar'
  tanggal: string
  keterangan: string | null
  ref_type: string | null
  created_by: string
  created_at: string
}

interface PlanItem {
  jenis_apd: string
  icon: string
  reason: string
  qty: number
  last_terima: string | null
  expired_at: string | null
  override: any
  ukuran_override: string | null
}

interface PlanRow {
  nrp: string
  name: string
  site: string
  departemen: string
  jabatan: string
  items: PlanItem[]
}

interface PlanSummary {
  total_karyawan: number
  total_item: number
  belum_terima: number
  jatuh_tempo: number
  expired: number
  override_add: number
}

interface Employee {
  nrp: string
  name: string
  site: string
  departemen: string
}

// ════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════
function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('btm_session_token_v1') : null
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

function formatTgl(dateStr: string | null) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getReasonBadge(reason: string) {
  if (reason === 'BELUM_TERIMA') return { label: 'Belum Terima', cls: 'bg-blue-100 text-blue-700' }
  if (reason === 'EXPIRED') return { label: 'Expired', cls: 'bg-rose-100 text-rose-700' }
  if (reason === 'JATUH_TEMPO') return { label: 'Jatuh Tempo', cls: 'bg-amber-100 text-amber-700' }
  if (reason?.includes('OVERRIDE')) return { label: 'Override', cls: 'bg-purple-100 text-purple-700' }
  return { label: reason, cls: 'bg-slate-100 text-slate-600' }
}

function getCurrentBulan() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function getNextBulan() {
  const now = new Date()
  now.setMonth(now.getMonth() + 1)
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

// ════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════
export default function KelolaApdPage() {
  const [activeTab, setActiveTab] = useState<Tab>('verifikasi')

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'verifikasi', label: 'Verifikasi', icon: <CheckCircle size={15} /> },
    { key: 'monitoring', label: 'Monitoring', icon: <BarChart3 size={15} /> },
    { key: 'master', label: 'Master', icon: <Shield size={15} /> },
    { key: 'distribusi', label: 'Distribusi', icon: <Package size={15} /> },
    { key: 'stok', label: 'Stok', icon: <Box size={15} /> },
    { key: 'plan', label: 'Plan Bulanan', icon: <Calendar size={15} /> },
  ]

  return (
    <div className="min-h-screen bg-[#f4f7fa] p-2 sm:p-3 lg:p-4 pb-24 text-slate-800">
      <PageHeader title="Kelola Apd" backUrl="/dashboard" />

      {/* ── Header ── */}
      <div className="hidden">
        <h1 className="text-white text-2xl font-black tracking-tight">🦺 Kelola APD</h1>
        <p className="text-blue-200 text-sm mt-1">Manajemen Alat Pelindung Diri</p>

        {/* Tab bar */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1 scrollbar-hide">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all
                ${activeTab === t.key
                  ? 'bg-white text-[#003D79] shadow-lg'
                  : 'bg-white/20 text-white/80 hover:bg-white/30'
                }`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="px-4 py-4">
        {activeTab === 'verifikasi' && <TabVerifikasi />}
        {activeTab === 'monitoring' && <TabMonitoring />}
        {activeTab === 'master' && <TabMaster />}
        {activeTab === 'distribusi' && <TabDistribusi />}
        {activeTab === 'stok' && <TabStok />}
        {activeTab === 'plan' && <TabPlan />}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════
// TAB 1: VERIFIKASI (existing — preserved)
// ════════════════════════════════════════════
function TabVerifikasi() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('PENDING')
  const [filterJenis, setFilterJenis] = useState('')
  const [modalItem, setModalItem] = useState<any>(null)
  const [modalAction, setModalAction] = useState<'approve' | 'reject' | 'detail' | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [processing, setProcessing] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ status: filterStatus })
      if (filterJenis) params.set('jenis', filterJenis)
      const res = await fetch(`/api/apd/verify?${params}`, { headers: getAuthHeaders() })
      const json = await res.json()
      setData(json.data || [])
    } catch { setData([]) }
    setLoading(false)
  }, [filterStatus, filterJenis])

  useEffect(() => { load() }, [load])

  const showToast = (msg: string, type: 'ok' | 'err') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleAction = async () => {
    if (!modalItem || !modalAction) return
    if (modalAction === 'reject' && !rejectReason.trim()) {
      showToast('Alasan penolakan wajib diisi', 'err'); return
    }
    setProcessing(true)
    try {
      const res = await fetch('/api/apd/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          id: modalItem.id,
          action: modalAction === 'approve' ? 'approve' : 'reject',
          reject_reason: rejectReason
        })
      })
      const json = await res.json()
      if (json.ok) {
        showToast(modalAction === 'approve' ? '✅ Request disetujui' : '❌ Request ditolak', 'ok')
        setModalItem(null); setModalAction(null); setRejectReason('')
        load()
      } else showToast(json.error || 'Gagal', 'err')
    } catch { showToast('Error jaringan', 'err') }
    setProcessing(false)
  }

  const pendingCount = data.filter(d => d.status === 'PENDING').length

  return (
    <div className="space-y-4">
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-white text-sm font-bold shadow-lg
          ${toast.type === 'ok' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['PENDING', 'VERIFIED', 'REJECTED'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all
              ${filterStatus === s
                ? s === 'PENDING' ? 'bg-[#003d79] text-white'
                  : s === 'VERIFIED' ? 'bg-emerald-600 text-white'
                  : 'bg-rose-600 text-white'
                : 'bg-white text-slate-600 shadow'}`}>
            {s} {s === 'PENDING' && pendingCount > 0 && `(${pendingCount})`}
          </button>
        ))}
        <button onClick={load} className="ml-auto p-2 bg-white rounded-full shadow">
          <RefreshCw size={14} className="text-slate-500" />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#5a6a7e]">Memuat data...</div>
      ) : data.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-2">📭</div>
          <div className="text-slate-500 text-sm">Tidak ada request {filterStatus.toLowerCase()}</div>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map(item => (
            <div key={item.id} className="bg-white rounded-[1.5rem] shadow-xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-[#003D79] text-sm">{item.nama_karyawan}</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#5a6a7e]">{item.nrp}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase
                      ${item.status === 'PENDING' ? 'bg-amber-100 text-amber-700'
                        : item.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-rose-100 text-rose-700'}`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    <span className="font-bold">{item.jenis_apd}</span>
                    {item.ukuran && ` · ${item.ukuran}`}
                    {item.warna && ` · ${item.warna}`}
                    {` · ${item.jumlah} pcs`}
                  </div>
                  <div className="text-[10px] text-[#5a6a7e] mt-0.5">
                    Terima: {formatTgl(item.tanggal_terima)}
                    {item.keterangan && ` · "${item.keterangan}"`}
                  </div>
                  {item.status === 'REJECTED' && item.reject_reason && (
                    <div className="text-[10px] text-rose-600 mt-1 font-medium">
                      ❌ {item.reject_reason}
                    </div>
                  )}
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  {item.status === 'PENDING' && (
                    <>
                      <button onClick={() => { setModalItem(item); setModalAction('approve') }}
                        className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors">
                        <Check size={16} />
                      </button>
                      <button onClick={() => { setModalItem(item); setModalAction('reject'); setRejectReason('') }}
                        className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors">
                        <X size={16} />
                      </button>
                    </>
                  )}
                  <button onClick={() => { setModalItem(item); setModalAction('detail') }}
                    className="p-2 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 transition-colors">
                    <Eye size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Approve/Reject/Detail */}
      {modalItem && modalAction && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-md p-6 shadow-2xl">
            <h3 className="font-black text-[#003D79] text-lg mb-4">
              {modalAction === 'approve' ? '✅ Setujui Request'
                : modalAction === 'reject' ? '❌ Tolak Request'
                : '📋 Detail Request'}
            </h3>
            <div className="space-y-2 text-sm mb-4">
              <div><span className="text-[#5a6a7e] text-xs">Karyawan</span>
                <div className="font-bold">{modalItem.nama_karyawan} ({modalItem.nrp})</div>
              </div>
              <div><span className="text-[#5a6a7e] text-xs">APD</span>
                <div className="font-bold">{modalItem.jenis_apd}
                  {modalItem.ukuran && ` · ${modalItem.ukuran}`}
                  {modalItem.warna && ` · ${modalItem.warna}`}
                  {` · ${modalItem.jumlah} pcs`}
                </div>
              </div>
              <div><span className="text-[#5a6a7e] text-xs">Tgl Terima</span>
                <div className="font-bold">{formatTgl(modalItem.tanggal_terima)}</div>
              </div>
              {modalItem.keterangan && (
                <div><span className="text-[#5a6a7e] text-xs">Keterangan</span>
                  <div className="font-bold">{modalItem.keterangan}</div>
                </div>
              )}
            </div>

            {modalAction === 'reject' && (
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Alasan penolakan (wajib)..."
                className="w-full border border-slate-200 rounded-[1.2rem] p-3 text-sm mb-4 resize-none"
                rows={3}
              />
            )}

            <div className="flex gap-3">
              <button onClick={() => { setModalItem(null); setModalAction(null); setRejectReason('') }}
                className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-[1.2rem]">
                Tutup
              </button>
              {modalAction !== 'detail' && (
                <button onClick={handleAction} disabled={processing}
                  className={`flex-1 py-3 text-white font-bold rounded-[1.2rem] transition-all
                    ${modalAction === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'}
                    ${processing ? 'opacity-50' : ''}`}>
                  {processing ? '...' : modalAction === 'approve' ? 'Setujui' : 'Tolak'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════
// TAB 2: MONITORING (existing — preserved)
// ════════════════════════════════════════════
function TabMonitoring() {
  const [data, setData] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [jenisList, setJenisList] = useState<string[]>([])
  const [sites, setSites] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterSite, setFilterSite] = useState('')
  const [drawerItem, setDrawerItem] = useState<any>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterSite) params.set('site', filterSite)
      if (search) params.set('search', search)
      const res = await fetch(`/api/apd/monitoring?${params}`, { headers: getAuthHeaders() })
      const json = await res.json()
      setData(json.rows || [])
      setSummary(json.summary || null)
      setJenisList(json.jenisList || [])
      setSites(json.sites || [])
    } catch { setData([]) }
    setLoading(false)
  }, [filterSite, search])

  useEffect(() => {
    const t = setTimeout(load, 400)
    return () => clearTimeout(t)
  }, [load])

  const getStatusDot = (status: string) => {
    if (status === 'AMAN') return 'bg-emerald-400'
    if (status === 'GANTI') return 'bg-amber-400'
    if (status === 'EXPIRED') return 'bg-rose-500'
    return 'bg-slate-300'
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Total Karyawan', val: summary.total, icon: '👥', cls: 'text-[#003D79]' },
            { label: 'APD Aman', val: summary.aman, icon: '✅', cls: 'text-emerald-600' },
            { label: 'Perlu Ganti', val: summary.ganti, icon: '⚠️', cls: 'text-amber-600' },
            { label: 'Expired', val: summary.expired, icon: '🚨', cls: 'text-rose-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-[1.5rem] shadow-xl p-4">
              <div className="text-2xl">{s.icon}</div>
              <div className={`text-2xl font-black ${s.cls}`}>{s.val}</div>
              <div className="text-[10px] text-[#5a6a7e] font-bold uppercase tracking-widest">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5a6a7e]" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama / NRP..."
            className="w-full pl-9 pr-4 py-2.5 bg-white rounded-[1.2rem] text-sm shadow border-0 outline-none" />
        </div>
        <select value={filterSite} onChange={e => setFilterSite(e.target.value)}
          className="px-3 py-2 bg-white rounded-[1.2rem] text-sm shadow border-0 outline-none">
          <option value="">Semua Site</option>
          {sites.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#5a6a7e]">Memuat data...</div>
      ) : (
        <div className="space-y-2">
          {data.map(row => (
            <button key={row.nrp} onClick={() => setDrawerItem(row)}
              className="w-full bg-white rounded-[1.5rem] shadow-xl p-4 text-left hover:shadow-2xl transition-all">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-black text-[#003D79] text-sm">{row.name}</div>
                  <div className="text-[10px] text-[#5a6a7e]">{row.nrp} · {row.site}</div>
                </div>
                <div className="flex gap-1 flex-wrap justify-end max-w-[120px]">
                  {row.apd_status?.slice(0, 6).map((s: any, i: number) => (
                    <div key={i} title={s.jenis}
                      className={`w-3 h-3 rounded-full ${getStatusDot(s.status)}`} />
                  ))}
                </div>
              </div>
              <div className="mt-2 bg-slate-50 rounded-xl h-1.5 overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full transition-all"
                  style={{ width: `${row.pct_aman || 0}%` }} />
              </div>
              <div className="text-[9px] text-[#5a6a7e] mt-0.5">{row.pct_aman || 0}% APD aman</div>
            </button>
          ))}
        </div>
      )}

      {/* Drawer detail */}
      {drawerItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => setDrawerItem(null)}>
          <div className="bg-white rounded-t-[2rem] w-full max-h-[80vh] overflow-y-auto p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
            <h3 className="font-black text-[#003D79] text-lg">{drawerItem.name}</h3>
            <p className="text-xs text-[#5a6a7e] mb-4">{drawerItem.nrp} · {drawerItem.site} · {drawerItem.departemen}</p>
            <div className="space-y-2">
              {drawerItem.apd_status?.map((s: any) => (
                <div key={s.jenis} className="flex items-center justify-between py-2 border-b border-slate-50">
                  <div>
                    <div className="text-sm font-bold">{s.icon} {s.jenis}</div>
                    <div className="text-[10px] text-[#5a6a7e]">
                      {s.last_terima ? `Terima: ${formatTgl(s.last_terima)}` : 'Belum pernah terima'}
                      {s.expired_at && ` · Exp: ${formatTgl(s.expired_at)}`}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase
                    ${s.status === 'AMAN' ? 'bg-emerald-100 text-emerald-700'
                      : s.status === 'GANTI' ? 'bg-amber-100 text-amber-700'
                      : s.status === 'EXPIRED' ? 'bg-rose-100 text-rose-700'
                      : 'bg-slate-100 text-slate-500'}`}>
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
            <button onClick={() => setDrawerItem(null)}
              className="w-full mt-4 py-3 bg-slate-100 text-slate-600 font-bold rounded-[1.2rem]">
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════
// TAB 3: MASTER APD
// ════════════════════════════════════════════
function TabMaster() {
  const [data, setData] = useState<ApdMaster[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<ApdMaster | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [processing, setProcessing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<ApdMaster | null>(null)

  // Form state
  const [form, setForm] = useState({
    jenis_apd: '', life_time_bulan: '12', icon: '🦺',
    ukuran_input: '', warna_input: '', keterangan: ''
  })
  const [ukuranList, setUkuranList] = useState<string[]>([])
  const [warnaList, setWarnaList] = useState<string[]>([])

  const showToast = (msg: string, type: 'ok' | 'err') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000)
  }

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/apd/master', { headers: getAuthHeaders() })
      const json = await res.json()
      setData(json.data || [])
    } catch { setData([]) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openAdd = () => {
    setEditItem(null)
    setForm({ jenis_apd: '', life_time_bulan: '12', icon: '🦺', ukuran_input: '', warna_input: '', keterangan: '' })
    setUkuranList([]); setWarnaList([])
    setShowForm(true)
  }

  const openEdit = (item: ApdMaster) => {
    setEditItem(item)
    setForm({
      jenis_apd: item.jenis_apd, life_time_bulan: String(item.life_time_bulan),
      icon: item.icon, ukuran_input: '', warna_input: '', keterangan: item.keterangan || ''
    })
    setUkuranList(item.ukuran_tersedia || [])
    setWarnaList(item.warna_tersedia || [])
    setShowForm(true)
  }

  const addUkuran = () => {
    const val = form.ukuran_input.trim().toUpperCase()
    if (val && !ukuranList.includes(val)) {
      setUkuranList(prev => [...prev, val])
      setForm(f => ({ ...f, ukuran_input: '' }))
    }
  }

  const addWarna = () => {
    const val = form.warna_input.trim()
    if (val && !warnaList.includes(val)) {
      setWarnaList(prev => [...prev, val])
      setForm(f => ({ ...f, warna_input: '' }))
    }
  }

  const handleSave = async () => {
    if (!form.jenis_apd.trim()) { showToast('Nama APD wajib diisi', 'err'); return }
    if (!form.life_time_bulan || Number(form.life_time_bulan) < 1) {
      showToast('Lifetime minimal 1 bulan', 'err'); return
    }
    setProcessing(true)
    try {
      const body: any = {
        jenis_apd: form.jenis_apd.trim(),
        life_time_bulan: Number(form.life_time_bulan),
        icon: form.icon || '🦺',
        ukuran_tersedia: ukuranList,
        warna_tersedia: warnaList,
        keterangan: form.keterangan || null
      }
      if (editItem) body.id = editItem.id

      const res = await fetch('/api/apd/master', {
        method: editItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(body)
      })
      const json = await res.json()
      if (json.ok) {
        showToast(editItem ? '✅ APD diperbarui' : '✅ APD ditambahkan', 'ok')
        setShowForm(false); load()
      } else showToast(json.error || 'Gagal', 'err')
    } catch { showToast('Error jaringan', 'err') }
    setProcessing(false)
  }

  const handleToggleActive = async (item: ApdMaster) => {
    try {
      const res = await fetch('/api/apd/master', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ id: item.id, active: !item.active })
      })
      const json = await res.json()
      if (json.ok) { showToast(`APD ${item.active ? 'dinonaktifkan' : 'diaktifkan'}`, 'ok'); load() }
      else showToast(json.error || 'Gagal', 'err')
    } catch { showToast('Error', 'err') }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    try {
      const res = await fetch(`/api/apd/master?id=${confirmDelete.id}`, {
        method: 'DELETE', headers: getAuthHeaders()
      })
      const json = await res.json()
      if (json.ok) { showToast('✅ ' + json.message, 'ok'); setConfirmDelete(null); load() }
      else showToast(json.error || 'Gagal', 'err')
    } catch { showToast('Error', 'err') }
  }

  const ICON_OPTIONS = ['🦺', '👷', '👟', '🥽', '😷', '🎧', '👕', '🧤', '🪖', '🔵']

  return (
    <div className="space-y-4">
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-white text-sm font-bold shadow-lg
          ${toast.type === 'ok' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-black text-[#003D79]">Master APD</h2>
          <p className="text-xs text-[#5a6a7e]">{data.length} jenis terdaftar</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-1.5 bg-[#003D79] text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
          <Plus size={14} /> Tambah
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#5a6a7e]">Memuat data...</div>
      ) : (
        <div className="space-y-3">
          {data.map(item => (
            <div key={item.id} className={`bg-white rounded-[1.5rem] shadow-xl p-4 
              ${!item.active ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-3">
                <div className="text-3xl">{item.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-[#003D79]">{item.jenis_apd}</span>
                    {!item.active && (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-black rounded-full uppercase">
                        Nonaktif
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    ⏱ Lifetime: <strong>{item.life_time_bulan} bulan</strong>
                  </div>
                  {item.ukuran_tersedia?.length > 0 && (
                    <div className="text-[10px] text-[#5a6a7e] mt-1">
                      Ukuran: {item.ukuran_tersedia.join(', ')}
                    </div>
                  )}
                  {item.warna_tersedia?.length > 0 && (
                    <div className="text-[10px] text-[#5a6a7e]">
                      Warna: {item.warna_tersedia.join(', ')}
                    </div>
                  )}
                  {item.keterangan && (
                    <div className="text-[10px] text-[#5a6a7e] italic mt-0.5">{item.keterangan}</div>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <button onClick={() => openEdit(item)}
                    className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleToggleActive(item)}
                    className={`p-2 rounded-xl transition-colors
                      ${item.active ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                        : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}>
                    {item.active ? <XCircle size={14} /> : <CheckCircle size={14} />}
                  </button>
                  <button onClick={() => setConfirmDelete(item)}
                    className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal Add/Edit */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="font-black text-[#003D79] text-lg mb-4">
                {editItem ? '✏️ Edit APD' : '➕ Tambah APD Baru'}
              </h3>

              <div className="space-y-4">
                {/* Icon picker */}
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#5a6a7e] block mb-2">Icon</label>
                  <div className="flex gap-2 flex-wrap">
                    {ICON_OPTIONS.map(ic => (
                      <button key={ic} onClick={() => setForm(f => ({ ...f, icon: ic }))}
                        className={`text-2xl p-2 rounded-xl transition-all
                          ${form.icon === ic ? 'bg-blue-100 ring-2 ring-[#003D79]' : 'bg-slate-50 hover:bg-slate-100'}`}>
                        {ic}
                      </button>
                    ))}
                    <input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                      placeholder="Emoji lain"
                      className="w-16 text-center border border-slate-200 rounded-xl p-2 text-sm" />
                  </div>
                </div>

                {/* Nama */}
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#5a6a7e] block mb-1">Nama APD *</label>
                  <input value={form.jenis_apd} onChange={e => setForm(f => ({ ...f, jenis_apd: e.target.value }))}
                    placeholder="contoh: Helm Safety"
                    className="w-full border border-slate-200 rounded-[1.2rem] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#003D79]/20" />
                </div>

                {/* Lifetime */}
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#5a6a7e] block mb-1">
                    Lifetime (bulan) *
                  </label>
                  <input type="number" min={1} value={form.life_time_bulan}
                    onChange={e => setForm(f => ({ ...f, life_time_bulan: e.target.value }))}
                    className="w-full border border-slate-200 rounded-[1.2rem] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#003D79]/20" />
                </div>

                {/* Ukuran */}
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#5a6a7e] block mb-1">
                    Ukuran Tersedia
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input value={form.ukuran_input}
                      onChange={e => setForm(f => ({ ...f, ukuran_input: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && addUkuran()}
                      placeholder="S, M, L, XL, 38, 39..."
                      className="flex-1 border border-slate-200 rounded-[1.2rem] px-4 py-2.5 text-sm outline-none" />
                    <button onClick={addUkuran}
                      className="px-4 py-2 bg-[#003D79] text-white rounded-[1.2rem] text-sm font-bold">
                      +
                    </button>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {ukuranList.map(u => (
                      <span key={u} className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs font-bold">
                        {u}
                        <button onClick={() => setUkuranList(prev => prev.filter(x => x !== u))}>
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Warna */}
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#5a6a7e] block mb-1">
                    Warna Tersedia
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input value={form.warna_input}
                      onChange={e => setForm(f => ({ ...f, warna_input: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && addWarna()}
                      placeholder="Kuning, Merah, Hitam..."
                      className="flex-1 border border-slate-200 rounded-[1.2rem] px-4 py-2.5 text-sm outline-none" />
                    <button onClick={addWarna}
                      className="px-4 py-2 bg-[#003D79] text-white rounded-[1.2rem] text-sm font-bold">
                      +
                    </button>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {warnaList.map(w => (
                      <span key={w} className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full text-xs font-bold">
                        {w}
                        <button onClick={() => setWarnaList(prev => prev.filter(x => x !== w))}>
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Keterangan */}
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#5a6a7e] block mb-1">Keterangan</label>
                  <textarea value={form.keterangan} onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))}
                    placeholder="Opsional..."
                    className="w-full border border-slate-200 rounded-[1.2rem] px-4 py-3 text-sm outline-none resize-none"
                    rows={2} />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowForm(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-[1.2rem]">
                  Batal
                </button>
                <button onClick={handleSave} disabled={processing}
                  className={`flex-1 py-3 bg-[#003D79] text-white font-bold rounded-[1.2rem] transition-all
                    ${processing ? 'opacity-50' : 'hover:bg-[#002D5F]'}`}>
                  {processing ? '...' : editItem ? 'Simpan' : 'Tambah'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-sm p-6 shadow-2xl">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">{confirmDelete.icon}</div>
              <h3 className="font-black text-[#003D79]">Hapus APD?</h3>
              <p className="text-sm text-slate-500 mt-1">
                <strong>{confirmDelete.jenis_apd}</strong>
                <br />Kalau ada history pemakaian, akan dinonaktifkan (tidak dihapus).
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-[1.2rem]">
                Batal
              </button>
              <button onClick={handleDelete}
                className="flex-1 py-3 bg-rose-600 text-white font-bold rounded-[1.2rem]">
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════
// TAB 4: DISTRIBUSI
// ════════════════════════════════════════════
function TabDistribusi() {
  const [masterList, setMasterList] = useState<ApdMaster[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [riwayat, setRiwayat] = useState<any[]>([])
  const [loadingRiwayat, setLoadingRiwayat] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [filterBulan, setFilterBulan] = useState(getCurrentBulan())

  // Form multi-row distribusi
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0])
  const [keterangan, setKeterangan] = useState('')
  const [kurangiStok, setKurangiStok] = useState(true)
  const [rows, setRows] = useState([
    { nrp: '', jenis_apd: '', ukuran: '', warna: '', jumlah: '1', empSearch: '', empResults: [] as Employee[], showEmpDrop: false }
  ])

  const showToast = (msg: string, type: 'ok' | 'err') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    // Load master APD
    fetch('/api/apd/master?active_only=true', { headers: getAuthHeaders() })
      .then(r => r.json()).then(j => setMasterList(j.data || []))
  }, [])

  useEffect(() => {
    loadRiwayat()
  }, [filterBulan])

  const loadRiwayat = async () => {
    setLoadingRiwayat(true)
    try {
      const res = await fetch(`/api/apd/distribusi?bulan=${filterBulan}&limit=50`, { headers: getAuthHeaders() })
      const json = await res.json()
      setRiwayat(json.data || [])
    } catch { setRiwayat([]) }
    setLoadingRiwayat(false)
  }

  // Search karyawan realtime
  const searchEmp = async (q: string, rowIdx: number) => {
    if (q.length < 2) {
      setRows(prev => prev.map((r, i) => i === rowIdx ? { ...r, empResults: [], showEmpDrop: false } : r))
      return
    }
    try {
      const res = await fetch(
        `/api/employees?search=${encodeURIComponent(q)}&limit=8&active=true`,
        { headers: getAuthHeaders() }
      )
      const json = await res.json()
      const emps: Employee[] = (json.data || json.employees || []).map((e: any) => ({
        nrp: e.nrp, name: e.name, site: e.site, departemen: e.departemen || e.department
      }))
      setRows(prev => prev.map((r, i) => i === rowIdx ? { ...r, empResults: emps, showEmpDrop: true } : r))
    } catch { }
  }

  const selectEmp = (emp: Employee, rowIdx: number) => {
    setRows(prev => prev.map((r, i) => i === rowIdx
      ? { ...r, nrp: emp.nrp, empSearch: `${emp.name} (${emp.nrp})`, empResults: [], showEmpDrop: false }
      : r
    ))
  }

  const updateRow = (idx: number, field: string, val: string) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r))
  }

  const addRow = () => setRows(prev => [...prev, {
    nrp: '', jenis_apd: '', ukuran: '', warna: '', jumlah: '1',
    empSearch: '', empResults: [], showEmpDrop: false
  }])

  const removeRow = (idx: number) => setRows(prev => prev.filter((_, i) => i !== idx))

  const getUkuranOptions = (jenis: string) => masterList.find(m => m.jenis_apd === jenis)?.ukuran_tersedia || []
  const getWarnaOptions = (jenis: string) => masterList.find(m => m.jenis_apd === jenis)?.warna_tersedia || []

  const handleSubmit = async () => {
    const validRows = rows.filter(r => r.nrp && r.jenis_apd && Number(r.jumlah) > 0)
    if (validRows.length === 0) { showToast('Minimal 1 baris distribusi valid', 'err'); return }

    setProcessing(true)
    try {
      const res = await fetch('/api/apd/distribusi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          distribusi: validRows.map(r => ({
            nrp: r.nrp, jenis_apd: r.jenis_apd,
            ukuran: r.ukuran || null, warna: r.warna || null, jumlah: Number(r.jumlah)
          })),
          tanggal,
          kurangi_stok: kurangiStok,
          keterangan
        })
      })
      const json = await res.json()
      if (json.ok) {
        const errCount = json.errors?.length || 0
        showToast(
          `✅ ${json.inserted} distribusi berhasil${errCount > 0 ? ` · ${errCount} gagal` : ''}`,
          errCount > 0 ? 'err' : 'ok'
        )
        setShowForm(false)
        setRows([{ nrp: '', jenis_apd: '', ukuran: '', warna: '', jumlah: '1', empSearch: '', empResults: [], showEmpDrop: false }])
        setKeterangan('')
        loadRiwayat()
      } else showToast(json.error || 'Gagal', 'err')
    } catch { showToast('Error jaringan', 'err') }
    setProcessing(false)
  }

  return (
    <div className="space-y-4">
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-white text-sm font-bold shadow-lg
          ${toast.type === 'ok' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-black text-[#003D79]">Distribusi APD</h2>
          <p className="text-xs text-[#5a6a7e]">Input langsung → VERIFIED</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-[#003D79] text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
          <Plus size={14} /> Distribusi
        </button>
      </div>

      {/* Filter riwayat */}
      <div className="flex gap-2 items-center">
        <input type="month" value={filterBulan} onChange={e => setFilterBulan(e.target.value)}
          className="flex-1 border border-slate-200 rounded-[1.2rem] px-4 py-2.5 text-sm bg-white shadow outline-none" />
        <button onClick={loadRiwayat} className="p-2.5 bg-white rounded-[1.2rem] shadow">
          <RefreshCw size={14} className="text-slate-500" />
        </button>
      </div>

      {/* Riwayat */}
      {loadingRiwayat ? (
        <div className="text-center py-8 text-[#5a6a7e]">Memuat...</div>
      ) : riwayat.length === 0 ? (
        <div className="text-center py-10">
          <div className="text-3xl mb-2">📦</div>
          <div className="text-[#5a6a7e] text-sm">Belum ada distribusi bulan ini</div>
        </div>
      ) : (
        <div className="space-y-2">
          {riwayat.map(item => (
            <div key={item.id} className="bg-white rounded-[1.5rem] shadow-xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="font-black text-[#003D79] text-sm">{item.nama_karyawan}</div>
                  <div className="text-[10px] text-[#5a6a7e]">{item.nrp}</div>
                  <div className="text-xs text-slate-600 mt-1">
                    <span className="font-bold">{item.jenis_apd}</span>
                    {item.ukuran && ` · ${item.ukuran}`}
                    {item.warna && ` · ${item.warna}`}
                    {` · ${item.jumlah} pcs`}
                  </div>
                  <div className="text-[10px] text-[#5a6a7e] mt-0.5">{formatTgl(item.tanggal_terima)}</div>
                </div>
                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[9px] font-black rounded-full uppercase">
                  HR Input
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white rounded-t-[2rem] w-full max-h-[95vh] overflow-y-auto shadow-2xl">
            <div className="p-6">
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
              <h3 className="font-black text-[#003D79] text-lg mb-4">📦 Input Distribusi APD</h3>

              {/* Tanggal + Keterangan */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#5a6a7e] block mb-1">Tanggal</label>
                  <input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)}
                    className="w-full border border-slate-200 rounded-[1.2rem] px-3 py-2.5 text-sm outline-none" />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#5a6a7e] block mb-1">Keterangan</label>
                  <input value={keterangan} onChange={e => setKeterangan(e.target.value)}
                    placeholder="Opsional"
                    className="w-full border border-slate-200 rounded-[1.2rem] px-3 py-2.5 text-sm outline-none" />
                </div>
              </div>

              {/* Toggle kurangi stok */}
              <div className="flex items-center gap-3 mb-4 bg-amber-50 rounded-[1.2rem] p-3">
                <button onClick={() => setKurangiStok(!kurangiStok)}
                  className={`relative w-10 h-6 rounded-full transition-colors ${kurangiStok ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform
                    ${kurangiStok ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
                <div>
                  <div className="text-xs font-bold text-slate-700">Kurangi stok otomatis</div>
                  <div className="text-[9px] text-[#5a6a7e]">
                    {kurangiStok ? 'Stok berkurang saat save' : 'Stok tidak berkurang'}
                  </div>
                </div>
              </div>

              {/* Rows */}
              <div className="space-y-3 mb-4">
                {rows.map((row, idx) => (
                  <div key={idx} className="bg-slate-50 rounded-[1.5rem] p-4 relative">
                    <div className="text-[9px] font-black uppercase tracking-widest text-[#5a6a7e] mb-2">
                      Baris {idx + 1}
                    </div>

                    {/* Karyawan search */}
                    <div className="relative mb-2">
                      <label className="text-[9px] font-black text-[#5a6a7e] block mb-1">Karyawan *</label>
                      <input
                        value={row.empSearch}
                        onChange={e => {
                          updateRow(idx, 'empSearch', e.target.value)
                          updateRow(idx, 'nrp', '')
                          searchEmp(e.target.value, idx)
                        }}
                        placeholder="Ketik nama atau NRP..."
                        className="w-full border border-slate-200 rounded-[1.2rem] px-3 py-2.5 text-sm bg-white outline-none"
                      />
                      {row.showEmpDrop && row.empResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 bg-white border border-slate-100 rounded-[1.2rem] shadow-xl z-20 mt-1 overflow-hidden">
                          {row.empResults.map(emp => (
                            <button key={emp.nrp} onClick={() => selectEmp(emp, idx)}
                              className="w-full px-4 py-2.5 text-left hover:bg-blue-50 transition-colors">
                              <div className="text-sm font-bold text-[#003D79]">{emp.name}</div>
                              <div className="text-[10px] text-[#5a6a7e]">{emp.nrp} · {emp.site}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {/* Jenis APD */}
                      <div>
                        <label className="text-[9px] font-black text-[#5a6a7e] block mb-1">Jenis APD *</label>
                        <select value={row.jenis_apd} onChange={e => updateRow(idx, 'jenis_apd', e.target.value)}
                          className="w-full border border-slate-200 rounded-[1.2rem] px-3 py-2.5 text-sm bg-white outline-none">
                          <option value="">-- Pilih --</option>
                          {masterList.map(m => <option key={m.jenis_apd} value={m.jenis_apd}>{m.icon} {m.jenis_apd}</option>)}
                        </select>
                      </div>
                      {/* Jumlah */}
                      <div>
                        <label className="text-[9px] font-black text-[#5a6a7e] block mb-1">Jumlah *</label>
                        <input type="number" min={1} value={row.jumlah}
                          onChange={e => updateRow(idx, 'jumlah', e.target.value)}
                          className="w-full border border-slate-200 rounded-[1.2rem] px-3 py-2.5 text-sm bg-white outline-none" />
                      </div>
                      {/* Ukuran */}
                      <div>
                        <label className="text-[9px] font-black text-[#5a6a7e] block mb-1">Ukuran</label>
                        {getUkuranOptions(row.jenis_apd).length > 0 ? (
                          <select value={row.ukuran} onChange={e => updateRow(idx, 'ukuran', e.target.value)}
                            className="w-full border border-slate-200 rounded-[1.2rem] px-3 py-2.5 text-sm bg-white outline-none">
                            <option value="">-</option>
                            {getUkuranOptions(row.jenis_apd).map(u => <option key={u}>{u}</option>)}
                          </select>
                        ) : (
                          <input value={row.ukuran} onChange={e => updateRow(idx, 'ukuran', e.target.value)}
                            placeholder="-"
                            className="w-full border border-slate-200 rounded-[1.2rem] px-3 py-2.5 text-sm bg-white outline-none" />
                        )}
                      </div>
                      {/* Warna */}
                      <div>
                        <label className="text-[9px] font-black text-[#5a6a7e] block mb-1">Warna</label>
                        {getWarnaOptions(row.jenis_apd).length > 0 ? (
                          <select value={row.warna} onChange={e => updateRow(idx, 'warna', e.target.value)}
                            className="w-full border border-slate-200 rounded-[1.2rem] px-3 py-2.5 text-sm bg-white outline-none">
                            <option value="">-</option>
                            {getWarnaOptions(row.jenis_apd).map(w => <option key={w}>{w}</option>)}
                          </select>
                        ) : (
                          <input value={row.warna} onChange={e => updateRow(idx, 'warna', e.target.value)}
                            placeholder="-"
                            className="w-full border border-slate-200 rounded-[1.2rem] px-3 py-2.5 text-sm bg-white outline-none" />
                        )}
                      </div>
                    </div>

                    {rows.length > 1 && (
                      <button onClick={() => removeRow(idx)}
                        className="absolute top-3 right-3 p-1.5 bg-rose-50 text-rose-500 rounded-xl">
                        <X size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Tambah baris */}
              <button onClick={addRow}
                className="w-full py-2.5 border-2 border-dashed border-[#003D79]/30 text-[#003D79] rounded-[1.5rem] text-sm font-bold mb-4 hover:border-[#003D79]/50 transition-colors">
                + Tambah Baris
              </button>

              <div className="flex gap-3">
                <button onClick={() => setShowForm(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-[1.2rem]">
                  Batal
                </button>
                <button onClick={handleSubmit} disabled={processing}
                  className={`flex-1 py-3 bg-[#003D79] text-white font-bold rounded-[1.2rem] transition-all
                    ${processing ? 'opacity-50' : 'hover:bg-[#002D5F]'}`}>
                  {processing ? 'Menyimpan...' : `💾 Simpan (${rows.filter(r => r.nrp && r.jenis_apd).length} data)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════
// TAB 5: STOK
// ════════════════════════════════════════════
function TabStok() {
  const [summary, setSummary] = useState<StokSummary[]>([])
  const [log, setLog] = useState<StokLog[]>([])
  const [viewMode, setViewMode] = useState<'summary' | 'log'>('summary')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [masterList, setMasterList] = useState<ApdMaster[]>([])
  const [processing, setProcessing] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [expandedJenis, setExpandedJenis] = useState<string | null>(null)

  // Form state
  const [formTanggal, setFormTanggal] = useState(new Date().toISOString().split('T')[0])
  const [formKet, setFormKet] = useState('')
  const [formRows, setFormRows] = useState([{ jenis_apd: '', ukuran: '', warna: '', qty: '1' }])

  const showToast = (msg: string, type: 'ok' | 'err') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000)
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const [summaryRes, logRes, masterRes] = await Promise.all([
        fetch('/api/apd/stok?view=summary', { headers: getAuthHeaders() }),
        fetch('/api/apd/stok?view=log', { headers: getAuthHeaders() }),
        fetch('/api/apd/master?active_only=true', { headers: getAuthHeaders() })
      ])
      const [sj, lj, mj] = await Promise.all([summaryRes.json(), logRes.json(), masterRes.json()])
      setSummary(sj.data || [])
      setLog(lj.data || [])
      setMasterList(mj.data || [])
    } catch { }
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const updateFormRow = (idx: number, field: string, val: string) => {
    setFormRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r))
  }

  const handleSubmitStok = async () => {
    const validRows = formRows.filter(r => r.jenis_apd && Number(r.qty) > 0)
    if (validRows.length === 0) { showToast('Minimal 1 item valid', 'err'); return }

    setProcessing(true)
    try {
      const res = await fetch('/api/apd/stok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          items: validRows.map(r => ({ jenis_apd: r.jenis_apd, ukuran: r.ukuran || null, warna: r.warna || null, qty: Number(r.qty) })),
          tanggal: formTanggal,
          keterangan: formKet
        })
      })
      const json = await res.json()
      if (json.ok) {
        showToast(`✅ ${json.count} stok masuk dicatat`, 'ok')
        setShowForm(false)
        setFormRows([{ jenis_apd: '', ukuran: '', warna: '', qty: '1' }])
        setFormKet('')
        loadData()
      } else showToast(json.error || 'Gagal', 'err')
    } catch { showToast('Error jaringan', 'err') }
    setProcessing(false)
  }

  const getStatusColor = (status: string) => {
    if (status === 'OK') return 'text-emerald-600 bg-emerald-50'
    if (status === 'MENIPIS') return 'text-amber-600 bg-amber-50'
    return 'text-rose-600 bg-rose-50'
  }

  return (
    <div className="space-y-4">
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-white text-sm font-bold shadow-lg
          ${toast.type === 'ok' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-black text-[#003D79]">Stok APD</h2>
          <p className="text-xs text-[#5a6a7e]">Gudang & Mutasi</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
          <ArrowUpCircle size={14} /> Stok Masuk
        </button>
      </div>

      {/* View toggle */}
      <div className="flex gap-2">
        {(['summary', 'log'] as const).map(v => (
          <button key={v} onClick={() => setViewMode(v)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all
              ${viewMode === v ? 'bg-[#003D79] text-white shadow' : 'bg-white text-slate-600 shadow'}`}>
            {v === 'summary' ? '📊 Ringkasan' : '📋 Log Mutasi'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#5a6a7e]">Memuat data...</div>
      ) : viewMode === 'summary' ? (
        /* Summary View */
        <div className="space-y-3">
          {summary.map(item => (
            <div key={item.jenis_apd} className="bg-white rounded-[1.5rem] shadow-xl overflow-hidden">
              <button className="w-full p-4 flex items-center justify-between"
                onClick={() => setExpandedJenis(expandedJenis === item.jenis_apd ? null : item.jenis_apd)}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{item.icon}</span>
                  <div className="text-left">
                    <div className="font-black text-[#003D79] text-sm">{item.jenis_apd}</div>
                    <div className="text-xs text-slate-500">Total: <strong>{item.total_qty}</strong> pcs</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase
                    ${item.total_qty <= 0 ? 'bg-rose-100 text-rose-700'
                      : item.total_qty <= 5 ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-100 text-emerald-700'}`}>
                    {item.total_qty <= 0 ? 'HABIS' : item.total_qty <= 5 ? 'MENIPIS' : 'OK'}
                  </span>
                  {expandedJenis === item.jenis_apd ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </button>

              {expandedJenis === item.jenis_apd && (
                <div className="px-4 pb-4 border-t border-slate-50">
                  <div className="mt-3 space-y-1.5">
                    {item.rows.filter(r => r.ukuran !== '-' || r.warna !== '-' || r.qty !== 0).map((r, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5 px-3 bg-slate-50 rounded-xl">
                        <div className="text-xs text-slate-600">
                          {r.ukuran !== '-' && <span className="font-bold mr-2">{r.ukuran}</span>}
                          {r.warna !== '-' && <span className="text-[#5a6a7e]">{r.warna}</span>}
                          {r.ukuran === '-' && r.warna === '-' && <span className="text-[#5a6a7e]">Stok umum</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm">{r.qty}</span>
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${getStatusColor(r.status)}`}>
                            {r.status}
                          </span>
                        </div>
                      </div>
                    ))}
                    {item.rows.every(r => r.qty === 0) && (
                      <div className="text-center text-xs text-[#5a6a7e] py-2">Stok kosong</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* Log View */
        <div className="space-y-2">
          {log.length === 0 ? (
            <div className="text-center py-10 text-[#5a6a7e]">Belum ada mutasi stok</div>
          ) : log.map(item => (
            <div key={item.id} className="bg-white rounded-[1.5rem] shadow-xl p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-xl ${item.tipe === 'masuk' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                    {item.tipe === 'masuk'
                      ? <ArrowUpCircle size={16} className="text-emerald-600" />
                      : <ArrowDownCircle size={16} className="text-rose-600" />}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-[#003D79]">{item.jenis_apd}</div>
                    <div className="text-[10px] text-[#5a6a7e]">
                      {item.ukuran && `${item.ukuran} · `}
                      {item.warna && `${item.warna} · `}
                      {formatTgl(item.tanggal)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-black ${item.tipe === 'masuk' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {item.tipe === 'masuk' ? '+' : '-'}{item.qty}
                  </div>
                  <div className="text-[9px] text-[#5a6a7e]">
                    {item.ref_type || item.tipe}
                  </div>
                </div>
              </div>
              {item.keterangan && (
                <div className="text-[10px] text-[#5a6a7e] mt-2 italic">{item.keterangan}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Form Stok Masuk */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white rounded-t-[2rem] w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6">
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
              <h3 className="font-black text-[#003D79] text-lg mb-4">📦 Input Stok Masuk</h3>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#5a6a7e] block mb-1">Tanggal</label>
                  <input type="date" value={formTanggal} onChange={e => setFormTanggal(e.target.value)}
                    className="w-full border border-slate-200 rounded-[1.2rem] px-3 py-2.5 text-sm outline-none" />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#5a6a7e] block mb-1">Keterangan</label>
                  <input value={formKet} onChange={e => setFormKet(e.target.value)}
                    placeholder="No PO, Supplier..."
                    className="w-full border border-slate-200 rounded-[1.2rem] px-3 py-2.5 text-sm outline-none" />
                </div>
              </div>

              <div className="space-y-3 mb-4">
                {formRows.map((row, idx) => (
                  <div key={idx} className="bg-slate-50 rounded-[1.5rem] p-4 relative">
                    <div className="text-[9px] font-black uppercase tracking-widest text-[#5a6a7e] mb-2">Item {idx + 1}</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2">
                        <label className="text-[9px] font-black text-[#5a6a7e] block mb-1">Jenis APD *</label>
                        <select value={row.jenis_apd} onChange={e => updateFormRow(idx, 'jenis_apd', e.target.value)}
                          className="w-full border border-slate-200 rounded-[1.2rem] px-3 py-2.5 text-sm bg-white outline-none">
                          <option value="">-- Pilih --</option>
                          {masterList.map(m => <option key={m.jenis_apd} value={m.jenis_apd}>{m.icon} {m.jenis_apd}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-[#5a6a7e] block mb-1">Ukuran</label>
                        {masterList.find(m => m.jenis_apd === row.jenis_apd)?.ukuran_tersedia?.length
                          ? (
                            <select value={row.ukuran} onChange={e => updateFormRow(idx, 'ukuran', e.target.value)}
                              className="w-full border border-slate-200 rounded-[1.2rem] px-3 py-2.5 text-sm bg-white outline-none">
                              <option value="">-</option>
                              {masterList.find(m => m.jenis_apd === row.jenis_apd)!.ukuran_tersedia.map(u => <option key={u}>{u}</option>)}
                            </select>
                          ) : (
                            <input value={row.ukuran} onChange={e => updateFormRow(idx, 'ukuran', e.target.value)}
                              placeholder="-"
                              className="w-full border border-slate-200 rounded-[1.2rem] px-3 py-2.5 text-sm bg-white outline-none" />
                          )}
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-[#5a6a7e] block mb-1">Qty *</label>
                        <input type="number" min={1} value={row.qty} onChange={e => updateFormRow(idx, 'qty', e.target.value)}
                          className="w-full border border-slate-200 rounded-[1.2rem] px-3 py-2.5 text-sm bg-white outline-none" />
                      </div>
                    </div>
                    {formRows.length > 1 && (
                      <button onClick={() => setFormRows(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-3 right-3 p-1.5 bg-rose-50 text-rose-500 rounded-xl">
                        <X size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button onClick={() => setFormRows(prev => [...prev, { jenis_apd: '', ukuran: '', warna: '', qty: '1' }])}
                className="w-full py-2.5 border-2 border-dashed border-emerald-300 text-emerald-600 rounded-[1.5rem] text-sm font-bold mb-4">
                + Tambah Item
              </button>

              <div className="flex gap-3">
                <button onClick={() => setShowForm(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-[1.2rem]">
                  Batal
                </button>
                <button onClick={handleSubmitStok} disabled={processing}
                  className={`flex-1 py-3 bg-emerald-600 text-white font-bold rounded-[1.2rem] transition-all
                    ${processing ? 'opacity-50' : 'hover:bg-emerald-700'}`}>
                  {processing ? 'Menyimpan...' : '💾 Simpan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════
// TAB 6: PLAN BULANAN
// ════════════════════════════════════════════
function TabPlan() {
  const [bulan, setBulan] = useState(getNextBulan())
  const [data, setData] = useState<PlanRow[]>([])
  const [summary, setSummary] = useState<PlanSummary | null>(null)
  const [sites, setSites] = useState<string[]>([])
  const [filterSite, setFilterSite] = useState('')
  const [loading, setLoading] = useState(false)
  const [expandedNrp, setExpandedNrp] = useState<string | null>(null)
  const [overrideModal, setOverrideModal] = useState<{ nrp: string; name: string; jenis_apd: string; current: any } | null>(null)
  const [overrideAction, setOverrideAction] = useState<'ADD' | 'REMOVE' | 'EDIT_QTY'>('REMOVE')
  const [overrideQty, setOverrideQty] = useState('1')
  const [overrideKet, setOverrideKet] = useState('')
  const [processing, setProcessing] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  const showToast = (msg: string, type: 'ok' | 'err') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000)
  }

  const loadPlan = async () => {
    if (!bulan) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ bulan })
      if (filterSite) params.set('site', filterSite)
      const res = await fetch(`/api/apd/plan?${params}`, { headers: getAuthHeaders() })
      const json = await res.json()
      setData(json.data || [])
      setSummary(json.summary || null)
      // Ambil unique sites dari data
      const siteSet = new Set((json.data || []).map((r: PlanRow) => r.site).filter(Boolean))
      setSites(Array.from(siteSet) as string[])
    } catch { setData([]) }
    setLoading(false)
  }

  useEffect(() => { loadPlan() }, [bulan, filterSite])

  const handleOverride = async () => {
    if (!overrideModal) return
    setProcessing(true)
    try {
      const res = await fetch('/api/apd/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          bulan_plan: bulan,
          jenis_apd: overrideModal.jenis_apd,
          nrp: overrideModal.nrp,
          action_type: overrideAction,
          qty_override: Number(overrideQty),
          keterangan: overrideKet || null
        })
      })
      const json = await res.json()
      if (json.ok) {
        showToast('✅ Override disimpan', 'ok')
        setOverrideModal(null)
        loadPlan()
      } else showToast(json.error || 'Gagal', 'err')
    } catch { showToast('Error', 'err') }
    setProcessing(false)
  }

  const handleRemoveOverride = async (id: string) => {
    try {
      const res = await fetch(`/api/apd/plan?id=${id}`, {
        method: 'DELETE', headers: getAuthHeaders()
      })
      const json = await res.json()
      if (json.ok) { showToast('Override dihapus', 'ok'); loadPlan() }
      else showToast(json.error || 'Gagal', 'err')
    } catch { showToast('Error', 'err') }
  }

  const reasonBadge = getReasonBadge

  return (
    <div className="space-y-4">
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-white text-sm font-bold shadow-lg
          ${toast.type === 'ok' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header + Filter */}
      <div>
        <h2 className="font-black text-[#003D79]">Plan Bulanan</h2>
        <p className="text-xs text-[#5a6a7e]">Auto-generate dari lifetime APD</p>
      </div>

      <div className="flex gap-2">
        <input type="month" value={bulan} onChange={e => setBulan(e.target.value)}
          className="flex-1 border border-slate-200 rounded-[1.2rem] px-4 py-2.5 text-sm bg-white shadow outline-none" />
        <select value={filterSite} onChange={e => setFilterSite(e.target.value)}
          className="px-3 py-2 bg-white rounded-[1.2rem] text-sm shadow border-0 outline-none">
          <option value="">Semua Site</option>
          {sites.map(s => <option key={s}>{s}</option>)}
        </select>
        <button onClick={loadPlan} className="p-2.5 bg-white rounded-[1.2rem] shadow">
          <RefreshCw size={14} className="text-slate-500" />
        </button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Karyawan', val: summary.total_karyawan, cls: 'text-[#003D79]', icon: '👥' },
            { label: 'Total Item', val: summary.total_item, cls: 'text-purple-600', icon: '📦' },
            { label: 'Belum Terima', val: summary.belum_terima, cls: 'text-blue-600', icon: '🆕' },
            { label: 'Jatuh Tempo', val: summary.jatuh_tempo, cls: 'text-amber-600', icon: '⏰' },
            { label: 'Expired', val: summary.expired, cls: 'text-rose-600', icon: '🚨' },
            { label: 'Override', val: summary.override_add, cls: 'text-indigo-600', icon: '⚙️' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-[1.5rem] shadow-xl p-3 text-center">
              <div className="text-lg">{s.icon}</div>
              <div className={`text-xl font-black ${s.cls}`}>{s.val}</div>
              <div className="text-[8px] text-[#5a6a7e] font-bold uppercase tracking-widest leading-tight">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-[#5a6a7e]">Memuat plan...</div>
      ) : data.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-2">🎉</div>
          <div className="text-slate-500 text-sm font-bold">Tidak ada APD yang perlu diganti</div>
          <div className="text-xs text-[#5a6a7e] mt-1">Semua karyawan APD-nya masih aman untuk bulan ini</div>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map(row => (
            <div key={row.nrp} className="bg-white rounded-[1.5rem] shadow-xl overflow-hidden">
              {/* Header karyawan */}
              <button className="w-full p-4 flex items-center justify-between"
                onClick={() => setExpandedNrp(expandedNrp === row.nrp ? null : row.nrp)}>
                <div className="text-left">
                  <div className="font-black text-[#003D79] text-sm">{row.name}</div>
                  <div className="text-[10px] text-[#5a6a7e]">{row.nrp} · {row.site} · {row.departemen}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-amber-100 text-amber-700 text-xs font-black px-2 py-1 rounded-full">
                    {row.items.length} item
                  </span>
                  {expandedNrp === row.nrp ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </button>

              {/* Detail items */}
              {expandedNrp === row.nrp && (
                <div className="border-t border-slate-50 px-4 pb-4">
                  <div className="space-y-2 mt-3">
                    {row.items.map((item, i) => {
                      const badge = reasonBadge(item.reason)
                      return (
                        <div key={i} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-[1.2rem]">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm">{item.icon}</span>
                              <span className="text-sm font-bold text-[#003D79]">{item.jenis_apd}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${badge.cls}`}>
                                {badge.label}
                              </span>
                            </div>
                            <div className="text-[10px] text-[#5a6a7e] mt-0.5">
                              Qty: {item.qty}
                              {item.last_terima && ` · Terakhir: ${formatTgl(item.last_terima)}`}
                              {item.expired_at && ` · Exp: ${formatTgl(item.expired_at)}`}
                              {item.ukuran_override && ` · Ukuran: ${item.ukuran_override}`}
                            </div>
                            {item.override && (
                              <div className="flex items-center gap-1 mt-1">
                                <span className="text-[9px] text-purple-600 font-bold">⚙️ Override aktif</span>
                                <button onClick={() => handleRemoveOverride(item.override.id)}
                                  className="text-[9px] text-rose-500 underline">Hapus</button>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              setOverrideModal({ nrp: row.nrp, name: row.name, jenis_apd: item.jenis_apd, current: item.override })
                              setOverrideAction(item.override?.action_type || 'REMOVE')
                              setOverrideQty(String(item.qty))
                              setOverrideKet(item.override?.keterangan || '')
                            }}
                            className="p-2 bg-purple-50 text-purple-600 rounded-xl ml-2 hover:bg-purple-100 transition-colors">
                            <Edit2 size={12} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Override Modal */}
      {overrideModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-md p-6 shadow-2xl">
            <h3 className="font-black text-[#003D79] text-lg mb-1">⚙️ Override Plan</h3>
            <p className="text-xs text-[#5a6a7e] mb-4">
              {overrideModal.name} · {overrideModal.jenis_apd}
            </p>

            <div className="space-y-4">
              {/* Action */}
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-[#5a6a7e] block mb-2">Aksi</label>
                <div className="flex gap-2">
                  {(['REMOVE', 'ADD', 'EDIT_QTY'] as const).map(a => (
                    <button key={a} onClick={() => setOverrideAction(a)}
                      className={`flex-1 py-2 rounded-[1.2rem] text-xs font-bold transition-all
                        ${overrideAction === a
                          ? a === 'REMOVE' ? 'bg-rose-600 text-white'
                            : a === 'ADD' ? 'bg-emerald-600 text-white'
                            : 'bg-[#003d79] text-white'
                          : 'bg-slate-100 text-slate-600'}`}>
                      {a === 'REMOVE' ? '❌ Hapus' : a === 'ADD' ? '➕ Tambah' : '✏️ Edit Qty'}
                    </button>
                  ))}
                </div>
              </div>

              {overrideAction !== 'REMOVE' && (
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#5a6a7e] block mb-1">Qty</label>
                  <input type="number" min={1} value={overrideQty} onChange={e => setOverrideQty(e.target.value)}
                    className="w-full border border-slate-200 rounded-[1.2rem] px-4 py-3 text-sm outline-none" />
                </div>
              )}

              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-[#5a6a7e] block mb-1">Keterangan</label>
                <input value={overrideKet} onChange={e => setOverrideKet(e.target.value)}
                  placeholder="Alasan override..."
                  className="w-full border border-slate-200 rounded-[1.2rem] px-4 py-3 text-sm outline-none" />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setOverrideModal(null)}
                className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-[1.2rem]">
                Batal
              </button>
              <button onClick={handleOverride} disabled={processing}
                className={`flex-1 py-3 bg-[#003D79] text-white font-bold rounded-[1.2rem] transition-all
                  ${processing ? 'opacity-50' : 'hover:bg-[#002D5F]'}`}>
                {processing ? '...' : 'Simpan Override'}
              </button>
            </div>
          </div>
        </div>
      )}
    
      {/* Standard App Footer */}
      <footer className="mt-8 mb-20 sm:mb-6 text-center text-xs text-[#8896a7] italic opacity-60">
        <p>BTM Mobile APP V1.7.0</p>
        <p className="text-[10px]">Powered By rck_Production</p>
      </footer>

      <AppFooter />
</div>
  )
}