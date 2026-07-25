// app/dashboard/kelola-apd/page.tsx
// v1.1 — Kelola APD dengan Tab Verifikasi + Monitoring (merged)
'use client'

import { useEffect, useState } from 'react'

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════
interface RequestItem {
  id: string
  nrp: string
  nama_karyawan: string
  jenis_apd: string
  ukuran: string
  warna: string | null
  jumlah: number
  tanggal_terima: string
  keterangan: string | null
  status: string
  input_source: string
  created_at: string
  reject_reason?: string | null
  verified_by?: string | null
  verified_at?: string | null
  _employee?: {
    nrp: string; nama: string; jabatan: string; departemen: string; site: string
  }
}

interface JenisItem {
  jenis_apd: string
  icon: string
  life_time_bulan?: number
}

interface MatrixCell {
  status: 'AMAN' | 'SEGERA_GANTI' | 'EXPIRED' | 'BELUM_TERIMA'
  tanggal: string | null
  expired: string | null
  days: number | null
  ukuran?: string
  jumlah?: number
  warna?: string
}

interface MonitoringRow {
  nrp: string
  nama: string
  jabatan: string
  departemen: string
  site: string
  matrix: Record<string, MatrixCell>
  overallStatus: string
  totalPunya: number
  totalMaster: number
  pendingCount: number
}

interface MonitoringSummary {
  total: number
  aman: number
  segeraGanti: number
  expired: number
  belumTerima: number
  totalPending: number
}

type TabType = 'verifikasi' | 'monitoring' | 'master' | 'distribusi' | 'stok' | 'plan'

// ═══════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════
export default function KelolaApdPage() {
  const [activeTab, setActiveTab] = useState<TabType>('verifikasi')
  const [pendingCountGlobal, setPendingCountGlobal] = useState(0)

  return (
    <div className="min-h-screen bg-[#f4f7fa] pb-24">
      {/* HERO */}
      <div className="bg-[#003D79] text-white px-5 pt-6 pb-6 rounded-b-[2.5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/5 rounded-full blur-2xl"></div>
        
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-2xl backdrop-blur-sm">
              🦺
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-black tracking-tight">Kelola APD</h1>
              <p className="text-sm text-white/70 font-medium">HR/SHE Management Panel</p>
            </div>
            {pendingCountGlobal > 0 && (
              <div className="bg-amber-500 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-widest shadow-lg">
                ⏳ {pendingCountGlobal}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TAB NAVIGATION */}
      <div className="px-4 mt-4">
        <div className="bg-white rounded-[1.5rem] shadow-lg p-2 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {[
              { key: 'verifikasi', icon: '⏳', label: 'Verifikasi', badge: pendingCountGlobal },
              { key: 'monitoring', icon: '📊', label: 'Monitoring' },
              { key: 'master', icon: '📋', label: 'Master' },
              { key: 'distribusi', icon: '📤', label: 'Distribusi' },
              { key: 'stok', icon: '📦', label: 'Stok' },
              { key: 'plan', icon: '📅', label: 'Plan' }
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key as TabType)}
                className={`px-4 py-2.5 rounded-[1rem] font-black text-[11px] uppercase tracking-widest transition-all whitespace-nowrap ${
                  activeTab === t.key
                    ? 'bg-[#003D79] text-white shadow-lg'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t.icon} {t.label}
                {(t.badge && t.badge > 0 && activeTab !== t.key) ? (
                  <span className="ml-1.5 bg-amber-500 text-white rounded-full px-2 py-0.5 text-[9px]">
                    {t.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* TAB CONTENT */}
      <div className="px-4 mt-4">
        {activeTab === 'verifikasi' && <VerifikasiTab onPendingCountChange={setPendingCountGlobal} />}
        {activeTab === 'monitoring' && <MonitoringTab />}
        {(activeTab === 'master' || activeTab === 'distribusi' || activeTab === 'stok' || activeTab === 'plan') && (
          <ComingSoonTab tabName={activeTab} onBack={() => setActiveTab('verifikasi')} />
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════
// TAB: COMING SOON
// ═══════════════════════════════════════════════
function ComingSoonTab({ tabName, onBack }: { tabName: string; onBack: () => void }) {
  return (
    <div className="bg-white rounded-[2rem] shadow-xl p-8 text-center">
      <div className="text-5xl mb-4">🚧</div>
      <h2 className="text-xl font-black text-slate-900 mb-2">Dalam Pengembangan</h2>
      <p className="text-sm text-slate-500 mb-6">
        Tab <span className="font-black">{tabName.toUpperCase()}</span> akan dibangun di update berikutnya.
      </p>
      <button
        onClick={onBack}
        className="bg-[#003D79] text-white px-6 py-3 rounded-[1.2rem] font-black text-sm shadow-xl"
      >
        ← Ke Verifikasi
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════
// TAB: VERIFIKASI
// ═══════════════════════════════════════════════
function VerifikasiTab({ onPendingCountChange }: { onPendingCountChange: (n: number) => void }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<RequestItem[]>([])
  const [sites, setSites] = useState<string[]>([])
  const [jenisList, setJenisList] = useState<JenisItem[]>([])
  const [filterSite, setFilterSite] = useState('ALL')
  const [filterJenis, setFilterJenis] = useState('ALL')
  const [filterStatus, setFilterStatus] = useState('PENDING')
  
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmData, setConfirmData] = useState<any>(null)
  const [showReject, setShowReject] = useState(false)
  const [rejectData, setRejectData] = useState<any>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [detailData, setDetailData] = useState<any>(null)

  useEffect(() => { loadData() }, [filterSite, filterJenis, filterStatus])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const token = localStorage.getItem('btm_session_token_v1')
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      const params = new URLSearchParams({ site: filterSite, jenis: filterJenis, status: filterStatus })
      const res = await fetch(`/api/apd/verify?${params}`, { headers })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal load data')

      setRows(json.rows || [])
      onPendingCountChange(json.pendingCount || 0)
      setSites(json.sites || [])
      setJenisList(json.jenisList || [])
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
  const formatDateTime = (d: string | null | undefined) => {
    if (!d) return '-'
    const dt = new Date(d)
    return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`
  }

  const handleApprove = async () => {
    if (!confirmData) return
    setSubmitting(true)
    try {
      const token = localStorage.getItem('btm_session_token_v1')
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch('/api/apd/verify', {
        method: 'POST', headers,
        body: JSON.stringify({ id: confirmData.id, action: 'APPROVE' })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal approve')
      alert(json.message)
      setShowConfirm(false)
      loadData()
    } catch (e: any) { alert('Error: ' + e.message) }
    finally { setSubmitting(false) }
  }

  const handleReject = async () => {
    if (!rejectData) return
    if (!rejectReason.trim()) { alert('Alasan penolakan wajib diisi'); return }
    setSubmitting(true)
    try {
      const token = localStorage.getItem('btm_session_token_v1')
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch('/api/apd/verify', {
        method: 'POST', headers,
        body: JSON.stringify({ id: rejectData.id, action: 'REJECT', reject_reason: rejectReason.trim() })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal reject')
      alert(json.message)
      setShowReject(false)
      loadData()
    } catch (e: any) { alert('Error: ' + e.message) }
    finally { setSubmitting(false) }
  }

  const statusBadge = (status: string) => {
    if (status === 'PENDING') return { bg: 'bg-amber-100', text: 'text-amber-700', label: '🟡 PENDING' }
    if (status === 'VERIFIED') return { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '✅ VERIFIED' }
    if (status === 'REJECTED') return { bg: 'bg-rose-100', text: 'text-rose-700', label: '❌ REJECTED' }
    return { bg: 'bg-slate-100', text: 'text-slate-700', label: status }
  }

  return (
    <>
      {/* FILTERS */}
      <div className="bg-white rounded-[1.5rem] shadow-lg p-4 mb-4">
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">🔍 Filter</div>
        <div className="grid grid-cols-3 gap-2">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#003D79]">
            <option value="PENDING">🟡 Pending</option>
            <option value="VERIFIED">✅ Verified</option>
            <option value="REJECTED">❌ Rejected</option>
            <option value="ALL">Semua</option>
          </select>
          <select value={filterSite} onChange={(e) => setFilterSite(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#003D79]">
            <option value="ALL">Semua Site</option>
            {sites.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterJenis} onChange={(e) => setFilterJenis(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#003D79]">
            <option value="ALL">Semua Jenis</option>
            {jenisList.map((j) => <option key={j.jenis_apd} value={j.jenis_apd}>{j.icon} {j.jenis_apd}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-[2rem] shadow-xl p-8 text-center">
          <div className="text-4xl mb-3 animate-pulse">🦺</div>
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
          <div className="text-5xl mb-4">✨</div>
          <div className="text-sm font-black text-slate-700 mb-1">Tidak Ada Data</div>
          <div className="text-xs text-slate-500 font-medium">
            {filterStatus === 'PENDING' ? 'Tidak ada request menunggu verifikasi' : `Tidak ada data dengan status ${filterStatus}`}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const badge = statusBadge(r.status)
            return (
              <div key={r.id} className="bg-white rounded-[1.5rem] shadow-xl border border-slate-100 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-black text-slate-900 truncate">{r.nama_karyawan}</div>
                    <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                      NRP {r.nrp} • {r._employee?.site || '-'} • {r._employee?.departemen || '-'}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">{r._employee?.jabatan || '-'}</div>
                  </div>
                  <div className={`${badge.bg} ${badge.text} px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap`}>
                    {badge.label}
                  </div>
                </div>

                <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 mb-3">
                  <div className="text-sm font-black text-slate-900 mb-2">🦺 {r.jenis_apd}</div>
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <div><div className="text-slate-400">Ukuran</div><div className="font-black text-slate-900">{r.ukuran}</div></div>
                    <div><div className="text-slate-400">Jumlah</div><div className="font-black text-slate-900">{r.jumlah} pcs</div></div>
                    <div><div className="text-slate-400">Warna</div><div className="font-black text-slate-900">{r.warna || '-'}</div></div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-blue-100 text-[10px] text-slate-500">
                    <span className="font-medium">Tanggal Terima:</span> <span className="font-black">{formatDate(r.tanggal_terima)}</span>
                  </div>
                  {r.keterangan && <div className="mt-1 text-[10px] text-slate-500"><span className="font-medium">Ket:</span> {r.keterangan}</div>}
                </div>

                <div className="text-[10px] text-slate-400 mb-3">📅 Diajukan: {formatDateTime(r.created_at)}</div>

                {r.status === 'REJECTED' && r.reject_reason && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 mb-3">
                    <div className="text-[10px] font-black uppercase tracking-widest text-rose-600 mb-1">❌ Alasan Ditolak</div>
                    <div className="text-[11px] text-rose-700 font-medium">{r.reject_reason}</div>
                  </div>
                )}

                {r.status === 'PENDING' ? (
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => { setConfirmData(r); setShowConfirm(true) }}
                      className="bg-emerald-500 text-white py-2.5 rounded-xl font-black text-[11px] hover:bg-emerald-600 active:scale-95 transition-all shadow-lg">
                      ✅ Approve
                    </button>
                    <button onClick={() => { setRejectData(r); setRejectReason(''); setShowReject(true) }}
                      className="bg-rose-500 text-white py-2.5 rounded-xl font-black text-[11px] hover:bg-rose-600 active:scale-95 transition-all shadow-lg">
                      ❌ Reject
                    </button>
                    <button onClick={() => { setDetailData(r); setShowDetail(true) }}
                      className="bg-slate-100 text-slate-700 py-2.5 rounded-xl font-black text-[11px] hover:bg-slate-200 active:scale-95 transition-all">
                      👁 Detail
                    </button>
                  </div>
                ) : (
                  <button onClick={() => { setDetailData(r); setShowDetail(true) }}
                    className="w-full bg-slate-100 text-slate-700 py-2.5 rounded-xl font-black text-[11px] hover:bg-slate-200 active:scale-95 transition-all">
                    👁 Lihat Detail
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL CONFIRM */}
      {showConfirm && confirmData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white w-full md:max-w-md rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl">
            <div className="bg-emerald-600 text-white px-5 py-4 rounded-t-[2.5rem]">
              <div className="text-sm font-black">✅ Setujui Request APD?</div>
              <div className="text-[10px] text-white/70 font-medium mt-0.5">Data akan resmi tercatat</div>
            </div>
            <div className="p-5">
              <div className="bg-slate-50 rounded-xl p-4 mb-4">
                <div className="text-sm font-black text-slate-900 mb-1">{confirmData.nama_karyawan}</div>
                <div className="text-[11px] text-slate-500 mb-3">NRP {confirmData.nrp}</div>
                <div className="text-sm font-black text-slate-900 mb-1">🦺 {confirmData.jenis_apd}</div>
                <div className="text-[11px] text-slate-600">
                  Ukuran {confirmData.ukuran} • {confirmData.jumlah} pcs • {confirmData.warna || 'Warna default'}
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800">
                ⚠️ Setelah disetujui, data tidak bisa diubah/dihapus lagi
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex gap-2">
              <button onClick={() => setShowConfirm(false)} disabled={submitting}
                className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-[1.2rem] font-black text-sm disabled:opacity-50">Batal</button>
              <button onClick={handleApprove} disabled={submitting}
                className="flex-1 bg-emerald-600 text-white py-3 rounded-[1.2rem] font-black text-sm shadow-xl disabled:opacity-50">
                {submitting ? '⏳...' : '✅ Ya, Setujui'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REJECT */}
      {showReject && rejectData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white w-full md:max-w-md rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl">
            <div className="bg-rose-600 text-white px-5 py-4 rounded-t-[2.5rem]">
              <div className="text-sm font-black">❌ Tolak Request APD</div>
              <div className="text-[10px] text-white/70 font-medium mt-0.5">Karyawan akan dinotif alasannya</div>
            </div>
            <div className="p-5">
              <div className="bg-slate-50 rounded-xl p-4 mb-4">
                <div className="text-sm font-black text-slate-900 mb-1">{rejectData.nama_karyawan}</div>
                <div className="text-[11px] text-slate-500 mb-2">NRP {rejectData.nrp}</div>
                <div className="text-[11px] text-slate-600">🦺 {rejectData.jenis_apd} • Ukuran {rejectData.ukuran} • {rejectData.jumlah} pcs</div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Alasan Penolakan *</label>
                <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Contoh: Data tidak sesuai catatan gudang..." rows={4}
                  className="w-full bg-slate-50 border border-slate-200 rounded-[1.2rem] px-4 py-3 text-sm font-medium focus:outline-none focus:border-rose-500 resize-none" />
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex gap-2">
              <button onClick={() => setShowReject(false)} disabled={submitting}
                className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-[1.2rem] font-black text-sm disabled:opacity-50">Batal</button>
              <button onClick={handleReject} disabled={submitting || !rejectReason.trim()}
                className="flex-1 bg-rose-600 text-white py-3 rounded-[1.2rem] font-black text-sm shadow-xl disabled:opacity-50">
                {submitting ? '⏳...' : '❌ Tolak'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETAIL */}
      {showDetail && detailData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white w-full md:max-w-md rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-[#003D79] text-white px-5 py-4 rounded-t-[2.5rem] sticky top-0 z-10 flex items-center justify-between">
              <div>
                <div className="text-sm font-black">📋 Detail Request</div>
                <div className="text-[10px] text-white/70 font-medium mt-0.5">Informasi lengkap</div>
              </div>
              <button onClick={() => setShowDetail(false)} className="text-white/70 hover:text-white text-2xl">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Karyawan</div>
                <div className="text-sm font-black text-slate-900">{detailData.nama_karyawan}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">NRP {detailData.nrp} • {detailData._employee?.site} • {detailData._employee?.departemen}</div>
                <div className="text-[11px] text-slate-500">{detailData._employee?.jabatan}</div>
              </div>
              <div className="border-t border-slate-100 pt-4">
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">APD</div>
                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div><div className="text-slate-400">Jenis</div><div className="font-black">{detailData.jenis_apd}</div></div>
                  <div><div className="text-slate-400">Ukuran</div><div className="font-black">{detailData.ukuran}</div></div>
                  <div><div className="text-slate-400">Warna</div><div className="font-black">{detailData.warna || '-'}</div></div>
                  <div><div className="text-slate-400">Jumlah</div><div className="font-black">{detailData.jumlah} pcs</div></div>
                  <div><div className="text-slate-400">Tanggal Terima</div><div className="font-black">{formatDate(detailData.tanggal_terima)}</div></div>
                  <div><div className="text-slate-400">Source</div><div className="font-black">{detailData.input_source}</div></div>
                </div>
                {detailData.keterangan && <div className="mt-3"><div className="text-slate-400 text-[11px]">Keterangan</div><div className="text-[11px] text-slate-700">{detailData.keterangan}</div></div>}
              </div>
              <div className="border-t border-slate-100 pt-4">
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Status</div>
                <div className={`inline-block ${statusBadge(detailData.status).bg} ${statusBadge(detailData.status).text} px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest`}>
                  {statusBadge(detailData.status).label}
                </div>
                <div className="mt-2 text-[11px] text-slate-500">Diajukan: {formatDateTime(detailData.created_at)}</div>
                {detailData.verified_at && <div className="text-[11px] text-slate-500">Diverifikasi: {formatDateTime(detailData.verified_at)} oleh NRP {detailData.verified_by}</div>}
                {detailData.reject_reason && (
                  <div className="mt-3 bg-rose-50 border border-rose-200 rounded-xl p-3">
                    <div className="text-[9px] font-black uppercase tracking-widest text-rose-600 mb-1">❌ Alasan Ditolak</div>
                    <div className="text-[11px] text-rose-700">{detailData.reject_reason}</div>
                  </div>
                )}
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 sticky bottom-0 bg-white">
              <button onClick={() => setShowDetail(false)} className="w-full bg-slate-100 text-slate-700 py-3 rounded-[1.2rem] font-black text-sm">Tutup</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ═══════════════════════════════════════════════
// TAB: MONITORING (Smart Table)
// ═══════════════════════════════════════════════
function MonitoringTab() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<MonitoringRow[]>([])
  const [sites, setSites] = useState<string[]>([])
  const [departemens, setDepartemens] = useState<string[]>([])
  const [jenisList, setJenisList] = useState<JenisItem[]>([])
  const [summary, setSummary] = useState<MonitoringSummary | null>(null)
  
  const [filterSite, setFilterSite] = useState('ALL')
  const [filterDept, setFilterDept] = useState('ALL')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [search, setSearch] = useState('')
  
  const [selectedRow, setSelectedRow] = useState<MonitoringRow | null>(null)
  const [showDrawer, setShowDrawer] = useState(false)

  useEffect(() => { loadData() }, [filterSite, filterDept, filterStatus])
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
      
      const params = new URLSearchParams({ site: filterSite, departemen: filterDept, status: filterStatus, search })
      const res = await fetch(`/api/apd/monitoring?${params}`, { headers })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal load data')
      
      setRows(json.rows || [])
      setSites(json.sites || [])
      setDepartemens(json.departemens || [])
      setJenisList(json.jenisList || [])
      setSummary(json.summary || null)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  const formatDate = (d: string | null | undefined) => {
    if (!d) return '-'
    const dt = new Date(d)
    return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`
  }

  const statusColor = (status: string) => {
    if (status === 'AMAN') return { bg: 'bg-emerald-500', text: 'text-white', ring: 'ring-emerald-200', label: 'Aman' }
    if (status === 'SEGERA_GANTI') return { bg: 'bg-amber-500', text: 'text-white', ring: 'ring-amber-200', label: 'Ganti' }
    if (status === 'EXPIRED') return { bg: 'bg-rose-500', text: 'text-white', ring: 'ring-rose-200', label: 'Expired' }
    return { bg: 'bg-slate-200', text: 'text-slate-500', ring: 'ring-slate-100', label: 'Belum' }
  }

  const activeFilterCount = (filterSite !== 'ALL' ? 1 : 0) + (filterDept !== 'ALL' ? 1 : 0) + (filterStatus !== 'ALL' ? 1 : 0) + (search ? 1 : 0)

  return (
    <>
      {/* Stats Cards */}
      {summary && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          <button onClick={() => setFilterStatus('ALL')}
            className={`bg-white rounded-2xl p-3 shadow-lg border-2 transition-all ${filterStatus === 'ALL' ? 'border-[#003D79]' : 'border-transparent'}`}>
            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Total</div>
            <div className="text-2xl font-black text-slate-900">{summary.total}</div>
          </button>
          <button onClick={() => setFilterStatus(filterStatus === 'AMAN' ? 'ALL' : 'AMAN')}
            className={`bg-emerald-50 rounded-2xl p-3 shadow-lg border-2 transition-all ${filterStatus === 'AMAN' ? 'border-emerald-500' : 'border-transparent'}`}>
            <div className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-1">Aman</div>
            <div className="text-2xl font-black text-emerald-700">{summary.aman}</div>
          </button>
          <button onClick={() => setFilterStatus(filterStatus === 'SEGERA_GANTI' ? 'ALL' : 'SEGERA_GANTI')}
            className={`bg-amber-50 rounded-2xl p-3 shadow-lg border-2 transition-all ${filterStatus === 'SEGERA_GANTI' ? 'border-amber-500' : 'border-transparent'}`}>
            <div className="text-[9px] font-black uppercase tracking-widest text-amber-600 mb-1">Ganti</div>
            <div className="text-2xl font-black text-amber-700">{summary.segeraGanti}</div>
          </button>
          <button onClick={() => setFilterStatus(filterStatus === 'EXPIRED' ? 'ALL' : 'EXPIRED')}
            className={`bg-rose-50 rounded-2xl p-3 shadow-lg border-2 transition-all ${filterStatus === 'EXPIRED' ? 'border-rose-500' : 'border-transparent'}`}>
            <div className="text-[9px] font-black uppercase tracking-widest text-rose-600 mb-1">Expired</div>
            <div className="text-2xl font-black text-rose-700">{summary.expired}</div>
          </button>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white rounded-[1.5rem] shadow-lg p-3 mb-4">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Cari nama atau NRP..."
          className="w-full bg-slate-50 border border-slate-200 rounded-[1.2rem] px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-[#003D79] mb-3" />
        <div className="grid grid-cols-2 gap-2">
          <select value={filterSite} onChange={(e) => setFilterSite(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#003D79]">
            <option value="ALL">🌍 Semua Site</option>
            {sites.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#003D79]">
            <option value="ALL">🏢 Semua Dept</option>
            {departemens.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        {activeFilterCount > 0 && (
          <button onClick={() => { setFilterSite('ALL'); setFilterDept('ALL'); setFilterStatus('ALL'); setSearch('') }}
            className="mt-2 w-full bg-slate-100 text-slate-600 py-2 rounded-xl text-[11px] font-black hover:bg-slate-200 transition-all">
            ✕ Reset {activeFilterCount} Filter
          </button>
        )}
      </div>

      {/* Content */}
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
          <button onClick={loadData} className="bg-[#003D79] text-white px-4 py-2 rounded-xl font-black text-xs">🔄 Coba Lagi</button>
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-[2rem] shadow-xl p-8 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <div className="text-sm font-black text-slate-700 mb-1">Tidak Ada Data</div>
          <div className="text-xs text-slate-500 font-medium">Coba ubah filter atau kata kunci pencarian</div>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block bg-white rounded-[1.5rem] shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-3 py-3 font-black uppercase tracking-widest text-[9px] text-slate-500 sticky left-0 bg-slate-50 z-10">Nama / NRP</th>
                    <th className="text-left px-2 py-3 font-black uppercase tracking-widest text-[9px] text-slate-500">Site</th>
                    {jenisList.map((j) => (
                      <th key={j.jenis_apd} className="text-center px-2 py-3 font-black uppercase tracking-widest text-[9px] text-slate-500 min-w-[60px]">
                        <div className="text-base">{j.icon}</div>
                        <div className="mt-1 truncate max-w-[70px] mx-auto">{j.jenis_apd.split(' ')[0]}</div>
                      </th>
                    ))}
                    <th className="text-center px-2 py-3 font-black uppercase tracking-widest text-[9px] text-slate-500">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.nrp} onClick={() => { setSelectedRow(r); setShowDrawer(true) }}
                      className={`border-b border-slate-100 hover:bg-blue-50 cursor-pointer transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                      <td className="px-3 py-3 sticky left-0 bg-inherit z-10">
                        <div className="font-black text-slate-900 text-[11px]">
                          {r.nama}
                          {r.pendingCount > 0 && <span className="ml-2 bg-amber-500 text-white rounded-full px-1.5 py-0.5 text-[8px]">{r.pendingCount}</span>}
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">{r.nrp}</div>
                        <div className="text-[9px] text-slate-400 truncate max-w-[150px]">{r.jabatan}</div>
                      </td>
                      <td className="px-2 py-3 text-[10px] text-slate-600 font-medium">{r.site}</td>
                      {jenisList.map((j) => {
                        const cell = r.matrix[j.jenis_apd]
                        const c = statusColor(cell.status)
                        return (
                          <td key={j.jenis_apd} className="px-2 py-3 text-center">
                            <div className={`inline-flex flex-col items-center justify-center w-10 h-10 rounded-full ${c.bg} ${c.text} font-black text-[9px] ring-4 ${c.ring} mx-auto`}
                              title={cell.tanggal ? `${formatDate(cell.tanggal)} • ${cell.ukuran} × ${cell.jumlah}` : 'Belum terima'}>
                              {cell.status === 'BELUM_TERIMA' ? '—' : (cell.days !== null && cell.days < 0 ? '!' : '✓')}
                            </div>
                          </td>
                        )
                      })}
                      <td className="px-2 py-3 text-center">
                        <div className="text-[10px] font-black text-slate-700">{r.totalPunya}/{r.totalMaster}</div>
                        <div className="w-14 h-1.5 bg-slate-200 rounded-full mx-auto mt-1">
                          <div className="h-full bg-[#003D79] rounded-full" style={{ width: `${(r.totalPunya / r.totalMaster) * 100}%` }}></div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-3">
            {rows.map((r) => {
              const overall = statusColor(r.overallStatus)
              return (
                <button key={r.nrp} onClick={() => { setSelectedRow(r); setShowDrawer(true) }}
                  className="w-full bg-white rounded-[1.5rem] shadow-lg border border-slate-100 p-4 text-left hover:shadow-xl active:scale-[0.98] transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-black text-slate-900 truncate">{r.nama}</div>
                        {r.pendingCount > 0 && <span className="bg-amber-500 text-white rounded-full px-1.5 py-0.5 text-[9px] font-black">⏳ {r.pendingCount}</span>}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">NRP {r.nrp} • {r.site}</div>
                      <div className="text-[9px] text-slate-400 truncate">{r.jabatan}</div>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${overall.bg} ring-4 ${overall.ring} flex-shrink-0 mt-1`}></div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap mb-3">
                    {jenisList.map((j) => {
                      const cell = r.matrix[j.jenis_apd]
                      const c = statusColor(cell.status)
                      return (
                        <div key={j.jenis_apd} className={`flex items-center gap-1 ${c.bg} ${c.text} rounded-full px-2 py-1 text-[9px] font-black`}
                          title={cell.tanggal ? formatDate(cell.tanggal) : 'Belum'}>
                          <span>{j.icon}</span>
                          <span>{cell.status === 'BELUM_TERIMA' ? '—' : (cell.days !== null && cell.days < 0 ? '!' : '✓')}</span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] text-slate-500 font-medium">{r.totalPunya} dari {r.totalMaster} jenis</div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-200 rounded-full">
                        <div className="h-full bg-[#003D79] rounded-full" style={{ width: `${(r.totalPunya / r.totalMaster) * 100}%` }}></div>
                      </div>
                      <div className="text-[10px] font-black text-slate-700">{Math.round((r.totalPunya / r.totalMaster) * 100)}%</div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 bg-white rounded-[1.5rem] shadow-lg p-3">
            <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">Legend Status</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-200"></div><span className="text-slate-600 font-medium">Aman</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500 ring-2 ring-amber-200"></div><span className="text-slate-600 font-medium">Ganti (≤60hr)</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-rose-500 ring-2 ring-rose-200"></div><span className="text-slate-600 font-medium">Expired</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-slate-200 ring-2 ring-slate-100"></div><span className="text-slate-600 font-medium">Belum</span></div>
            </div>
          </div>
        </>
      )}

      {/* Drawer Detail */}
      {showDrawer && selectedRow && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white w-full md:max-w-lg rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-[#003D79] text-white px-5 py-4 rounded-t-[2.5rem] sticky top-0 z-10 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-black truncate">{selectedRow.nama}</div>
                <div className="text-[10px] text-white/70 font-medium">NRP {selectedRow.nrp} • {selectedRow.site}</div>
              </div>
              <button onClick={() => setShowDrawer(false)} className="text-white/70 hover:text-white text-2xl ml-2">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 rounded-2xl p-3">
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div><div className="text-slate-400 font-black uppercase tracking-widest">Jabatan</div><div className="font-black text-slate-900">{selectedRow.jabatan || '-'}</div></div>
                  <div><div className="text-slate-400 font-black uppercase tracking-widest">Dept</div><div className="font-black text-slate-900">{selectedRow.departemen || '-'}</div></div>
                  <div><div className="text-slate-400 font-black uppercase tracking-widest">Site</div><div className="font-black text-slate-900">{selectedRow.site || '-'}</div></div>
                  <div><div className="text-slate-400 font-black uppercase tracking-widest">Progress</div><div className="font-black text-slate-900">{selectedRow.totalPunya}/{selectedRow.totalMaster} ({Math.round((selectedRow.totalPunya / selectedRow.totalMaster) * 100)}%)</div></div>
                </div>
              </div>
              {selectedRow.pendingCount > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800 font-medium">
                  ⏳ Ada <span className="font-black">{selectedRow.pendingCount} request</span> menunggu verifikasi
                </div>
              )}
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">🦺 Detail per Jenis APD</div>
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
                              <div className="text-[9px] text-slate-500 font-medium">Masa pakai {j.life_time_bulan || 12} bulan</div>
                            </div>
                          </div>
                          <div className={`${c.bg} ${c.text} px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest`}>{c.label}</div>
                        </div>
                        {cell.status === 'BELUM_TERIMA' ? (
                          <div className="text-[10px] text-slate-400 italic">Belum pernah menerima</div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2 mt-2 text-[10px]">
                            <div><div className="text-slate-400">Terima</div><div className="font-black text-slate-900">{formatDate(cell.tanggal)}</div></div>
                            <div><div className="text-slate-400">Expired</div><div className="font-black text-slate-900">{formatDate(cell.expired)}</div></div>
                            <div><div className="text-slate-400">Ukuran</div><div className="font-black text-slate-900">{cell.ukuran || '-'}</div></div>
                            <div><div className="text-slate-400">Jumlah</div><div className="font-black text-slate-900">{cell.jumlah || '-'} pcs</div></div>
                            {cell.days !== null && (
                              <div className="col-span-2"><div className="text-slate-400">Status Waktu</div>
                                <div className="font-black text-slate-900">
                                  {cell.days < 0 ? `Expired ${Math.abs(cell.days)} hari lalu` : `${cell.days} hari lagi`}
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
            <div className="p-5 border-t border-slate-100 sticky bottom-0 bg-white">
              <button onClick={() => setShowDrawer(false)} className="w-full bg-slate-100 text-slate-700 py-3 rounded-[1.2rem] font-black text-sm hover:bg-slate-200">Tutup</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}