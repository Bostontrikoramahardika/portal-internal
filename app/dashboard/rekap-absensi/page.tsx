'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

// ─── Types ───────────────────────────────────────────────────────────────────
interface Employee {
  nrp: string; nama: string; site: string; jabatan: string; departemen: string
}
interface AttendanceRow {
  id: string; nrp: string; tanggal: string; shift: string
  clock_in: string | null; clock_out: string | null
  jam_kerja_menit: number; terlambat_menit: number
  status: string; keterangan: string; site: string
  is_offline_sync: boolean; employee: Employee
}
interface Summary {
  totalHadir: number; totalAlpha: number; totalIzin: number; totalSakit: number
  totalTerlambat: number; totalTidakClockOut: number
  totalJamKerja: number; rataJamKerja: number; totalRows: number
}

// ─── Constants ───────────────────────────────────────────────────────────────
const ROLES_LIST = [
  { value: '',               label: 'Semua Role'    },
  { value: 'super_admin',    label: 'Super Admin'   },
  { value: 'hr_ho',          label: 'HR HO'         },
  { value: 'hr_site',        label: 'HR Site'       },
  { value: 'pjo_site',       label: 'PJO Site'      },
  { value: 'she_site',       label: 'SHE Site'      },
  { value: 'gl_produksi',    label: 'GL Produksi'   },
  { value: 'gl_plant',       label: 'GL Plant'      },
  { value: 'manager_ops',    label: 'Manager Ops'   },
  { value: 'director_ops',   label: 'Director Ops'  },
  { value: 'employee',       label: 'Karyawan'      },
]

const STATUS_CFG: Record<string, { bg: string; text: string; dot: string; badge: string }> = {
  'HADIR':           { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', badge: 'bg-emerald-100' },
  'ALPHA':           { bg: 'bg-rose-50',    text: 'text-rose-700',    dot: 'bg-rose-500',    badge: 'bg-rose-100'    },
  'IZIN':            { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500',    badge: 'bg-blue-100'    },
  'SAKIT':           { bg: 'bg-purple-50',  text: 'text-purple-700',  dot: 'bg-purple-500',  badge: 'bg-purple-100'  },
  'TIDAK CLOCK OUT': { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500',   badge: 'bg-amber-100'   },
  'LIBUR':           { bg: 'bg-slate-50',   text: 'text-slate-500',   dot: 'bg-slate-400',   badge: 'bg-slate-100'   },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtTime = (iso: string | null) => {
  if (!iso) return '-'
  return new Date(iso).toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Makassar', hour: '2-digit', minute: '2-digit'
  })
}
const fmtJam = (m: number) => m ? `${Math.floor(m / 60)}j ${m % 60}m` : '-'
const fmtTgl = (t: string) => t
  ? new Date(t + 'T00:00:00').toLocaleDateString('id-ID', {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
    })
  : '-'
const getMonthNow = () => {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
}
const getNamaBulan = (b: string) => b
  ? new Date(b + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
  : ''

// ─── Component ───────────────────────────────────────────────────────────────
export default function RekapAbsensiPage() {
  const router = useRouter()

  // Filter state
  const [bulan,    setBulan]    = useState(getMonthNow())
  const [site,     setSite]     = useState('')
  const [nama,     setNama]     = useState('')
  const [namaInput,setNamaInput]= useState('')
  const [role,     setRole]     = useState('')
  const [page,     setPage]     = useState(1)
  const LIMIT = 50

  // Data state
  const [rows,      setRows]      = useState<AttendanceRow[]>([])
  const [summary,   setSummary]   = useState<Summary | null>(null)
  const [total,     setTotal]     = useState(0)
  const [loading,   setLoading]   = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error,     setError]     = useState('')
  const [siteList,  setSiteList]  = useState<string[]>([])

  // Load sites
  useEffect(() => {
    const token = localStorage.getItem('btm_session_token_v1') || ''
    fetch('/api/employees/sites', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }).then(r => r.json()).then(d => { if (d.ok) setSiteList(d.data || []) }).catch(() => {})
  }, [])

  // Fetch rekap
  const fetchRekap = useCallback(async (pg = 1) => {
    setLoading(true)
    setError('')
    try {
      const token  = localStorage.getItem('btm_session_token_v1') || ''
      const params = new URLSearchParams({
        bulan, site, nama, role,
        page: String(pg), limit: String(LIMIT)
      })
      const res  = await fetch(`/api/attendance/rekap?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      const json = await res.json()
      if (!json.ok) { setError(json.error || 'Gagal ambil data'); return }
      setRows(json.data || [])
      setTotal(json.total || 0)
      setSummary(json.summary || null)
      setPage(pg)
    } catch { setError('Koneksi gagal') }
    finally   { setLoading(false) }
  }, [bulan, site, nama, role])

  // Auto fetch saat filter berubah
  useEffect(() => { fetchRekap(1) }, [bulan, site, role, nama])

  // Export
  const handleExport = async () => {
    if (rows.length === 0) return
    setExporting(true)
    try {
      const token  = localStorage.getItem('btm_session_token_v1') || ''
      const params = new URLSearchParams({ bulan, site, nama, role })
      const res    = await fetch(`/api/attendance/rekap/export?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      if (!res.ok) { alert('Export gagal'); return }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = `Rekap_Absensi_${bulan}.xlsx`; a.click()
      URL.revokeObjectURL(url)
    } catch { alert('Export error') }
    finally { setExporting(false) }
  }

  const totalPages = Math.ceil(total / LIMIT)

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f4f7fa] pb-16">

      {/* HERO */}
      <div className="bg-[#003D79] px-4 pt-12 pb-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

        <button onClick={() => router.back()}
          className="mb-5 flex items-center gap-1.5 text-white/60 hover:text-white text-sm transition-colors relative z-10">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
          Kembali
        </button>

        <div className="relative z-10">
          <p className="text-[9px] font-black uppercase tracking-widest text-blue-300 mb-1">
            Laporan Kehadiran
          </p>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Rekap Absensi
          </h1>
          <p className="text-blue-200 text-sm mt-1 font-medium">
            {getNamaBulan(bulan) || 'Pilih periode'}
            {total > 0 && (
              <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs font-black">
                {total.toLocaleString()} record
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="px-4 -mt-14 space-y-4 relative z-10">

        {/* FILTER CARD */}
        <div className="bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,61,121,0.12)] p-5 space-y-4">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
            🔍 Filter Data
          </p>

          {/* Row 1: Bulan + Site */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">
                📅 Bulan
              </label>
              <input type="month" value={bulan}
                onChange={e => setBulan(e.target.value)}
                className="w-full border border-slate-200 rounded-[1.2rem] px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#003D79]/30 bg-slate-50"
              />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">
                🏗️ Site
              </label>
              <select value={site} onChange={e => setSite(e.target.value)}
                className="w-full border border-slate-200 rounded-[1.2rem] px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#003D79]/30 bg-slate-50">
                <option value="">Semua Site</option>
                {siteList.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Row 2: Nama + Role */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">
                👤 Nama
              </label>
              <div className="relative">
                <input type="text" placeholder="Cari nama..."
                  value={namaInput}
                  onChange={e => setNamaInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { setNama(namaInput); fetchRekap(1) } }}
                  className="w-full border border-slate-200 rounded-[1.2rem] px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#003D79]/30 bg-slate-50 pr-8"
                />
                {namaInput && (
                  <button onClick={() => { setNamaInput(''); setNama('') }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 text-sm font-bold">
                    ✕
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">
                🎭 Role
              </label>
              <select value={role} onChange={e => setRole(e.target.value)}
                className="w-full border border-slate-200 rounded-[1.2rem] px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#003D79]/30 bg-slate-50">
                {ROLES_LIST.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button onClick={() => { setNama(namaInput); fetchRekap(1) }}
              disabled={loading}
              className="flex-1 bg-[#003D79] text-white rounded-[1.2rem] py-3 text-sm font-black flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95 transition-all shadow-lg">
              {loading
                ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Loading...</>
                : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>Tampilkan</>
              }
            </button>
            <button onClick={handleExport}
              disabled={exporting || rows.length === 0}
              className="flex-1 bg-emerald-600 text-white rounded-[1.2rem] py-3 text-sm font-black flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-all shadow-lg">
              {exporting
                ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Export...</>
                : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>Excel</>
              }
            </button>
          </div>
        </div>

        {/* SUMMARY CARDS */}
        {summary && summary.totalRows > 0 && (
          <>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Hadir',     value: summary.totalHadir,        icon: '✅', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Alpha',     value: summary.totalAlpha,        icon: '❌', color: 'text-rose-600',    bg: 'bg-rose-50'    },
                { label: 'Izin',      value: summary.totalIzin,         icon: '📝', color: 'text-blue-600',   bg: 'bg-blue-50'    },
                { label: 'Sakit',     value: summary.totalSakit,        icon: '🏥', color: 'text-purple-600', bg: 'bg-purple-50'  },
                { label: 'Terlambat', value: summary.totalTerlambat,    icon: '⏰', color: 'text-amber-600',  bg: 'bg-amber-50'   },
                { label: 'Tdk C/O',   value: summary.totalTidakClockOut,icon: '🚪', color: 'text-orange-600', bg: 'bg-orange-50'  },
              ].map(item => (
                <div key={item.label} className={`${item.bg} rounded-[1.5rem] shadow-xl p-3 text-center border border-white`}>
                  <div className="text-xl mb-0.5">{item.icon}</div>
                  <div className={`text-2xl font-black ${item.color}`}>{item.value}</div>
                  <div className="text-[8px] font-black uppercase tracking-widest text-slate-500 mt-0.5">{item.label}</div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-[1.5rem] shadow-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Rata-rata Jam Kerja</p>
                <p className="text-2xl font-black text-[#003D79]">{fmtJam(summary.rataJamKerja)}</p>
              </div>
              <div className="h-10 w-px bg-slate-100" />
              <div className="text-right">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Records</p>
                <p className="text-2xl font-black text-slate-700">{summary.totalRows.toLocaleString()}</p>
              </div>
              <div className="h-10 w-px bg-slate-100" />
              <div className="text-right">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Jam</p>
                <p className="text-2xl font-black text-slate-700">{Math.floor(summary.totalJamKerja / 60)}j</p>
              </div>
            </div>
          </>
        )}

        {/* ERROR */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-[1.5rem] p-4 flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <p className="text-rose-700 text-sm font-bold">{error}</p>
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && rows.length === 0 && !error && (
          <div className="bg-white rounded-[2rem] shadow-xl p-12 text-center">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-slate-600 font-black text-lg">Tidak ada data</p>
            <p className="text-slate-400 text-sm mt-1">Coba ubah filter pencarian</p>
          </div>
        )}

        {/* DATA LIST */}
        {rows.length > 0 && (
          <div className="space-y-3">
            {/* Info bar */}
            <div className="flex items-center justify-between px-1">
              <p className="text-xs text-slate-500 font-medium">
                {((page-1)*LIMIT)+1}–{Math.min(page*LIMIT, total)} dari {total.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 font-medium">Hal {page}/{totalPages}</p>
            </div>

            {rows.map((row, idx) => {
              const cfg = STATUS_CFG[row.status] || STATUS_CFG['LIBUR']
              const emp = row.employee
              return (
                <div key={row.id} className="bg-white rounded-[1.5rem] shadow-xl overflow-hidden">

                  {/* Header card */}
                  <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100 bg-[#003D79]/[0.03]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-[#003D79] rounded-full flex items-center justify-center text-white text-xs font-black shrink-0">
                        {((page-1)*LIMIT)+idx+1}
                      </div>
                      <div>
                        <p className="font-black text-slate-800 text-sm leading-tight">{emp.nama}</p>
                        <p className="text-[10px] text-slate-500 font-medium">{emp.nrp} • {emp.site}</p>
                      </div>
                    </div>
                    <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black ${cfg.badge} ${cfg.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}/>
                      {row.status}
                    </span>
                  </div>

                  {/* Body card */}
                  <div className="px-4 py-3 space-y-2.5">
                    {/* Tanggal + Shift */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-slate-700">
                        📅 {fmtTgl(row.tanggal)}
                      </span>
                      <div className="flex items-center gap-2">
                        {row.is_offline_sync && (
                          <span className="bg-slate-100 text-slate-500 text-[8px] font-black px-2 py-0.5 rounded-full">
                            📴 Offline
                          </span>
                        )}
                        {row.shift && (
                          <span className="bg-[#003D79]/10 text-[#003D79] text-[10px] font-black px-2.5 py-0.5 rounded-full">
                            Shift {row.shift}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Clock in / out / jam */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-emerald-50 rounded-xl p-2.5 text-center">
                        <p className="text-[8px] font-black uppercase tracking-widest text-emerald-600 mb-0.5">Clock In</p>
                        <p className="text-sm font-black text-emerald-700">{fmtTime(row.clock_in)}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-2.5 text-center">
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Clock Out</p>
                        <p className="text-sm font-black text-slate-700">{fmtTime(row.clock_out)}</p>
                      </div>
                      <div className="bg-[#003D79]/5 rounded-xl p-2.5 text-center">
                        <p className="text-[8px] font-black uppercase tracking-widest text-[#003D79] mb-0.5">Jam Kerja</p>
                        <p className="text-sm font-black text-[#003D79]">{fmtJam(row.jam_kerja_menit)}</p>
                      </div>
                    </div>

                    {/* Jabatan + Terlambat */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">{emp.jabatan || '-'}</span>
                      {row.terlambat_menit > 0 && (
                        <span className="bg-amber-50 text-amber-700 text-[10px] font-black px-2.5 py-1 rounded-full border border-amber-200">
                          ⏰ Terlambat {row.terlambat_menit} mnt
                        </span>
                      )}
                    </div>

                    {/* Keterangan */}
                    {row.keterangan && (
                      <div className="bg-slate-50 rounded-xl px-3 py-2">
                        <p className="text-[10px] text-slate-500 line-clamp-2">{row.keterangan}</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2 pb-4">
                <button onClick={() => fetchRekap(page - 1)}
                  disabled={page <= 1 || loading}
                  className="px-5 py-2.5 bg-white rounded-[1.2rem] shadow font-black text-sm text-slate-600 disabled:opacity-40 active:scale-95 transition-all">
                  ← Prev
                </button>
                <span className="px-5 py-2.5 bg-[#003D79] rounded-[1.2rem] text-white text-sm font-black shadow-lg">
                  {page} / {totalPages}
                </span>
                <button onClick={() => fetchRekap(page + 1)}
                  disabled={page >= totalPages || loading}
                  className="px-5 py-2.5 bg-white rounded-[1.2rem] shadow font-black text-sm text-slate-600 disabled:opacity-40 active:scale-95 transition-all">
                  Next →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}