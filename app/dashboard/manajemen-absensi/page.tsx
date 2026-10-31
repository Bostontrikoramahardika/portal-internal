'use client'


import { useState, useEffect, useCallback, useMemo, Fragment } from 'react'
import { useRouter } from 'next/navigation'

import StatBanner from '@/app/components/std/StatBanner'
import HeroBanner from '@/app/components/ui/HeroBanner'
import Toolbar, { FilterBox, ToolBtn } from '@/app/components/ui/Toolbar'
import KirimRekapPanel from '@/app/dashboard/kirim-rekap/page'
import LemburPanel from './LemburPanel'
import LemburKaryawan from './LemburKaryawan'
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
  unit?: string | null
  hm_awal?: any
  hm_akhir?: any
  hm_total?: number | null
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
    // ── Kompensasi cuti (input manual HR) ──
    kompensasi_cuti?: number
    kompensasi_keterangan?: string | null
    kompensasi_oleh?: string | null
    kompensasi_menunggu?: number
  }
}
interface Group { departemen: string; rows: Row[] }

function grupAbsensi(departemen: any, jabatan: any): string {
  const d = String(departemen || '').trim()
  if (d === 'Staff' || d === 'Plant' || d === 'Operator') return d
  const j = String(jabatan || '').toLowerCase()
  if (/operator/.test(j)) return 'Operator'
  if (/mekanik|mechanic|welder|tyreman|helper plant|admin plant|plant gl/.test(j)) return 'Plant'
  if (/pjo|hrga|she|planner|site admin|admin gl|admin ho|staff|logistic|driver lv/.test(j)) return 'Staff'
  return d || 'Lainnya'
}
function intiNrp(nrp: any): string {
  return String(nrp || '').trim().toUpperCase().replace(/^B/, '')
}
function kunciOrang(row: Row): string {
  const inti = intiNrp(row.nrp)
  if (inti) return 'NRP:' + inti
  return 'NAMA:' + String(row.nama || '').trim().toUpperCase().replace(/\s+/g, ' ')
}
function skorHari(d: Day | undefined): number {
  if (!d) return 0
  if (d.clock_in || ['DS', 'NS', 'DW', 'NW'].includes(d.code)) return 4
  if (['OFF', 'CR', 'CT', 'S', 'I', 'IR', 'ID', 'TR', 'LV', 'SCK', 'MCK'].includes(d.code)) return 3
  if (d.code === 'A') return 2
  if (d.code && d.code !== '-') return 1
  return 0
}
function gabungHari(a: Day, b?: Day): Day {
  if (!b) return a
  const pilih = skorHari(b) > skorHari(a) ? b : a
  const lain = pilih === b ? a : b
  return {
    ...pilih,
    unit: pilih.unit || lain.unit || null,
    hm_awal: pilih.hm_awal ?? lain.hm_awal ?? null,
    hm_akhir: pilih.hm_akhir ?? lain.hm_akhir ?? null,
    hm_total: pilih.hm_total ?? lain.hm_total ?? null,
  }
}
function ringkasDariHari(days: Day[], utama: Row): Row['summary'] {
  let hariHadir = 0, shiftS = 0, shiftM = 0, off = 0, cuti = 0, sakit = 0, izin = 0, alpha = 0, stb = 0
  for (const d of days) {
    const c = d.code
    if (['DS', 'NS', 'DW', 'NW'].includes(c)) hariHadir++
    if (c === 'DS' || c === 'DW') shiftS++
    if (c === 'NS' || c === 'NW') shiftM++
    if (c === 'OFF') off++
    if (['CR', 'CT', 'LV', 'SCK', 'MCK'].includes(c)) cuti++
    if (c === 'S') sakit++
    if (c === 'I' || c === 'IR') izin++
    if (c === 'A') alpha++
    if (c === 'ID' || c === 'TR') stb++
  }
  const hariKerja = utama.summary?.hariKerja || 0
  const persen = hariKerja > 0 ? Math.round((hariHadir / hariKerja) * 100) : 0
  return { ...utama.summary, hariHadir, shiftS, shiftM, off, cuti, sakit, izin, alpha, stb, persen }
}
function gabungRow(a: Row, b: Row): Row {
  const n = Math.max(a.days?.length || 0, b.days?.length || 0)
  const days = Array.from({ length: n }, (_, i) => {
    const x = a.days?.[i]
    const y = b.days?.[i]
    if (x && y) return gabungHari(x, y)
    return (x || y) as Day
  })
  const skorA = (a.days || []).reduce((s, d) => s + skorHari(d), 0)
  const skorB = (b.days || []).reduce((s, d) => s + skorHari(d), 0)
  const aB = String(a.nrp || '').toUpperCase().startsWith('B')
  const bB = String(b.nrp || '').toUpperCase().startsWith('B')
  const utama = skorA !== skorB ? (skorA > skorB ? a : b) : (aB && !bB ? b : a)
  return { ...utama, days, summary: ringkasDariHari(days, utama) }
}
function rapikanGroups(groups: Group[]): Group[] {
  const buckets: Record<string, Row[]> = { Staff: [], Plant: [], Operator: [], Lainnya: [] }
  const byKey = new Map<string, Row>()
  for (const g of groups || []) {
    for (const row of g.rows || []) {
      const nrp = String(row.nrp || '').trim()
      const nama = String(row.nama || '').trim()
      if (!nama || /^#/.test(nama) || /#NAME|#REF|#N\/A/i.test(nama)) continue
      if (!nrp || !/^[A-Za-z0-9]+$/.test(nrp)) continue
      const k = kunciOrang(row)
      const ada = byKey.get(k)
      byKey.set(k, ada ? gabungRow(ada, row) : row)
    }
  }
  for (const row of byKey.values()) {
    const dept = grupAbsensi(row.departemen, row.jabatan)
    if (!buckets[dept]) buckets[dept] = []
    buckets[dept].push(row)
  }
  return (['Staff', 'Plant', 'Operator', 'Lainnya'] as const)
    .filter((d) => buckets[d]?.length)
    .map((d) => ({
      departemen: d,
      rows: buckets[d].slice().sort((a, b) => a.nama.localeCompare(b.nama, 'id')),
    }))
}

// ─── Konstanta ──────────────────────────────────────────────
const CELL_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  'DS':  { bg: 'bg-sky-100',      text: 'text-sky-800',      label: 'Day Shift' },
  'NS':  { bg: 'bg-violet-100',   text: 'text-violet-800',   label: 'Night Shift' },
  'OFF': { bg: 'bg-slate-100', text: 'text-slate-600',        label: 'Off/Libur' },
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
  'DW':  { bg: 'bg-sky-50',       text: 'text-sky-800',      label: 'Day tanpa TS Opt' },
  'NW':  { bg: 'bg-violet-50',    text: 'text-violet-800',  label: 'Night tanpa TS Opt' },
  '-':   { bg: 'bg-white',        text: 'text-[#5a6a7e]',    label: 'Kosong' },
}
const ROSTER_OPTIONS = ['S','M','OFF','CR','CT','ID','TR','LV']
const KODE_OPTIONS = [
  { v: '', label: 'Otomatis (TS Opt / C.in)' },
  { v: 'DS', label: 'DS — Day Shift (ada unit)' },
  { v: 'NS', label: 'NS — Night Shift (ada unit)' },
  { v: 'DW', label: 'DW — Day, lupa/tidak di TS Opt' },
  { v: 'NW', label: 'NW — Night, lupa/tidak di TS Opt' },
  { v: 'S',  label: 'S — Sakit (dari eviden)' },
  { v: 'I',  label: 'I — Izin (dari eviden)' },
  { v: 'IR', label: 'IR — Izin resmi' },
  { v: 'A',  label: 'A — Alfa' },
  { v: 'OFF', label: 'OFF — Libur' },
  { v: 'CR', label: 'CR — Cuti roster' },
  { v: 'CT', label: 'CT — Cuti tahunan' },
  { v: 'ID', label: 'ID — Induksi' },
  { v: 'TR', label: 'TR — Training' },
]

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
const fmtHm = (n: any) => {
  if (n == null || n === '') return '-'
  const v = Number(n)
  if (Number.isNaN(v)) return '-'
  return v.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
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
  const [hasilImport, setHasilImport] = useState<any>(null)
  const [importing, setImporting] = useState(false)
  const [editCell,  setEditCell]  = useState<{ row: Row, day: Day } | null>(null)
  const [resignRow, setResignRow] = useState<Row | null>(null)
  // ⭐ CHAT 26: Popup detail cell (klik quick view)
  const [detailCell, setDetailCell] = useState<{ row: Row, day: Day } | null>(null)
  // ── Kompensasi cuti (input manual HR) ──
  const [kompRow,  setKompRow]  = useState<Row | null>(null)
  const [kompHari, setKompHari] = useState<string>('0')
  const [kompKet,  setKompKet]  = useState<string>('')
  const [kompSimpan, setKompSimpan] = useState(false)
  const [kompErr,  setKompErr]  = useState<string>('')

  // Export state
  const [exporting, setExporting] = useState<'matrix' | 'detail' | null>(null)
  const [tabUtama, setTabUtama] = useState<'matriks' | 'lembur' | 'kirim'>('matriks')

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
      if (!res.ok) {
        let pesan = 'Export Matrix gagal'
        try { const j = await res.json(); if (j?.error) pesan = j.error } catch {}
        alert(pesan); return
      }

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
  async function importExcel(file: File, terapkan: boolean) {
    setImporting(true)
    try {
      const token = localStorage.getItem('btm_session_token_v1') || ''
      const fd = new FormData()
      fd.append('file', file)
      fd.append('terapkan', terapkan ? '1' : '0')
      fd.append('bulan', bulan)

      const res = await fetch('/api/attendance/matrix/import', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      })
      const j = await res.json()
      if (!j.ok || j.mode === 'ditolak') {
        setHasilImport({
          mode: j.mode === 'ditolak' ? 'ditolak' : 'error',
          gagal: [j.error || 'Gagal memproses file'],
          jumlah_perubahan: Number(j.jumlah_perubahan || 0),
          ringkasan: j.ringkasan || null,
        })
        return
      }
      setHasilImport({ ...j, __file: file })
      if (j.mode === 'terapkan') fetchMatrix()
    } catch {
      setHasilImport({ mode: 'error', gagal: ['Koneksi gagal saat mengunggah file'], jumlah_perubahan: 0 })
    } finally {
      setImporting(false)
    }
  }

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
      setGroups(rapikanGroups(json.groups || []))
      setCanEdit(json.permission?.canEdit || false)
    } catch { setError('Koneksi gagal') }
    finally { setLoading(false) }
  }, [bulan, site, departemen, nama])

  useEffect(() => { fetchMatrix() }, [bulan, site, departemen, nama])

  // ── Buka modal kompensasi cuti ──
  function bukaKompensasi(row: Row) {
    setKompRow(row)
    setKompHari(String(Number(row.summary?.kompensasi_cuti || 0)))
    setKompKet(String(row.summary?.kompensasi_keterangan || ''))
    setKompErr('')
  }

  // ── Simpan kompensasi cuti (manual HR) ──
  async function simpanKompensasi() {
    if (!kompRow) return
    const nilai = Number(kompHari.replace(',', '.'))
    if (!Number.isFinite(nilai) || nilai < 0 || nilai > 31) {
      setKompErr('Isi 0 – 31 hari (boleh 0,5 untuk setengah hari)')
      return
    }
    setKompSimpan(true)
    setKompErr('')
    try {
      const token = localStorage.getItem('btm_session_token_v1') || ''
      const res = await fetch('/api/attendance/kompensasi-cuti', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          nrp: kompRow.nrp,
          periode: bulan,
          jumlah_hari: nilai,
          keterangan: kompKet,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j.ok) {
        setKompErr(j.error || 'Gagal menyimpan')
        return
      }
      setKompRow(null)
      fetchMatrix()
    } catch {
      setKompErr('Koneksi gagal')
    } finally {
      setKompSimpan(false)
    }
  }

  const namaBulan = new Date(bulan + '-01').toLocaleDateString('id-ID', {
    month: 'long', year: 'numeric'
  })
  const bulanSekarang = (() => {
    const n = new Date()
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
  })()

  const totalKaryawan = groups.reduce((acc, g) => acc + g.rows.length, 0)

  const TAB_UTAMA = [
    { id: 'matriks', label: 'Matriks' },
    { id: 'lembur', label: 'Lembur' },
    { id: 'kirim', label: 'Kirim Rekap' },
  ]

  // angka ringkas untuk banner (dari data nyata)
  const stat = useMemo(() => {
    const hariIni = new Date()
    const bulanIni = `${hariIni.getFullYear()}-${String(hariIni.getMonth() + 1).padStart(2, '0')}`
    const idxHariIni = bulan === bulanIni ? hariIni.getDate() - 1 : -1

    let total = 0, hadir = 0, alfa = 0, cuti = 0, lembur = 0
    for (const g of groups) {
      for (const r of g.rows) {
        total++
        if (idxHariIni >= 0) {
          const d = r.days[idxHariIni]
          if (d && (d.code === 'DS' || d.code === 'NS')) hadir++
        }
        for (const d of r.days) {
          if (d.code === 'A') alfa++
          else if (d.code === 'CT' || d.code === 'CR' || d.code === 'SCK' || d.code === 'MCK') cuti++
        }
        lembur += Number((r as any).lembur_jam || (r as any).total_lembur || 0)
      }
    }
    return { total, hadir, alfa, cuti, lembur }
  }, [groups, bulan])

  const BilahTab = () => (
    <Toolbar tabs={TAB_UTAMA} activeTab={tabUtama} onTab={(id) => setTabUtama(id as any)} />
  )

  if (tabUtama === 'lembur') {
    return (
      <div className="text-slate-800">
        <BilahTab />
        <LemburPanel />
      </div>
    )
  }

  if (tabUtama === 'kirim') {
    return (
      <div className="text-slate-800">
        <BilahTab />
        <KirimRekapPanel />
      </div>
    )
  }

  return (
    <div className="bg-[#f4f7fa] pb-24 text-slate-800">
      <BilahTab />
      


      {/* ── HERO ── */}
      <div className="hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }}/>
        <button onClick={() => router.back()}
          className="mb-4 flex items-center gap-1.5 text-white/60 hover:text-white text-sm relative z-10">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg> Kembali
        </button>
        <HeroBanner eyebrow="HR" judul="Manajemen Absensi" sub="Matrix Kehadiran Bulanan" />
      </div>

      <div className="px-4 space-y-4 relative z-10">

        {/* ══ HEADER: banner biru + tab + filter + aksi (satu blok ringkas) ══ */}
        <HeroBanner
          eyebrow="Manajemen Absensi"
          judul={`Matriks Absensi — ${namaBulan}`}
          sub={`${totalKaryawan} karyawan · ${site || 'Semua Site'} · ${bulan === bulanSekarang ? `data s.d. ${new Date().getDate()} ${namaBulan.split(' ')[0]}` : 'satu bulan penuh'}`}
          refreshing={loading}
          onRefresh={fetchMatrix}
          stats={[
            { label: 'Hadir hari ini', value: stat.hadir, tone: 'green' },
            { label: 'Alfa', value: stat.alfa, tone: 'red' },
            { label: 'Cuti/Izin', value: stat.cuti, tone: 'amber' },
            { label: 'Lembur j', value: stat.lembur ? stat.lembur.toFixed(1) : 0, tone: 'violet' },
            { label: 'Staff', value: stat.total, tone: 'sky' },
          ]}
        />

        <Toolbar
          tabs={TAB_UTAMA}
          activeTab={tabUtama}
          onTab={(id: string) => setTabUtama(id as any)}
          onReset={() => {
            setBulan(getMonthNow()); setSite(''); setDepartemen(''); setNama(''); setNamaInput('')
          }}
          actions={<>
            <ToolBtn tone="teal" onClick={handleExportMatrix}
              disabled={exporting !== null || groups.length === 0}>
              {exporting === 'matrix' ? '⏳ Export…' : '⤓ Excel Matriks'}
            </ToolBtn>
            <ToolBtn tone="navy" onClick={handleExportDetail}
              disabled={exporting !== null || groups.length === 0}>
              {exporting === 'detail' ? '⏳ Export…' : '⤓ Excel Detail'}
            </ToolBtn>
            {canEdit && (
              <label className="inline-flex h-6 cursor-pointer items-center gap-1 rounded border border-[#F3D19B] bg-[#FFF8EC] px-2 text-[10px] font-extrabold text-[#8A5300] transition-colors hover:bg-[#FFF1DA] active:scale-95">
                {importing ? '⏳ Memproses…' : '⤒ Import Koreksi'}
                <input type="file" accept=".xlsx,.xls" className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) importExcel(f, false)
                    e.currentTarget.value = ''
                  }} />
              </label>
            )}
          </>}
        >
          <FilterBox label="Bulan">
            <input type="month" value={bulan} onChange={e => setBulan(e.target.value)}
              className="border-0 bg-transparent text-[10px] font-bold text-slate-700 outline-none" />
          </FilterBox>
          <FilterBox label="Site">
            <select value={site} onChange={e => setSite(e.target.value)}
              className="border-0 bg-transparent text-[10px] font-bold text-slate-700 outline-none">
              <option value="">Semua Site</option>
              {siteList.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </FilterBox>
          <FilterBox label="Gol.">
            <select value={departemen} onChange={e => setDepartemen(e.target.value)}
              className="border-0 bg-transparent text-[10px] font-bold text-slate-700 outline-none">
              <option value="">Semua</option>
              <option value="Staff">Staff</option>
              <option value="Plant">Plant</option>
              <option value="Operator">Operator</option>
            </select>
          </FilterBox>
          <FilterBox label="Nama" className="min-w-[152px]">
            <input type="text" placeholder="cari nama / NRP…" value={namaInput}
              onChange={e => setNamaInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && setNama(namaInput)}
              className="w-full border-0 bg-transparent text-[10px] font-bold text-slate-700 outline-none placeholder:font-semibold placeholder:text-slate-400" />
            {namaInput ? (
              <button type="button" onClick={() => { setNamaInput(''); setNama('') }}
                className="text-[9px] text-slate-400">✕</button>
            ) : null}
          </FilterBox>
        </Toolbar>

        {/* HASIL IMPORT */}
        {hasilImport && (
          <div className="bg-white rounded-[1.5rem] shadow-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className={'text-[10px] font-black uppercase tracking-widest ' + (hasilImport.mode === 'ditolak' ? 'text-rose-600' : 'text-[#5a6a7e]')}>
                Hasil Import {hasilImport.mode === 'pratinjau'
                  ? '— Pratinjau'
                  : hasilImport.mode === 'ditolak'
                    ? '— DITOLAK (data tidak diubah)'
                    : hasilImport.mode === 'error'
                      ? '— Gagal'
                      : '— Diterapkan'}
              </p>
              <button onClick={() => setHasilImport(null)} className="text-slate-400 font-bold text-xs">✕</button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-50 rounded-lg py-1.5">
                <p className="text-lg font-black text-[#003D79]">{hasilImport.jumlah_perubahan ?? 0}</p>
                <p className="text-[9px] font-bold text-slate-500 uppercase">Sel berubah</p>
              </div>
              <div className="bg-emerald-50 rounded-lg py-1.5">
                <p className="text-lg font-black text-emerald-700">{hasilImport.terubah ?? '-'}</p>
                <p className="text-[9px] font-bold text-slate-500 uppercase">Diubah</p>
              </div>
              <div className="bg-sky-50 rounded-lg py-1.5">
                <p className="text-lg font-black text-sky-700">{hasilImport.tertambah ?? '-'}</p>
                <p className="text-[9px] font-bold text-slate-500 uppercase">Ditambah</p>
              </div>
            </div>

            {hasilImport.ringkasan && Object.keys(hasilImport.ringkasan).length > 0 && (
              <div className="flex flex-wrap gap-1">
                {Object.entries(hasilImport.ringkasan).map(([k, v]) => (
                  <span key={k} className="text-[10px] font-black bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded">
                    {k} : {String(v)}
                  </span>
                ))}
              </div>
            )}

            {Array.isArray(hasilImport.gagal) && hasilImport.gagal.length > 0 && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-2 text-[10px] text-rose-800 font-mono">
                {hasilImport.gagal.map((g: string, i: number) => <div key={i}>❌ {g}</div>)}
              </div>
            )}

            {hasilImport.mode === 'ditolak' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 space-y-1">
                <p className="text-[10px] font-black text-amber-900 uppercase tracking-wide">
                  Kok bisa ditolak? Cek 3 hal ini:
                </p>
                <p className="text-[10px] text-amber-800 leading-relaxed">
                  1. <strong>Bulan</strong> di filter harus sama dengan bulan di judul file
                  (mis. filter Oktober ↔ file &quot;REKAP ABSENSI — OKTOBER 2026&quot;).<br />
                  2. Pakai file hasil tombol <strong>Excel Matrix</strong>, dan sheet pertama
                  (&quot;Rekap Absensi&quot;) jangan diubah susunannya.<br />
                  3. Kalau data absensi di aplikasi <strong>masih rusak</strong> dari import
                  sebelumnya (banyak CT/CR tidak sesuai roster), berlakukan dulu
                  pemulihan data — file yang benar pun akan terlihat &quot;beda&quot;.
                </p>
                <p className="text-[10px] text-amber-800">
                  Data Anda <strong>tidak diubah sama sekali</strong> oleh percobaan ini.
                </p>
              </div>
            )}

            {Number(hasilImport.jumlah_dilewati) > 0 && (
              <p className="text-[10px] text-slate-500 font-bold">
                {hasilImport.jumlah_dilewati} sel dilewati (NRP tidak dikenal / kode kosong)
              </p>
            )}

            {hasilImport.mode === 'pratinjau' && (
              <div className="flex gap-2 pt-1">
                <button onClick={() => setHasilImport(null)}
                  className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-600 text-[11px] font-black uppercase">Batal</button>
                <button onClick={() => importExcel(hasilImport.__file, true)}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-[11px] font-black uppercase">
                  ✅ Terapkan ke Database
                </button>
              </div>
            )}

            {Array.isArray(hasilImport.contoh) && hasilImport.contoh.length > 0 && (
              <div className="max-h-48 overflow-auto border border-slate-100 rounded-lg">
                <table className="w-full text-[10px]">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="p-1 text-left">Nama</th>
                      <th className="p-1">Tgl</th>
                      <th className="p-1">Dari</th>
                      <th className="p-1">Jadi</th>
                      <th className="p-1">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hasilImport.contoh.map((c: any, i: number) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="p-1 font-bold">{c.nama}</td>
                        <td className="p-1 text-center">{String(c.tanggal).slice(8, 10)}</td>
                        <td className="p-1 text-center text-rose-600 font-bold">{c.dari}</td>
                        <td className="p-1 text-center text-emerald-700 font-black">{c.ke}</td>
                        <td className="p-1 text-center text-[9px] uppercase">{c.aksi}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── LEGENDA ringkas (satu baris, bisa digeser) ── */}
        <div className="flex items-center gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-white px-2 py-1">
          <span className="mr-1 shrink-0 text-[8px] font-black uppercase tracking-widest text-slate-400">Legenda</span>
          {Object.entries(CELL_STYLE).filter(([k]) => k !== '-').map(([code, st]) => (
            <span key={code}
              className="inline-flex h-[15px] shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white pl-0.5 pr-1.5 text-[8.5px] font-bold text-slate-600">
              <span className={`inline-flex items-center justify-center rounded-[2px] font-black ${st.bg} ${st.text}`}
                style={{ width: 17, height: 11, fontSize: 7 }}>{code}</span>
              {st.label}
            </span>
          ))}
          <span className="inline-flex h-[15px] shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white pl-0.5 pr-1.5 text-[8.5px] font-bold text-slate-600">
            <span className="inline-flex items-center justify-center rounded-[2px] bg-yellow-300 font-black text-yellow-900"
              style={{ width: 17, height: 11, fontSize: 7 }}>DS</span>
            Terlambat
          </span>
        </div>

        {/* ── ERROR ── */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-[1.5rem] p-4 text-rose-700 text-sm font-bold">
            ⚠️ {error}
          </div>
        )}

        {/* ── LOADING: skeleton (bukan spinner) ── */}
        {loading && (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="h-7 animate-pulse bg-slate-200/80" />
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
                <div className="h-2.5 w-24 animate-pulse rounded bg-slate-200" />
                <div className="h-2.5 flex-1 animate-pulse rounded bg-slate-100" />
                <div className="h-2.5 w-10 animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>
        )}

        {/* ── EMPTY ── */}
        {!loading && groups.length === 0 && !error && (
          <div className="bg-white rounded-[2rem] shadow-xl p-12 text-center">
            <div className="text-6xl mb-3">📭</div>
            <p className="text-slate-600 font-black">Tidak ada data</p>
            <p className="text-[#5a6a7e] text-sm mt-1">Coba ubah filter</p>
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
                    <th className="px-2 py-2 text-left sticky left-0 bg-[#003D79] z-10 min-w-[28px]">#</th>
                    <th className="px-2 py-2 text-left sticky left-[28px] bg-[#003D79] z-10 min-w-[120px]">Nama</th>
                    <th className="px-2 py-2 text-left min-w-[88px]">Jabatan</th>
                    {Array.from({ length: jmlHari }, (_, i) => i + 1).map(d => (
                      <th key={d} className="px-0.5 py-2 text-center min-w-[22px] font-bold">
                        {String(d).padStart(2,'0')}
                      </th>
                    ))}
                    <th className="px-2 py-2 text-center min-w-[38px] bg-emerald-700">%</th>
                    <th className="px-1 py-2 text-center min-w-[44px]">HM</th>
                    <th className="px-1 py-2 text-center min-w-[26px]">S</th>
                    <th className="px-1 py-2 text-center min-w-[26px]">I</th>
                    <th className="px-1 py-2 text-center min-w-[26px]">A</th>
                    <th className="px-1 py-2 text-center min-w-[32px]">Off</th>
                    <th className="px-1 py-2 text-center min-w-[36px]">Cuti</th>
                    <th className="px-1 py-2 text-center min-w-[46px] bg-teal-700" title="Kompensasi cuti (hari) — input manual HR">Komp. Cuti</th>
                    <th className="px-1 py-2 text-center min-w-[52px] bg-amber-600" title="Total jam lembur yang sudah disetujui">Lembur</th>
                    <th className="px-1 py-2 text-center min-w-[44px]">Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {groups.map(group => (
                    <Fragment key={group.departemen}>
                      {/* Group header */}
                      <tr key={`grp-${group.departemen}`} className="bg-slate-100 border-t-2 border-slate-200">
                        <td colSpan={jmlHari + 13} className="px-3 py-1.5 text-[11px] font-black uppercase tracking-widest text-slate-600 sticky left-0">
                          📋 {group.departemen} ({group.rows.length} orang)
                        </td>
                      </tr>
                      {/* Rows */}
                      {group.rows.map((row, idx) => (
                        <tr key={row.nrp} className="border-b border-slate-100 hover:bg-blue-50/30">
                          <td className="px-2 py-1.5 sticky left-0 bg-white z-10 text-slate-500 font-bold">{idx + 1}</td>
                          <td className="px-2 py-1.5 sticky left-[40px] bg-white z-10">
                            <div className="font-bold text-slate-800 leading-tight">{row.nama}</div>
                            <div className="text-[9px] text-[#5a6a7e]">{row.nrp}</div>
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
                          <td className="px-1 py-1.5 text-center font-black text-[#003D79] tabular-nums">
                            {fmtHm(row.days.reduce((s, d) => s + (Number(d.hm_total) || 0), 0))}
                          </td>
                          <td className="px-1 py-1.5 text-center text-pink-700 font-bold">{row.summary.sakit || '-'}</td>
                          <td className="px-1 py-1.5 text-center text-blue-700 font-bold">{row.summary.izin || '-'}</td>
                          <td className="px-1 py-1.5 text-center text-red-700 font-bold">{row.summary.alpha || '-'}</td>
                          <td className="px-1 py-1.5 text-center text-slate-600 font-bold">{row.summary.off || '-'}</td>
                          <td className="px-1 py-1.5 text-center text-orange-700 font-bold">{row.summary.cuti || '-'}</td>
                          <td className="px-1 py-1.5 text-center tabular-nums">
                            {(() => {
                              const hari = Number(row.summary?.kompensasi_cuti || 0)
                              const tunggu = Number(row.summary?.kompensasi_menunggu || 0)
                              return (
                                <button
                                  type="button"
                                  onClick={() => (canEdit ? bukaKompensasi(row) : undefined)}
                                  title={
                                    'Kompensasi cuti: ' + (hari || 0) + ' hari' +
                                    (tunggu > 0 ? ' • ' + tunggu + ' hari pengajuan masih menunggu' : '') +
                                    (row.summary?.kompensasi_keterangan ? ' • ' + row.summary.kompensasi_keterangan : '') +
                                    (canEdit ? ' — klik untuk mengubah' : '')
                                  }
                                  className={
                                    'w-full rounded px-1 py-0.5 font-black transition-colors ' +
                                    (canEdit ? 'hover:ring-2 hover:ring-teal-600 cursor-pointer ' : 'cursor-default ') +
                                    (hari > 0 ? 'bg-teal-100 text-teal-800' : 'text-slate-300')
                                  }
                                >
                                  <div className="leading-tight">{hari > 0 ? hari : '-'}</div>
                                  {tunggu > 0 && (
                                    <div className="text-[8px] font-black leading-none text-amber-600" title="Pengajuan cuti kompensasi belum disetujui">
                                      +{tunggu}
                                    </div>
                                  )}
                                </button>
                              )
                            })()}
                          </td>
                          <td className="px-1 py-1.5 text-center tabular-nums">
                            {(() => {
                              const jam = Number(row.summary?.jam_lembur || 0)
                              const tunggu = Number(row.summary?.lembur_menunggu || 0)
                              const kali = Number(row.summary?.lembur || 0)
                              if (!jam && !tunggu && !kali) return <span className="text-slate-300">-</span>
                              return (
                                <>
                                  <div className={`font-black ${jam ? 'text-amber-700' : 'text-slate-300'}`}>
                                    {jam ? fmtHm(jam) : '-'}
                                  </div>
                                  <div className="text-[8px] text-slate-400 leading-none">{kali}x</div>
                                  {tunggu > 0 && (
                                    <div className="text-[8px] text-amber-500 font-black leading-none"
                                      title="Ada lembur belum disetujui">
                                      +{tunggu}
                                    </div>
                                  )}
                                </>
                              )
                            })()}
                          </td>
                          <td className="px-1 py-1.5 text-center">
                            <button onClick={() => setDetailRow(row)}
                              className="text-[9px] bg-[#003D79] text-white px-2 py-1 rounded font-bold hover:bg-[#005099]">
                              👁️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </Fragment>
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
            className="bg-white w-full lg:max-w-md rounded-t-[2rem] lg:rounded-[2rem] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {(() => {
              const { row, day } = detailCell
              const isDS = day.code === 'DS'
              const isNS = day.code === 'NS'
              const adaClock = !!(day.clock_in || day.clock_out)
              const isHadir = isDS || isNS
              const isTerlambat = isHadir && adaClock && (day.terlambat_menit || 0) > 0
              const s = CELL_STYLE[day.code] || CELL_STYLE['-']

              const headerBg = isTerlambat ? 'bg-yellow-500' : isHadir && adaClock ? 'bg-emerald-600' : isHadir ? 'bg-[#003D79]' : 'bg-[#003D79]'
              const headerLabel = isTerlambat ? '⚠️ TERLAMBAT' : isHadir && adaClock ? '✅ AMAN' : isHadir ? (isNS ? 'NS · TS Opt' : 'DS · TS Opt') : s.label

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
                        <p className="text-[9px] font-black uppercase tracking-widest text-[#5a6a7e]">Roster</p>
                        <p className="text-sm font-black text-slate-800 mt-0.5">{day.roster || '-'}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-[9px] font-black uppercase tracking-widest text-[#5a6a7e]">Aktual</p>
                        <p className="text-sm font-black text-slate-800 mt-0.5">
                          {isDS ? 'Day Shift' : isNS ? 'Night Shift' : s.label}
                        </p>
                      </div>
                    </div>

                    <div className="bg-blue-50 rounded-xl p-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">C.In</span>
                        <span className="font-mono font-black text-emerald-700 text-sm">{fmtTime(day.clock_in)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">C.Out</span>
                        <span className="font-mono font-black text-slate-700 text-sm">{fmtTime(day.clock_out)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Unit</span>
                        <span className="font-black text-slate-800 text-sm">{day.unit || '-'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">HM Awal</span>
                        <span className="font-mono font-black text-slate-800 text-sm">{day.hm_awal != null && day.hm_awal !== '' ? fmtHm(day.hm_awal) : '-'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">HM Akhir</span>
                        <span className="font-mono font-black text-slate-800 text-sm">{day.hm_akhir != null && day.hm_akhir !== '' ? fmtHm(day.hm_akhir) : '-'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Total HM</span>
                        <span className="font-mono font-black text-[#003D79] text-sm">{day.hm_total != null && day.hm_total !== '' ? fmtHm(day.hm_total) : '-'}</span>
                      </div>
                    </div>

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
                            <p className="text-[9px] font-black uppercase tracking-widest text-[#5a6a7e]">📍 Lokasi Clock In</p>
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
                          className="flex-1 bg-[#003d79] text-white py-2.5 rounded-xl text-xs font-black hover:bg-[#002a57] text-white"
                        >
                          ✏️ Ubah absensi
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

      {/* ═══ MODAL KOMPENSASI CUTI (INPUT MANUAL HR) ═══ */}
      {kompRow && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end lg:items-center justify-center p-0 lg:p-4"
             onClick={() => setKompRow(null)}>
          <div className="bg-white w-full lg:max-w-md rounded-t-[1.5rem] lg:rounded-[1.5rem] overflow-hidden"
               onClick={e => e.stopPropagation()}>

            <div className="bg-gradient-to-r from-[#092A5E] to-[#12428A] text-white px-4 py-3 flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-widest text-teal-200">Kompensasi Cuti</p>
                <h2 className="text-sm font-black mt-0.5 truncate">{kompRow.nama}</h2>
                <p className="text-[10px] text-blue-200">{kompRow.nrp} • {kompRow.jabatan} • {kompRow.site}</p>
              </div>
              <button onClick={() => setKompRow(null)}
                className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center text-sm font-bold hover:bg-white/25 shrink-0">
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="rounded-lg bg-teal-50 border border-teal-200 px-3 py-2">
                <p className="text-[10px] font-bold text-teal-800 leading-snug">
                  Periode <strong>{namaBulan}</strong> — isi jumlah <strong>hari kompensasi cuti</strong> yang
                  diberikan/potong untuk karyawan ini. Nilai ini ikut tercetak di file Excel rekap absensi.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                  Jumlah hari kompensasi
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={31}
                    step={0.5}
                    value={kompHari}
                    onChange={(e) => setKompHari(e.target.value)}
                    className="w-24 px-3 py-2 rounded-lg border-2 border-slate-200 focus:border-teal-500 outline-none text-sm font-black text-center tabular-nums"
                  />
                  <span className="text-xs font-bold text-slate-500">hari</span>
                  <div className="flex gap-1 ml-auto">
                    {['0', '0.5', '1', '2', '3'].map((v) => (
                      <button key={v} type="button" onClick={() => setKompHari(v)}
                        className={'px-2 py-1 rounded-md text-[10px] font-black border transition-colors ' +
                          (String(kompHari) === v
                            ? 'bg-teal-600 text-white border-teal-700'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50')}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                  Keterangan (opsional)
                </label>
                <input
                  type="text"
                  value={kompKet}
                  onChange={(e) => setKompKet(e.target.value)}
                  placeholder="contoh: kompensasi kerja hari libur 17 Agustus"
                  className="w-full px-3 py-2 rounded-lg border-2 border-slate-200 focus:border-teal-500 outline-none text-xs font-semibold"
                />
              </div>

              {Number(kompRow.summary?.kompensasi_menunggu || 0) > 0 && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                  <p className="text-[10px] font-bold text-amber-800">
                    ⏳ Ada <strong>{kompRow.summary?.kompensasi_menunggu} hari</strong> pengajuan CUTI KOMPENSASI
                    yang belum disetujui di periode ini. Angkanya belum masuk hitungan.
                  </p>
                </div>
              )}

              {kompErr && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2">
                  <p className="text-[10px] font-bold text-rose-700">⚠️ {kompErr}</p>
                </div>
              )}

              {kompRow.summary?.kompensasi_oleh && (
                <p className="text-[9px] text-slate-400 font-bold">
                  Terakhir diubah: {kompRow.summary?.kompensasi_oleh}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button onClick={() => setKompRow(null)}
                  className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl text-xs font-black hover:bg-slate-200">
                  Batal
                </button>
                <button onClick={simpanKompensasi} disabled={kompSimpan}
                  className="flex-1 bg-teal-600 text-white py-2.5 rounded-xl text-xs font-black hover:bg-teal-700 disabled:opacity-60">
                  {kompSimpan ? 'Menyimpan…' : '💾 Simpan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL DETAIL KARYAWAN ═══ */}
      {detailRow && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end lg:items-center justify-center p-0 lg:p-4"
             onClick={() => setDetailRow(null)}>
          <div className="bg-white w-full lg:max-w-5xl max-h-[90vh] rounded-t-[2rem] lg:rounded-[2rem] overflow-hidden flex flex-col"
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
            <div className="px-4 pt-4 bg-slate-50">
              <div className="bg-[#003D79] text-white rounded-xl px-4 py-2.5 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-200">Total HM</span>
                <span className="text-2xl font-black tabular-nums">
                  {fmtHm(detailRow.days.reduce((s, d) => s + (Number(d.hm_total) || 0), 0))}
                </span>
              </div>
            </div>
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

            {/* ═══ LEMBUR: rincian + status persetujuan + ubah ═══ */}
            <LemburKaryawan row={detailRow} canEdit={canEdit} onUbah={() => fetchMatrix()} />

            {/* Table detail */}
            <div className="flex-1 overflow-auto p-4">
              <table className="w-full text-xs min-w-[720px]">
                <thead className="bg-slate-100 sticky top-0">
                  <tr>
                    <th className="p-2 text-left">Tgl</th>
                    <th className="p-2 text-center">Roster</th>
                    <th className="p-2 text-center">Aktual</th>
                    <th className="p-2 text-center">C.In</th>
                    <th className="p-2 text-center">C.Out</th>
                    <th className="p-2 text-center">Unit</th>
                    <th className="p-2 text-center">HM Awal</th>
                    <th className="p-2 text-center">HM Akhir</th>
                    <th className="p-2 text-center">Total HM</th>
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
                        <td className="p-2 text-center font-bold text-slate-800 whitespace-nowrap">{d.unit || '-'}</td>
                        <td className="p-2 text-center font-mono text-slate-700">{d.hm_awal != null && d.hm_awal !== '' ? fmtHm(d.hm_awal) : '-'}</td>
                        <td className="p-2 text-center font-mono text-slate-700">{d.hm_akhir != null && d.hm_akhir !== '' ? fmtHm(d.hm_akhir) : '-'}</td>
                        <td className="p-2 text-center font-black text-[#003D79]">{d.hm_total != null && d.hm_total !== '' ? fmtHm(d.hm_total) : '-'}</td>
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
  const [kode,        setKode]        = useState(day.code && day.code !== '-' ? day.code : '')
  const [clockIn,     setClockIn]     = useState(day.clock_in ? String(day.clock_in).slice(11, 16) : '')
  const [clockOut,    setClockOut]    = useState(day.clock_out ? String(day.clock_out).slice(11, 16) : '')
  const [keterangan,  setKeterangan]  = useState(String(day.keterangan || '').replace(/\[MANUAL:[A-Z]+\]\s*/gi, '').trim())
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')
  const [eviden,      setEviden]      = useState<any[]>([])

  useEffect(() => {
    const token = localStorage.getItem('btm_session_token_v1') || ''
    fetch(`/api/attendance/matrix/edit?nrp=${encodeURIComponent(row.nrp)}&tanggal=${encodeURIComponent(day.tanggal)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }).then(r => r.json()).then(d => { if (d.ok) setEviden(d.eviden || []) }).catch(() => {})
  }, [row.nrp, day.tanggal])

  const handleSave = async () => {
    setSaving(true); setError('')
    try {
      const token = localStorage.getItem('btm_session_token_v1') || ''
      const ketAsli = String(keterangan || '').replace(/\[MANUAL:[A-Z]+\]\s*/gi, '').trim()
      const payload: any = {
        nrp: row.nrp,
        tanggal: day.tanggal,
        roster_shift: rosterShift || null,
        status: kode || null,
        keterangan: kode ? `[MANUAL:${kode}] ${ketAsli}`.trim() : ketAsli,
      }
      if (kode === 'NS' || kode === 'NW') payload.shift = 'MALAM'
      else if (kode === 'DS' || kode === 'DW') payload.shift = 'SIANG'
      if (clockIn)  payload.clock_in  = `${day.tanggal}T${clockIn}:00+08:00`
      else payload.clock_in = null
      if (clockOut) payload.clock_out = `${day.tanggal}T${clockOut}:00+08:00`
      else payload.clock_out = null

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

      // verifikasi: kode yang tersimpan harus sama dengan yang dipilih
      const ket = String(json?.updated?.terverifikasi?.keterangan || json?.updated?.attendance?.keterangan || '')
      const sts = String(json?.updated?.terverifikasi?.status || json?.updated?.attendance?.status || '')
      const kodeTersimpan = (ket.match(/\[MANUAL:([A-Z]+)\]/i)?.[1] || sts || '').toUpperCase()

      if (kode && kodeTersimpan && kodeTersimpan !== kode.toUpperCase()) {
        setError(`Tersimpan sebagai "${kodeTersimpan}", bukan "${kode}". Coba simpan ulang.`)
        return
      }
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
            <label className="text-[9px] font-black uppercase tracking-widest text-[#5a6a7e] block mb-1">Roster</label>
            <select value={rosterShift} onChange={e => setRosterShift(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50">
              <option value="">-- Kosong --</option>
              {ROSTER_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          {eviden.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-amber-800">Eviden karyawan</p>
              {eviden.map((ev: any) => (
                <div key={ev.id} className="text-xs text-amber-900">
                  <span className="font-black">{ev.kategori || '-'}</span>
                  {' · '}{ev.status_atasan || '-'}
                  {ev.keterangan ? ` · ${ev.keterangan}` : ''}
                  {ev.foto_url ? (
                    <>
                      {' · '}
                      <a href={ev.foto_url} target="_blank" rel="noreferrer" className="underline font-bold">Lihat bukti</a>
                    </>
                  ) : null}
                </div>
              ))}
              <p className="text-[10px] text-amber-700">Izin/sakit mengacu eviden ini. Tetap bisa diubah di bawah.</p>
            </div>
          )}

          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-[#5a6a7e] block mb-1">Kode absensi</label>
            <select value={kode} onChange={e => setKode(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50">
              {KODE_OPTIONS.map(o => <option key={o.v || 'auto'} value={o.v}>{o.label}</option>)}
            </select>
            <p className="text-[10px] text-slate-500 mt-1">Lupa absen tapi masuk: pilih DS/NS (ada unit) atau DW/NW.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-[#5a6a7e] block mb-1">Clock In</label>
              <input type="time" value={clockIn} onChange={e => setClockIn(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50"/>
            </div>
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-[#5a6a7e] block mb-1">Clock Out</label>
              <input type="time" value={clockOut} onChange={e => setClockOut(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50"/>
            </div>
          </div>

          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-[#5a6a7e] block mb-1">Alasan</label>
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
                <label className="text-[9px] font-black uppercase tracking-widest text-[#5a6a7e] block mb-1">
                  Tanggal Resign
                </label>
                <input type="date" value={tanggalResign}
                  onChange={e => setTanggalResign(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50"/>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-[#5a6a7e] block mb-1">
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