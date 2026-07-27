'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'

// ─── Types ─────────────────────────────────────────────────
interface Day {
  tanggal: string; day: number; code: string; type: string
  roster: string | null
  clock_in: string | null; clock_out: string | null
  clock_in_lokasi: string | null; clock_out_lokasi: string | null
  clock_in_lat: number | null; clock_in_lng: number | null
  clock_out_lat: number | null; clock_out_lng: number | null
  jam_kerja_menit: number; terlambat_menit: number
  status: string | null; keterangan: string | null
}
interface Row {
  nrp: string; nama: string; jabatan: string; departemen: string
  site: string; status_karyawan: string; tanggal_resign: string | null
  days: Day[]
  summary: {
    totalHari: number; hariKerja: number; hariHadir: number
    shiftS: number; shiftM: number
    off: number; cuti: number; sakit: number; izin: number
    alpha: number; stb: number; persen: number
  }
}
interface Group { departemen: string; rows: Row[] }

// ─── Konstanta ──────────────────────────────────────────────
const CELL_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  'DS':  { bg: 'bg-sky-100',      text: 'text-sky-800',      label: 'Day Shift' },
  'NS':  { bg: 'bg-violet-100',   text: 'text-violet-800',   label: 'Night Shift' },
  'OFF': { bg: 'bg-slate-800',    text: 'text-white',        label: 'Off/Libur' },
  'CR':  { bg: 'bg-yellow-200',   text: 'text-yellow-900',   label: 'Cuti Roster' },
  'CT':  { bg: 'bg-orange-200',   text: 'text-orange-900',   label: 'Cuti Tahunan' },
  'SCK': { bg: 'bg-emerald-200',  text: 'text-emerald-900',  label: 'Shift Cuti Kompensasi' },
  'MCK': { bg: 'bg-emerald-300',  text: 'text-emerald-900',  label: 'Malam Cuti Kompensasi' },
  'TR':  { bg: 'bg-blue-200',     text: 'text-blue-900',     label: 'Training' },
  'ID':  { bg: 'bg-indigo-200',   text: 'text-indigo-900',   label: 'Induksi' },
  'S':   { bg: 'bg-pink-200',     text: 'text-pink-900',     label: 'Sakit' },
  'I':   { bg: 'bg-pink-100',     text: 'text-pink-800',     label: 'Izin Potongan' },
  'IR':  { bg: 'bg-rose-100',     text: 'text-rose-800',     label: 'Izin Resmi' },
  'A':   { bg: 'bg-red-400',      text: 'text-white',        label: 'Alfa' },
  '-':   { bg: 'bg-white',        text: 'text-slate-300',    label: 'Kosong' },
}
const ROSTER_OPTIONS = ['S','M','OFF','CR','CT','ID','TR','LV']
const STATUS_OPTIONS = ['HADIR','ALPHA','IZIN','SAKIT','TIDAK CLOCK OUT','LIBUR']

const getMonthNow = () => {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
}
const fmtTime = (iso: string | null) => {
  if (!iso) return '-'
  return new Date(iso).toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Makassar', hour: '2-digit', minute: '2-digit'
  })
}
const fmtJam = (m: number) => m ? `${Math.floor(m/60)}j ${m%60}m` : '-'
const fmtDate = (t: string) => new Date(t + 'T00:00:00').toLocaleDateString('id-ID', {
  weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
})

// ─── Component ──────────────────────────────────────────────
export default function ManajemenAbsensiPage() {
  const router = useRouter()

  // Filter
  const [bulan,     setBulan]     = useState(getMonthNow())
  const [site,      setSite]      = useState('')
  const [departemen,setDepartemen]= useState('')
  const [nama,      setNama]      = useState('')
  const [namaInput, setNamaInput] = useState('')

  // Data
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [jmlHari,   setJmlHari]   = useState(31)
  const [groups,    setGroups]    = useState<Group[]>([])
  const [canEdit,   setCanEdit]   = useState(false)
  const [siteList,  setSiteList]  = useState<string[]>([])

  // Modal
  const [detailRow, setDetailRow] = useState<Row | null>(null)
  const [editCell,  setEditCell]  = useState<{ row: Row, day: Day } | null>(null)
  const [resignRow, setResignRow] = useState<Row | null>(null)
  // ⭐ CHAT 26: Popup detail cell (klik quick view)
  const [detailCell, setDetailCell] = useState<{ row: Row, day: Day } | null>(null)

  // Export state
  const [exporting, setExporting] = useState<'matrix' | 'detail' | null>(null)

  // Handler Export Matrix (grid tanggal 1-31)
  const handleExportMatrix = async () => {
    setExporting('matrix')
    try {
      const token  = localStorage.getItem('btm_session_token_v1') || ''
      const params = new URLSearchParams({ periode: bulan })
      if (site) params.append('site', site)

      const res = await fetch(`/api/export-absensi-matrix?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      if (!res.ok) { alert('Export Matrix gagal'); return }

      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = `Rekap_Matrix_${bulan}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) { alert('Export error') }
    finally { setExporting(null) }
  }

  // Handler Export Detail (list per hari)
  const handleExportDetail = async () => {
    setExporting('detail')
    try {
      const token  = localStorage.getItem('btm_session_token_v1') || ''
      const params = new URLSearchParams({ bulan })
      if (site) params.append('site', site)
      if (nama) params.append('nama', nama)

      const res = await fetch(`/api/attendance/rekap/export?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      if (!res.ok) { alert('Export Detail gagal'); return }

      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = `Rekap_Detail_${bulan}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) { alert('Export error') }
    finally { setExporting(null) }
  }

  // Load sites
  useEffect(() => {
    const token = localStorage.getItem('btm_session_token_v1') || ''
    fetch('/api/employees/sites', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }).then(r => r.json()).then(d => { if (d.ok) setSiteList(d.data || []) })
  }, [])

  // Fetch matrix
  const fetchMatrix = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('btm_session_token_v1') || ''
      const params = new URLSearchParams({ bulan, site, departemen, nama })
      const res = await fetch(`/api/attendance/matrix?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      const json = await res.json()
      if (!json.ok) { setError(json.error || 'Gagal ambil data'); return }
      setJmlHari(json.jmlHari || 31)
      setGroups(json.groups || [])
      setCanEdit(json.permission?.canEdit || false)
    } catch { setError('Koneksi gagal') }
    finally { setLoading(false) }
  }, [bulan, site, departemen, nama])

  useEffect(() => { fetchMatrix() }, [bulan, site, departemen, nama])

  const namaBulan = new Date(bulan + '-01').toLocaleDateString('id-ID', {
    month: 'long', year: 'numeric'
  })

  const totalKaryawan = groups.reduce((acc, g) => acc + g.rows.length, 0)

  return (
    <div className="min-h-screen bg-[#f4f7fa] pb-16">

      {/* ── HERO ── */}
      <div className="bg-[#003D79] px-4 pt-12 pb-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }}/>
        <button onClick={() => router.back()}
          className="mb-4 flex items-center gap-1.5 text-white/60 hover:text-white text-sm relative z-10">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg> Kembali
        </button>
        <div className="relative z-10">
          <p className="text-[9px] font-black uppercase tracking-widest text-blue-300 mb-1">
            Matrix Kehadiran Bulanan
          </p>
          <h1 className="text-2xl font-black text-white tracking-tight">Manajemen Absensi</h1>
          <p className="text-blue-200 text-sm mt-1">
            {namaBulan}
            {totalKaryawan > 0 && (
              <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs font-black">
                {totalKaryawan} karyawan
              </span>
            )}
            {!canEdit && (
              <span className="ml-2 bg-amber-500/30 px-2 py-0.5 rounded-full text-xs font-black">
                👁️ View Only
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="px-4 -mt-14 space-y-4 relative z-10">

        {/* ── FILTER ── */}
        <div className="bg-white rounded-[2rem] shadow-xl p-5 space-y-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">🔍 Filter</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">📅 Bulan</label>
              <input type="month" value={bulan} onChange={e => setBulan(e.target.value)}
                className="w-full border border-slate-200 rounded-[1.2rem] px-3 py-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-[#003D79]/30"/>
            </div>
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">🏗️ Site</label>
              <select value={site} onChange={e => setSite(e.target.value)}
                className="w-full border border-slate-200 rounded-[1.2rem] px-3 py-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-[#003D79]/30">
                <option value="">Semua Site</option>
                {siteList.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">🏷️ Golongan</label>
              <select value={departemen} onChange={e => setDepartemen(e.target.value)}
                className="w-full border border-slate-200 rounded-[1.2rem] px-3 py-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-[#003D79]/30">
                <option value="">Semua</option>
                <option value="Staff">Staff</option>
                <option value="Plant">Plant</option>
                <option value="Operator">Operator</option>
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">👤 Nama</label>
              <div className="relative">
                <input type="text" placeholder="Cari nama..."
                  value={namaInput} onChange={e => setNamaInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && setNama(namaInput)}
                  className="w-full border border-slate-200 rounded-[1.2rem] px-3 py-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-[#003D79]/30 pr-8"/>
                {namaInput && (
                  <button onClick={() => { setNamaInput(''); setNama('') }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">✕</button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── EXPORT BUTTONS ── */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleExportMatrix}
            disabled={exporting !== null || groups.length === 0}
            className="bg-emerald-600 text-white rounded-[1.5rem] shadow-xl py-4 px-4 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-all">
            {exporting === 'matrix' ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                <span className="text-xs font-black">Export...</span>
              </>
            ) : (
              <>
                <span className="text-xl">📊</span>
                <div className="text-left">
                  <p className="text-xs font-black leading-tight">Excel Matrix</p>
                  <p className="text-[9px] opacity-80">Grid tanggal 1-31</p>
                </div>
              </>
            )}
          </button>

          <button
            onClick={handleExportDetail}
            disabled={exporting !== null || groups.length === 0}
            className="bg-[#003D79] text-white rounded-[1.5rem] shadow-xl py-4 px-4 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-all">
            {exporting === 'detail' ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                <span className="text-xs font-black">Export...</span>
              </>
            ) : (
              <>
                <span className="text-xl">📋</span>
                <div className="text-left">
                  <p className="text-xs font-black leading-tight">Excel Detail</p>
                  <p className="text-[9px] opacity-80">List per hari</p>
                </div>
              </>
            )}
          </button>
        </div>

        {/* ── LEGENDA ── */}
        <div className="bg-white rounded-[1.5rem] shadow-xl p-4">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Legenda Kode</p>
          <div className="grid grid-cols-4 gap-1.5 text-[10px]">
            {Object.entries(CELL_STYLE).filter(([k]) => k !== '-').map(([code, s]) => (
              <div key={code} className="flex items-center gap-1">
                <div className={`w-6 h-5 ${s.bg} ${s.text} rounded flex items-center justify-center font-black text-[9px]`}>
                  {code}
                </div>
                <span className="text-slate-600 truncate text-[9px]">{s.label}</span>
              </div>
            ))}
            {/* ⭐ CHAT 26: Tambah legenda TERLAMBAT */}
            <div className="flex items-center gap-1">
              <div className="w-6 h-5 bg-yellow-300 text-yellow-900 rounded flex items-center justify-center font-black text-[9px]">
                DS
              </div>
              <span className="text-slate-600 truncate text-[9px]">Terlambat</span>
            </div>
          </div>
        </div>

        {/* ── ERROR ── */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-[1.5rem] p-4 text-rose-700 text-sm font-bold">
            ⚠️ {error}
          </div>
        )}

        {/* ── LOADING ── */}
        {loading && (
          <div className="bg-white rounded-[2rem] shadow-xl p-12 text-center">
            <div className="text-4xl animate-pulse">⏳</div>
            <p className="text-slate-500 font-bold mt-3">Loading matrix...</p>
          </div>
        )}

        {/* ── EMPTY ── */}
        {!loading && groups.length === 0 && !error && (
          <div className="bg-white rounded-[2rem] shadow-xl p-12 text-center">
            <div className="text-6xl mb-3">📭</div>
            <p className="text-slate-600 font-black">Tidak ada data</p>
            <p className="text-slate-400 text-sm mt-1">Coba ubah filter</p>
          </div>
        )}

        {/* ── MATRIX ── */}
        {!loading && groups.length > 0 && (
          <div className="bg-white rounded-[1.5rem] shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[10px] border-collapse">
                {/* Header */}
                <thead className="bg-[#003D79] text-white sticky top-0 z-20">
                  <tr>
                    <th className="px-2 py-2 text-left sticky left-0 bg-[#003D79] z-10 min-w-[40px]">#</th>
                    <th className="px-2 py-2 text-left sticky left-[40px] bg-[#003D79] z-10 min-w-[140px]">Nama</th>
                    <th className="px-2 py-2 text-left min-w-[110px]">Jabatan</th>
                    {Array.from({ length: jmlHari }, (_, i) => i + 1).map(d => (
                      <th key={d} className="px-1 py-2 text-center min-w-[32px] font-bold">
                        {String(d).padStart(2,'0')}
                      </th>
                    ))}
                    <th className="px-2 py-2 text-center min-w-[45px] bg-emerald-700">%</th>
                    <th className="px-2 py-2 text-center min-w-[35px]">S</th>
                    <th className="px-2 py-2 text-center min-w-[35px]">I</th>
                    <th className="px-2 py-2 text-center min-w-[35px]">A</th>
                    <th className="px-2 py-2 text-center min-w-[45px]">Off</th>
                    <th className="px-2 py-2 text-center min-w-[50px]">Cuti</th>
                    <th className="px-2 py-2 text-center min-w-[60px]">Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {groups.map(group => (
                    <>
                      {/* Group header */}
                      <tr key={`grp-${group.departemen}`} className="bg-slate-100 border-t-2 border-slate-200">
                        <td colSpan={jmlHari + 9} className="px-3 py-1.5 text-[11px] font-black uppercase tracking-widest text-slate-600 sticky left-0">
                          📋 {group.departemen} ({group.rows.length} orang)
                        </td>
                      </tr>
                      {/* Rows */}
                      {group.rows.map((row, idx) => (
                        <tr key={row.nrp} className="border-b border-slate-100 hover:bg-blue-50/30">
                          <td className="px-2 py-1.5 sticky left-0 bg-white z-10 text-slate-500 font-bold">{idx + 1}</td>
                          <td className="px-2 py-1.5 sticky left-[40px] bg-white z-10">
                            <div className="font-bold text-slate-800 leading-tight">{row.nama}</div>
                            <div className="text-[9px] text-slate-400">{row.nrp}</div>
                          </td>
                          <td className="px-2 py-1.5 text-slate-600">{row.jabatan}</td>
                          {row.days.map(d => {
                            // ⭐ CHAT 26: Logic warna baru
                            const s = CELL_STYLE[d.code] || CELL_STYLE['-']
                            const isDS = d.code === 'DS'
                            const isNS = d.code === 'NS'
                            const isHadir = isDS || isNS
                            const isTerlambat = isHadir && (d.terlambat_menit || 0) > 0

                            // Warna: HADIR TEPAT WAKTU = polos, TERLAMBAT = kuning
                            let cellBg = s.bg
                            let cellText = s.text
                            if (isHadir) {
                              if (isTerlambat) {
                                cellBg = 'bg-yellow-300'
                                cellText = 'text-yellow-900'
                              } else {
                                cellBg = 'bg-white border border-slate-200'
                                cellText = 'text-slate-600'
                              }
                            }

                            const displayCode = d.code === '-' ? '' : d.code
                            const tooltipText = isTerlambat 
                              ? `${fmtDate(d.tanggal)} — ⚠️ Terlambat ${d.terlambat_menit}m`
                              : isHadir 
                                ? `${fmtDate(d.tanggal)} — ✅ Tepat Waktu`
                                : `${fmtDate(d.tanggal)} — ${s.label}`

                            return (
                              <td key={d.tanggal} className="p-0.5">
                                <button
                                  onClick={() => {
                                    // Klik cell → popup detail (bukan langsung edit)
                                    if (d.clock_in || d.code !== '-') {
                                      setDetailCell({ row, day: d })
                                    } else if (canEdit) {
                                      setEditCell({ row, day: d })
                                    }
                                  }}
                                  className={`w-full py-1 rounded ${cellBg} ${cellText} font-black text-[9px] cursor-pointer hover:ring-2 hover:ring-[#003D79] active:scale-95 transition-all`}
                                  title={tooltipText}
                                >
                                  {displayCode}
                                </button>
                              </td>
                            )
                          })}
                          <td className={`px-1 py-1.5 text-center font-black ${
                            row.summary.persen >= 90 ? 'bg-emerald-100 text-emerald-800' :
                            row.summary.persen >= 70 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {row.summary.persen}
                          </td>
                          <td className="px-1 py-1.5 text-center text-pink-700 font-bold">{row.summary.sakit || '-'}</td>
                          <td className="px-1 py-1.5 text-center text-blue-700 font-bold">{row.summary.izin || '-'}</td>
                          <td className="px-1 py-1.5 text-center text-red-700 font-bold">{row.summary.alpha || '-'}</td>
                          <td className="px-1 py-1.5 text-center text-slate-600 font-bold">{row.summary.off || '-'}</td>
                          <td className="px-1 py-1.5 text-center text-orange-700 font-bold">{row.summary.cuti || '-'}</td>
                          <td className="px-1 py-1.5 text-center">
                            <button onClick={() => setDetailRow(row)}
                              className="text-[9px] bg-[#003D79] text-white px-2 py-1 rounded font-bold hover:bg-[#005099]">
                              👁️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ═══ MODAL POPUP DETAIL CELL (klik tanggal) ═══ CHAT 26 */}
      {detailCell && (
        <div 
          className="fixed inset-0 bg-black/60 z-[55] flex items-end lg:items-center justify-center p-0 lg:p-4"
          onClick={() => setDetailCell(null)}
        >
          <div 
            className="bg-white w-full lg:max-w-sm rounded-t-[2rem] lg:rounded-[2rem] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {(() => {
              const { row, day } = detailCell
              const isDS = day.code === 'DS'
              const isNS = day.code === 'NS'
              const isHadir = isDS || isNS
              const isTerlambat = isHadir && (day.terlambat_menit || 0) > 0
              const s = CELL_STYLE[day.code] || CELL_STYLE['-']

              const headerBg = isTerlambat ? 'bg-yellow-500' : isHadir ? 'bg-emerald-600' : 'bg-[#003D79]'
              const headerLabel = isTerlambat ? '⚠️ TERLAMBAT' : isHadir ? '✅ AMAN' : s.label

              return (
                <>
                  {/* Header */}
                  <div className={`${headerBg} text-white p-5`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[9px] font-black uppercase tracking-widest opacity-80">Detail Absensi</p>
                      <button 
                        onClick={() => setDetailCell(null)}
                        className="w-8 h-8 bg-white/20 rounded-full font-bold hover:bg-white/30"
                      >
                        ✕
                      </button>
                    </div>
                    <h3 className="text-lg font-black leading-tight">{row.nama}</h3>
                    <p className="text-white/80 text-xs mt-0.5">{fmtDate(day.tanggal)}</p>
                    <p className="text-white text-xl font-black mt-3">{headerLabel}</p>
                    {isTerlambat && day.terlambat_menit > 0 && (
                      <p className="text-white/90 text-sm font-bold mt-0.5">
                        Terlambat {day.terlambat_menit} menit
                      </p>
                    )}
                  </div>

                  {/* Body */}
                  <div className="p-5 space-y-3">
                    {/* Shift Info */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Roster</p>
                        <p className="text-sm font-black text-slate-800 mt-0.5">{day.roster || '-'}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Aktual</p>
                        <p className="text-sm font-black text-slate-800 mt-0.5">
                          {isDS ? 'Day Shift' : isNS ? 'Night Shift' : s.label}
                        </p>
                      </div>
                    </div>

                    {/* Clock In/Out */}
                    {(day.clock_in || day.clock_out) && (
                      <div className="bg-blue-50 rounded-xl p-4 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">🕐 Clock In</span>
                          <span className="font-mono font-black text-emerald-700 text-sm">{fmtTime(day.clock_in)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">🕐 Clock Out</span>
                          <span className="font-mono font-black text-slate-700 text-sm">{fmtTime(day.clock_out)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                          <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">⏱️ Jam Kerja</span>
                          <span className="font-mono font-black text-[#003D79] text-sm">{fmtJam(day.jam_kerja_menit)}</span>
                        </div>
                      </div>
                    )}

                    {/* Lokasi */}
                    {day.clock_in_lat && (
                      <a
                        href={`https://maps.google.com/?q=${day.clock_in_lat},${day.clock_in_lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block bg-slate-50 rounded-xl p-3 hover:bg-slate-100 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">📍 Lokasi Clock In</p>
                            <p className="text-xs font-mono text-slate-700 mt-0.5">
                              {Number(day.clock_in_lat).toFixed(4)}, {Number(day.clock_in_lng).toFixed(4)}
                            </p>
                          </div>
                          <span className="text-blue-600 text-2xl">→</span>
                        </div>
                      </a>
                    )}

                    {/* Keterangan */}
                    {day.keterangan && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                        <p className="text-[9px] font-black uppercase tracking-widest text-amber-700">📝 Keterangan</p>
                        <p className="text-xs text-amber-900 mt-1 italic">"{day.keterangan}"</p>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-2">
                      {canEdit && (
                        <button
                          onClick={() => {
                            setEditCell({ row, day })
                            setDetailCell(null)
                          }}
                          className="flex-1 bg-amber-500 text-white py-2.5 rounded-xl text-xs font-black hover:bg-amber-600"
                        >
                          ✏️ Edit
                        </button>
                      )}
                      <button
                        onClick={() => setDetailCell(null)}
                        className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl text-xs font-black hover:bg-slate-200"
                      >
                        Tutup
                      </button>
                    </div>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* ═══ MODAL DETAIL KARYAWAN ═══ */}
      {detailRow && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end lg:items-center justify-center p-0 lg:p-4"
             onClick={() => setDetailRow(null)}>
          <div className="bg-white w-full lg:max-w-3xl max-h-[90vh] rounded-t-[2rem] lg:rounded-[2rem] overflow-hidden flex flex-col"
               onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-[#003D79] text-white p-5 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-blue-300">Detail Absensi</p>
                <h2 className="text-xl font-black mt-1">{detailRow.nama}</h2>
                <p className="text-blue-200 text-sm">{detailRow.nrp} • {detailRow.jabatan} • {detailRow.site}</p>
              </div>
              <button onClick={() => setDetailRow(null)}
                className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center text-xl font-bold hover:bg-white/20">
                ✕
              </button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-4 gap-2 p-4 bg-slate-50">
              <div className="text-center">
                <p className="text-2xl font-black text-emerald-600">{detailRow.summary.persen}%</p>
                <p className="text-[9px] font-black uppercase text-slate-500">Kehadiran</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-[#003D79]">{detailRow.summary.hariHadir}</p>
                <p className="text-[9px] font-black uppercase text-slate-500">Hadir</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-red-600">{detailRow.summary.alpha}</p>
                <p className="text-[9px] font-black uppercase text-slate-500">Alfa</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-orange-600">{detailRow.summary.cuti}</p>
                <p className="text-[9px] font-black uppercase text-slate-500">Cuti</p>
              </div>
            </div>

            {/* Table detail */}
            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-xs">
                <thead className="bg-slate-100 sticky top-0">
                  <tr>
                    <th className="p-2 text-left">Tgl</th>
                    <th className="p-2 text-center">Roster</th>
                    <th className="p-2 text-center">Aktual</th>
                    <th className="p-2 text-center">C.In</th>
                    <th className="p-2 text-center">C.Out</th>
                    <th className="p-2 text-center">Jam</th>
                    <th className="p-2 text-center">📍</th>
                    {canEdit && <th className="p-2 text-center">⚙️</th>}
                  </tr>
                </thead>
                <tbody>
                  {detailRow.days.map(d => {
                    const s = CELL_STYLE[d.code] || CELL_STYLE['-']
                    return (
                      <tr key={d.tanggal} className="border-b border-slate-100">
                        <td className="p-2 font-bold">{d.day}</td>
                        <td className="p-2 text-center">
                          <span className="bg-slate-100 px-2 py-0.5 rounded font-bold text-[10px]">
                            {d.roster || '-'}
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <span className={`${s.bg} ${s.text} px-2 py-0.5 rounded font-black text-[10px]`}>
                            {d.code}
                          </span>
                        </td>
                        <td className="p-2 text-center text-emerald-700 font-mono">{fmtTime(d.clock_in)}</td>
                        <td className="p-2 text-center text-slate-700 font-mono">{fmtTime(d.clock_out)}</td>
                        <td className="p-2 text-center text-[#003D79] font-bold">{fmtJam(d.jam_kerja_menit)}</td>
                        <td className="p-2 text-center">
                          {d.clock_in_lat ? (
                            <a href={`https://maps.google.com/?q=${d.clock_in_lat},${d.clock_in_lng}`}
                               target="_blank" className="text-blue-600 text-lg">📍</a>
                          ) : '-'}
                        </td>
                        {canEdit && (
                          <td className="p-2 text-center">
                            <button onClick={() => setEditCell({ row: detailRow, day: d })}
                              className="text-blue-600 hover:text-blue-800">✏️</button>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 flex gap-2">
              {canEdit && detailRow.status_karyawan === 'Aktif' && (
                <button onClick={() => { setResignRow(detailRow); setDetailRow(null) }}
                  className="flex-1 bg-red-100 text-red-700 py-2.5 rounded-xl text-sm font-black hover:bg-red-200">
                  ⚠️ Set Resign
                </button>
              )}
              <button onClick={() => setDetailRow(null)}
                className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl text-sm font-black hover:bg-slate-200">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL EDIT CELL ═══ */}
      {editCell && canEdit && (
        <EditCellModal
          row={editCell.row}
          day={editCell.day}
          onClose={() => setEditCell(null)}
          onSaved={() => { setEditCell(null); fetchMatrix() }}
        />
      )}

      {/* ═══ MODAL RESIGN ═══ */}
      {resignRow && (
        <ResignModal
          row={resignRow}
          onClose={() => setResignRow(null)}
          onSaved={() => { setResignRow(null); fetchMatrix() }}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// MODAL EDIT CELL
// ═══════════════════════════════════════════════════════════
function EditCellModal({ row, day, onClose, onSaved }: any) {
  const [rosterShift, setRosterShift] = useState(day.roster || '')
  const [status,      setStatus]      = useState(day.status || '')
  const [clockIn,     setClockIn]     = useState(day.clock_in ? day.clock_in.slice(11, 16) : '')
  const [clockOut,    setClockOut]    = useState(day.clock_out ? day.clock_out.slice(11, 16) : '')
  const [keterangan,  setKeterangan]  = useState('')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')

  const handleSave = async () => {
    setSaving(true); setError('')
    try {
      const token = localStorage.getItem('btm_session_token_v1') || ''
      const payload: any = {
        nrp: row.nrp,
        tanggal: day.tanggal,
        roster_shift: rosterShift || null,
        keterangan,
      }
      if (status)   payload.status = status
      if (clockIn)  payload.clock_in  = `${day.tanggal}T${clockIn}:00+08:00`
      if (clockOut) payload.clock_out = `${day.tanggal}T${clockOut}:00+08:00`

      const res = await fetch('/api/attendance/matrix/edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      })
      const json = await res.json()
      if (!json.ok) { setError(json.error || 'Gagal simpan'); return }
      onSaved()
    } catch { setError('Koneksi gagal') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-end lg:items-center justify-center p-0 lg:p-4"
         onClick={onClose}>
      <div className="bg-white w-full lg:max-w-md rounded-t-[2rem] lg:rounded-[2rem] overflow-hidden"
           onClick={e => e.stopPropagation()}>
        <div className="bg-[#003D79] text-white p-4 flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-blue-300">Edit Cepat</p>
            <h3 className="text-lg font-black">{row.nama}</h3>
            <p className="text-blue-200 text-xs">{fmtDate(day.tanggal)}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 bg-white/10 rounded-full font-bold">✕</button>
        </div>

        <div className="p-5 space-y-3">
          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-700 text-xs font-bold">
              ⚠️ {error}
            </div>
          )}

          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Roster</label>
            <select value={rosterShift} onChange={e => setRosterShift(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50">
              <option value="">-- Kosong --</option>
              {ROSTER_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50">
              <option value="">-- Kosong --</option>
              {STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Clock In</label>
              <input type="time" value={clockIn} onChange={e => setClockIn(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50"/>
            </div>
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Clock Out</label>
              <input type="time" value={clockOut} onChange={e => setClockOut(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50"/>
            </div>
          </div>

          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Alasan</label>
            <textarea value={keterangan} onChange={e => setKeterangan(e.target.value)}
              placeholder="Alasan koreksi..." rows={2}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50"/>
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl text-sm font-black">
              Batal
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 bg-[#003D79] text-white py-2.5 rounded-xl text-sm font-black disabled:opacity-60">
              {saving ? 'Simpan...' : '✅ Simpan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// MODAL RESIGN
// ═══════════════════════════════════════════════════════════
function ResignModal({ row, onClose, onSaved }: any) {
  const [tanggalResign, setTanggalResign] = useState('')
  const [alasan, setAlasan] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(false)

  const handleResign = async () => {
    if (!tanggalResign) { setError('Tanggal resign wajib'); return }
    setSaving(true); setError('')
    try {
      const token = localStorage.getItem('btm_session_token_v1') || ''
      const res = await fetch('/api/employees/resign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          nrp: row.nrp,
          tanggal_resign: tanggalResign,
          alasan_resign: alasan
        })
      })
      const json = await res.json()
      if (!json.ok) { setError(json.error || 'Gagal set resign'); return }
      alert(`${row.nama} berhasil di-set Resign per ${tanggalResign}`)
      onSaved()
    } catch { setError('Koneksi gagal') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-end lg:items-center justify-center p-0 lg:p-4"
         onClick={onClose}>
      <div className="bg-white w-full lg:max-w-md rounded-t-[2rem] lg:rounded-[2rem] overflow-hidden"
           onClick={e => e.stopPropagation()}>
        <div className="bg-red-600 text-white p-4 flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-red-200">⚠️ SET RESIGN</p>
            <h3 className="text-lg font-black">{row.nama}</h3>
            <p className="text-red-200 text-xs">{row.nrp} • {row.jabatan}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 bg-white/10 rounded-full font-bold">✕</button>
        </div>

        <div className="p-5 space-y-3">
          {!confirm ? (
            <>
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-red-800 text-sm font-bold">⚠️ Perhatian!</p>
                <p className="text-red-700 text-xs mt-1">
                  Karyawan yang di-resign tidak akan muncul di rekap bulan berikutnya.
                  Data absensi masa lalu tetap tersimpan.
                </p>
              </div>

              {error && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-700 text-xs font-bold">
                  ⚠️ {error}
                </div>
              )}

              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                  Tanggal Resign
                </label>
                <input type="date" value={tanggalResign}
                  onChange={e => setTanggalResign(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50"/>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                  Alasan (Opsional)
                </label>
                <textarea value={alasan} onChange={e => setAlasan(e.target.value)}
                  placeholder="Alasan resign..." rows={3}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50"/>
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={onClose}
                  className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl text-sm font-black">
                  Batal
                </button>
                <button onClick={() => tanggalResign ? setConfirm(true) : setError('Tanggal wajib')}
                  className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-black">
                  Lanjut
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="bg-red-100 border-2 border-red-400 rounded-xl p-4 text-center">
                <p className="text-5xl mb-2">⚠️</p>
                <p className="text-red-900 font-black text-lg">Konfirmasi Resign</p>
                <p className="text-red-800 text-sm mt-2">
                  <strong>{row.nama}</strong><br/>
                  akan di-set RESIGN per <strong>{tanggalResign}</strong>
                </p>
                <p className="text-red-700 text-xs mt-2">
                  Ini tidak bisa langsung dibatalkan otomatis.<br/>
                  Perlu HR aktifkan manual jika salah.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={() => setConfirm(false)}
                  className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl text-sm font-black">
                  ← Batal
                </button>
                <button onClick={handleResign} disabled={saving}
                  className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-black disabled:opacity-60">
                  {saving ? 'Simpan...' : '✅ Ya, Resign'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}