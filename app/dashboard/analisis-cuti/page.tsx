'use client'

import HeroBanner from '@/app/components/ui/HeroBanner'

// ═══════════════════════════════════════════════════════════════════════════
// ANALISIS CUTI — Rencana & Periodical Cuti
// Data: app/lib/data/cuti-proyeksi.json (hasil hitung roster Oktober & November 2026)
// Style: mengikuti UI kit BTM (navy #0b2a5b, aksen #00c37a, kartu rounded-2xl)
// ═══════════════════════════════════════════════════════════════════════════

import { useMemo, useState } from 'react'
import { StdPage, StatBanner, TopTabs } from '@/app/components/std'
import DATA from '@/app/lib/data/cuti-proyeksi.json'

type CutiSel = { d: string; t: 'a' | 'p' }
type Orang = {
  n: string; nm: string; k: string; j: string; mk: number | null; s: number; cuti30: CutiSel[]
}
type Bulan = { p: string; hari: number; i0: number }

const NM = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const NMB = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const KAT = ['Operator PC200', 'Operator D85', 'Operator Grader', 'Team Plant', 'Leader', 'PJO & Deputy']

const orang = DATA.orang as Orang[]
const BUL = DATA.bulan_list as Bulan[]
const HC = DATA.meta.hc
const HAR = DATA.harian as Record<string, number[]>
const DEPT = DATA.dept as { p: string; k: string; n: number; tot: number; pct: number }[]
const DEPT_HC = DATA.dept_hc as Record<string, number>
const GRUP = DATA.grup as Record<string, { kat: string; unit: number; op: number; off: number }>
const UNIT = DATA.unit as { kode: string; tipe: string; status: string }[]

const AMBANG = Math.round(HC * 0.2)

// ── helper ────────────────────────────────────────────────────────────────
const n2 = (x: number) => (x < 10 ? '0' + x : '' + x)
const f1 = (x: number) => (Math.round(x * 10) / 10).toFixed(1).replace('.', ',')
const lam = (p: string) => `${NM[+p.slice(5) - 1]} ${p.slice(0, 4)}`
const addD = (d: Date, i: number) => { const x = new Date(d); x.setDate(x.getDate() + i); return x }
const dt = (s: string) => new Date(s + 'T00:00:00')
const tglPendek = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}`

// total orang cuti per hari (semua departemen)
const TOTAL_HARIAN: number[] = (() => {
  const n = BUL[BUL.length - 1].i0 + BUL[BUL.length - 1].hari
  const arr = new Array(n).fill(0)
  for (const k in HAR) for (let i = 0; i < n; i++) arr[i] += HAR[k][i] || 0
  return arr
})()

const RINGKAS = BUL.map((b) => {
  let pd = 0, pk = 0
  for (let i = b.i0; i < b.i0 + b.hari; i++) {
    const c = TOTAL_HARIAN[i] || 0
    pd += c
    if (c > pk) pk = c
  }
  return { ...b, pd, pk, rata: pd / b.hari }
})

const TOP5 = [...RINGKAS].sort((a, b) => b.pk - a.pk).slice(0, 5)
const TOT_PD = RINGKAS.reduce((a, b) => a + b.pd, 0)
const PK_MAX = RINGKAS.reduce((a, b) => (b.pk > a.pk ? b : a), RINGKAS[0])
const BULAN_RAWAN = RINGKAS.filter((b) => b.pk > AMBANG).length
const MAP_DEPT: Record<string, { n: number; pct: number }> = {}
DEPT.forEach((d) => { MAP_DEPT[d.p + '|' + d.k] = d })

// ═══════════════════════════════════════════════════════════════════════════
export default function AnalisisCutiPage() {
  const [tab, setTab] = useState('ringkasan')

  const tabs = [
    { id: 'ringkasan', label: 'Ringkasan', icon: '📊' },
    { id: 'kalender', label: 'Kalender', icon: '🗓️' },
    { id: 'perorang', label: 'Cuti per Orang', icon: '👤' },
    { id: 'departemen', label: 'Per Departemen', icon: '🏭' },
    { id: 'operator', label: 'Operator vs Unit', icon: '🚜' },
    { id: 'periodical', label: 'Periodical Cuti', icon: '📅' },
  ]

  return (
    <StdPage width="full">
      <HeroBanner eyebrow="ANALISIS CUTI" judul="Rencana & Periodical Cuti" />

      <TopTabs tabs={tabs} value={tab} onChange={setTab} scroll />

      {tab === 'ringkasan' && <Ringkasan />}
      {tab === 'kalender' && <Kalender />}
      {tab === 'perorang' && <PerOrang />}
      {tab === 'departemen' && <PerDepartemen />}
      {tab === 'operator' && <OperatorUnit />}
      {tab === 'periodical' && <Periodical />}
    </StdPage>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. RINGKASAN
// ═══════════════════════════════════════════════════════════════════════════
function Ringkasan() {
  const [thn, setThn] = useState(0)
  const kelompok = [RINGKAS.slice(0, 12), RINGKAS.slice(12, 24), RINGKAS.slice(24, 36)]
  const baris = kelompok[thn]
  const maks = Math.max(...baris.map((b) => b.pk))

  const stat = [
    { l: 'Rata-rata cuti/hari', v: Math.round(TOT_PD / (BUL.length * 30.4)), s: `dari ${HC}`, cap: 'Tidak masuk karena cuti roster', tone: 'text-[#003D79]' },
    { l: 'Puncak tertinggi', v: PK_MAX.pk, s: 'orang', cap: `Terjadi ${lam(PK_MAX.p)}`, tone: 'text-red-600' },
    { l: 'Bulan di atas batas', v: BULAN_RAWAN, s: `dari ${BUL.length}`, cap: `Ada hari > ${AMBANG} orang cuti`, tone: 'text-amber-600' },
    { l: 'Batas aman', v: AMBANG, s: 'orang/hari', cap: '20% dari total karyawan', tone: 'text-emerald-600' },
  ]

  return (
    <>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {stat.map((x) => (
          <div key={x.l} className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{x.l}</p>
            <p className={`mt-1 text-2xl font-black leading-none ${x.tone}`}>
              {x.v} <span className="text-[11px] font-bold text-slate-400">{x.s}</span>
            </p>
            <p className="mt-1 text-[10px] leading-snug text-slate-500">{x.cap}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-[13px] font-black text-[#0b2a5b]">Orang cuti di hari paling padat</h3>
            <p className="mt-0.5 text-[10px] text-slate-500">Tiap batang = 1 bulan. Angka = orang cuti bersamaan di hari terpadat.</p>
          </div>
          <div className="flex shrink-0 gap-1 rounded-lg bg-slate-100 p-0.5">
            {['Tahun 1', 'Tahun 2', 'Tahun 3'].map((t, i) => (
              <button key={t} onClick={() => setThn(i)}
                className={`rounded-md px-2 py-1 text-[10px] font-black transition ${thn === i ? 'bg-white text-[#0b2a5b] shadow-sm' : 'text-slate-500'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="relative mt-4 flex h-32 items-end gap-1 border-b border-slate-200 pb-0">
          <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-red-400" style={{ bottom: `${(AMBANG / maks) * 100}%` }}>
            <span className="absolute right-0 -top-3.5 rounded bg-white px-1 text-[8px] font-black text-red-500">batas {AMBANG}</span>
          </div>
          {baris.map((b) => {
            const h = Math.max(3, (b.pk / maks) * 100)
            const tone = b.pk > AMBANG ? 'bg-red-400' : b.pk > AMBANG * 0.75 ? 'bg-amber-300' : 'bg-slate-300'
            return (
              <div key={b.p} className="relative flex h-full flex-1 items-end" title={`${lam(b.p)}: puncak ${b.pk} orang`}>
                <div className={`w-full rounded-t ${tone}`} style={{ height: `${h}%` }} />
                <span className="absolute inset-x-0 -top-3 text-center text-[7px] font-black text-slate-400">{b.pk}</span>
              </div>
            )
          })}
        </div>
        <div className="mt-1 flex gap-1">
          {baris.map((b) => (
            <div key={b.p} className="flex-1 text-center text-[8px] font-bold text-slate-400">{NM[+b.p.slice(5) - 1]}</div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
        <h3 className="text-[13px] font-black text-[#0b2a5b]">5 bulan paling perlu diwaspadai</h3>
        <p className="mt-0.5 text-[10px] text-slate-500">Kolom kanan = % orang per departemen yang cuti di bulan itu.</p>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[8px] uppercase tracking-wider text-slate-400">
                <th className="py-1.5 pr-2">Bulan</th>
                <th className="px-2 text-right">Puncak</th>
                <th className="px-2 text-right">Rata</th>
                <th className="px-2 text-right">PC200</th>
                <th className="px-2 text-right">D85</th>
                <th className="px-2 text-right">Grader</th>
                <th className="px-2 text-right">Plant</th>
                <th className="px-2 text-right">Leader</th>
                <th className="px-2 text-right">PJO</th>
              </tr>
            </thead>
            <tbody>
              {TOP5.map((b) => (
                <tr key={b.p} className="border-b border-slate-50 last:border-0">
                  <td className="py-1.5 pr-2 font-black text-[#0b2a5b]">{lam(b.p)}</td>
                  <td className="px-2 text-right font-black">{b.pk} <span className="text-slate-400">({Math.round((100 * b.pk) / HC)}%)</span></td>
                  <td className="px-2 text-right text-slate-500">{f1(b.rata)}</td>
                  {KAT.map((k) => {
                    const d = MAP_DEPT[b.p + '|' + k]
                    const v = d ? d.pct : 0
                    const tone = v >= 50 ? 'text-red-600' : v >= 30 ? 'text-amber-600' : 'text-slate-500'
                    return <td key={k} className={`px-2 text-right font-black ${tone}`}>{f1(v)}%</td>
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2 rounded-xl bg-slate-50 p-2.5 text-[10px] leading-relaxed text-slate-600">
          <b className="text-[#0b2a5b]">Merah</b> = 50% atau lebih orang di departemen itu cuti di bulan tersebut · <b className="text-[#0b2a5b]">kuning</b> = 30–49%.
          <br />Siklus cuti tetap <b>104 hari</b> (90 kerja + 14 cuti), jadi tanggalnya berulang dan bertemu di bulan yang sama.
          Kalau digeser maksimal 10 hari, hari rawan turun dari <b>144</b> menjadi <b>11</b> tanpa mengurangi hak cuti.
        </div>
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. KALENDER
// ═══════════════════════════════════════════════════════════════════════════
function Kalender() {
  const [bln, setBln] = useState(BUL[0].p)
  const [kat, setKat] = useState('Semua departemen')

  const hasil = useMemo(() => {
    const y = +bln.slice(0, 4), m = +bln.slice(5) - 1
    const last = new Date(y, m + 1, 0).getDate()
    const per: Record<number, Orang[]> = {}
    orang.forEach((o) => {
      if (kat !== 'Semua departemen' && o.k !== kat) return
      o.cuti30.forEach((c) => {
        const a = dt(c.d)
        for (let i = 0; i < 14; i++) {
          const x = addD(a, i)
          if (x.getFullYear() === y && x.getMonth() === m) (per[x.getDate()] ||= []).push(o)
        }
      })
    })
    const totKat = kat === 'Semua departemen' ? HC : DEPT_HC[kat]
    let tot = 0, mx = 0, mxd = 0, hariAda = 0
    for (let d = 1; d <= last; d++) {
      const l = per[d] || []
      tot += l.length
      if (l.length) hariAda++
      if (l.length > mx) { mx = l.length; mxd = d }
    }
    return { y, m, last, per, totKat, tot, mx, mxd, hariAda, dow: (new Date(y, m, 1).getDay() + 6) % 7 }
  }, [bln, kat])

  const { y, m, last, per, totKat, tot, mx, mxd, hariAda, dow } = hasil
  const prevLast = new Date(y, m, 0).getDate()
  const sel: (number | null)[] = []
  for (let i = 0; i < dow; i++) sel.push(null)
  for (let d = 1; d <= last; d++) sel.push(d)
  while (sel.length % 7 !== 0) sel.push(null)

  return (
    <>
      <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-[13px] font-black text-[#0b2a5b]">Kalender — siapa cuti tanggal berapa</h3>
            <p className="mt-0.5 text-[10px] text-slate-500">
              {NMB[m + 1]} {y} · {kat === 'Semua departemen' ? 'semua departemen' : kat} ({totKat} orang)
            </p>
          </div>
          <div className="flex gap-1.5">
            <select value={bln} onChange={(e) => setBln(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-bold text-[#0b2a5b]">
              {BUL.map((b) => <option key={b.p} value={b.p}>{lam(b.p)}</option>)}
            </select>
            <select value={kat} onChange={(e) => setKat(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-bold text-[#0b2a5b]">
              {['Semua departemen', ...KAT].map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap gap-2 text-[9px] text-slate-500">
          <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm border border-emerald-100 bg-emerald-50 align-[-1px]" />1–3 orang</span>
          <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm border border-emerald-200 bg-emerald-100 align-[-1px]" />4 orang+</span>
          <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm border border-red-200 bg-red-50 align-[-1px]" />di atas 20%</span>
        </div>

        <div className="mt-2 grid grid-cols-7 gap-1">
          {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((d) => (
            <div key={d} className="text-center text-[8px] font-black uppercase tracking-wide text-slate-400">{d}</div>
          ))}
          {sel.map((d, i) => {
            if (d === null) {
              const idx = i
              const num = idx < dow ? prevLast - dow + 1 + idx : idx - (dow + last) + 1
              return <div key={'p' + i} className="min-h-[64px] rounded-lg border border-slate-50 bg-slate-50/40 p-1">
                <span className="text-[9px] font-bold text-slate-300">{num}</span>
              </div>
            }
            const l = per[d] || []
            const rasio = l.length / Math.max(totKat, 1)
            const cls = l.length === 0 ? 'bg-white border-slate-100'
              : rasio > 0.2 ? 'bg-red-50 border-red-200'
              : l.length >= 4 ? 'bg-emerald-100 border-emerald-200'
              : 'bg-emerald-50 border-emerald-100'
            return (
              <div key={d} className={`min-h-[64px] rounded-lg border p-1 ${cls}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-black ${l.length ? 'text-[#0b2a5b]' : 'text-slate-400'}`}>{d}</span>
                  {l.length > 0 && <span className="rounded bg-white px-1 text-[8px] font-black text-slate-500">{l.length}</span>}
                </div>
                <div className="mt-0.5 space-y-0.5">
                  {l.slice(0, 3).map((o, j) => (
                    <p key={j} className="truncate text-[8px] leading-tight text-slate-600">{o.nm}</p>
                  ))}
                  {l.length > 3 && <p className="text-[8px] font-black text-slate-400">+{l.length - 3}</p>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {[
          { l: 'Hari-orang cuti', v: tot, s: '', tone: 'text-[#003D79]' },
          { l: 'Rata-rata/hari', v: f1(tot / last), s: 'orang', tone: 'text-[#0b2a5b]' },
          { l: 'Tanggal terpadat', v: mxd, s: '', cap: `${mx} orang`, tone: 'text-red-600' },
          { l: 'Hari tanpa cuti', v: last - hariAda, s: 'hari', tone: 'text-emerald-600' },
        ].map((x) => (
          <div key={x.l} className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{x.l}</p>
            <p className={`mt-1 text-xl font-black leading-none ${x.tone}`}>{x.v} <span className="text-[10px] font-bold text-slate-400">{x.s}</span></p>
            {x.cap && <p className="mt-1 text-[10px] text-slate-500">{x.cap}</p>}
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-slate-50 p-2.5 text-[10px] text-slate-500">
        Persentase cuti per departemen ada di tab <b className="text-[#0b2a5b]">PER DEPARTEMEN</b> — sengaja tidak diulang di sini.
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. CUTI PER ORANG — tanggal ke-1 s.d. ke-30
// ═══════════════════════════════════════════════════════════════════════════
function PerOrang() {
  const [q, setQ] = useState('')
  const [kat, setKat] = useState('Semua departemen')
  const BATAS = '2029-10-31'

  const list = useMemo(() => {
    const s = q.toLowerCase()
    return orang
      .filter((o) => (kat === 'Semua departemen' || o.k === kat) && (!s || o.nm.toLowerCase().includes(s) || o.n.includes(s)))
      .sort((a, b) => (a.k === b.k ? a.nm.localeCompare(b.nm) : a.k.localeCompare(b.k)))
  }, [q, kat])

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-[13px] font-black text-[#0b2a5b]">Tanggal cuti ke-1 sampai ke-30</h3>
          <p className="mt-0.5 text-[10px] text-slate-500">
            {list.length} orang · hitam = sudah terjadi di roster · biru = rencana s.d. Okt 2029 · abu = setelahnya
          </p>
        </div>
        <div className="flex gap-1.5">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama / NRP…"
            className="w-36 rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] font-bold text-[#0b2a5b] placeholder:font-normal placeholder:text-slate-400" />
          <select value={kat} onChange={(e) => setKat(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-bold text-[#0b2a5b]">
            {['Semua departemen', ...KAT].map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
      </div>

      <div className="mt-2 overflow-auto rounded-xl border border-slate-100">
        <table className="border-collapse text-[9px]">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 bg-[#0b2a5b] px-2 py-1.5 text-left text-[8px] font-black uppercase text-white">Nama</th>
              {Array.from({ length: 30 }, (_, i) => (
                <th key={i} className="min-w-[54px] bg-[#0b2a5b] px-1 py-1.5 text-center text-[8px] font-black text-white/90">ke-{i + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((o) => (
              <tr key={o.n} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                <td className="sticky left-0 z-10 max-w-[150px] truncate bg-white px-2 py-1 font-black text-[#0b2a5b]">
                  {o.nm}
                  <span className="ml-1 text-[7px] font-bold text-slate-400">{o.n}</span>
                </td>
                {Array.from({ length: 30 }, (_, i) => {
                  const c = o.cuti30[i]
                  if (!c) return <td key={i} className="px-1 py-1 text-center text-slate-300">—</td>
                  const cls = c.t === 'a' ? 'text-[#0b2a5b] font-bold' : c.d <= BATAS ? 'text-blue-600 font-bold' : 'text-slate-400'
                  return (
                    <td key={i} className={`px-1 py-1 text-center ${cls}`}
                      title={c.t === 'a' ? 'sudah terjadi · 14 hari' : 'rencana · 14 hari'}>
                      {tglPendek(c.d)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-2 rounded-xl bg-slate-50 p-2.5 text-[10px] leading-relaxed text-slate-600">
        Tiap tanggal = <b>hari pertama</b> cuti roster 14 hari. Jarak antar tanggal mengikuti siklus:
        Operator & Team Plant <b>104 hari</b>, Leader <b>84 hari</b>, PJO & Deputy <b>70 hari</b>.
        Orang yang belum pernah cuti di roster tanggalnya masih perkiraan (tanggal masuk + siklus).
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. PER DEPARTEMEN
// ═══════════════════════════════════════════════════════════════════════════
function PerDepartemen() {
  const [bln, setBln] = useState(BUL[0].p)
  const [pilih, setPilih] = useState<string | null>(null)

  const y = +bln.slice(0, 4), m = +bln.slice(5) - 1
  const last = new Date(y, m + 1, 0).getDate()
  const d0 = new Date(y, m, 1), d1 = new Date(y, m, last)

  const arr = orang.filter((o) => {
    if (pilih && o.k !== pilih) return false
    return o.cuti30.some((c) => {
      const a = dt(c.d), b = addD(a, 13)
      return !(b < d0 || a > d1)
    })
  })

  const urut = [...KAT].map((k) => {
    const d = MAP_DEPT[bln + '|' + k]
    return { k, n: d ? d.n : 0, tot: DEPT_HC[k], pct: d ? d.pct : 0 }
  }).sort((a, b) => b.pct - a.pct)

  return (
    <>
      <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-[13px] font-black text-[#0b2a5b]">Persentase cuti per departemen</h3>
            <p className="mt-0.5 text-[10px] text-slate-500">Bulan {lam(bln)} · klik departemen untuk menyaring daftar nama</p>
          </div>
          <select value={bln} onChange={(e) => { setBln(e.target.value); setPilih(null) }}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-bold text-[#0b2a5b]">
            {BUL.map((b) => <option key={b.p} value={b.p}>{lam(b.p)}</option>)}
          </select>
        </div>

        <div className="mt-2 space-y-1.5">
          {urut.map((d) => {
            const tone = d.pct >= 50 ? 'bg-red-500' : d.pct >= 30 ? 'bg-amber-400' : 'bg-[#00c37a]'
            return (
              <button key={d.k} onClick={() => setPilih(pilih === d.k ? null : d.k)}
                className={`flex w-full items-center gap-2 rounded-lg p-1 text-left transition ${pilih === d.k ? 'bg-slate-50' : ''}`}>
                <span className="w-24 shrink-0 truncate text-[10px] font-bold text-slate-600">{d.k}</span>
                <div className="h-3 flex-1 overflow-hidden rounded bg-slate-100">
                  <div className={`h-full rounded ${tone}`} style={{ width: `${Math.min(d.pct, 100)}%` }} />
                </div>
                <span className="w-16 shrink-0 text-right text-[10px] font-black text-[#0b2a5b]">
                  {f1(d.pct)}% <span className="font-bold text-slate-400">{d.n}/{d.tot}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
        <h3 className="text-[13px] font-black text-[#0b2a5b]">
          Nama yang cuti · {NMB[m + 1]} {y} {pilih ? `· ${pilih}` : ''}
        </h3>
        <div className="mt-2 max-h-96 overflow-auto rounded-xl border border-slate-100">
          <table className="w-full text-[10px]">
            <thead className="sticky top-0 bg-slate-50">
              <tr className="text-left text-[8px] uppercase tracking-wider text-slate-400">
                <th className="px-2 py-1.5">Nama</th>
                <th className="px-2 py-1.5">Departemen</th>
                <th className="px-2 py-1.5">Tanggal cuti</th>
              </tr>
            </thead>
            <tbody>
              {arr.length === 0 && (
                <tr><td colSpan={3} className="py-6 text-center text-slate-400">Tidak ada yang cuti di bulan ini.</td></tr>
              )}
              {arr.map((o) => {
                const tg = o.cuti30
                  .filter((c) => { const a = dt(c.d), b = addD(a, 13); return !(b < d0 || a > d1) })
                  .map((c) => c.d).join(' · ')
                return (
                  <tr key={o.n} className="border-b border-slate-50 last:border-0">
                    <td className="px-2 py-1.5 font-black text-[#0b2a5b]">{o.nm}</td>
                    <td className="px-2 py-1.5 text-slate-500">{o.k}</td>
                    <td className="px-2 py-1.5 font-mono text-[9px] text-slate-600">{tg}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. OPERATOR vs UNIT
// ═══════════════════════════════════════════════════════════════════════════
function OperatorUnit() {
  const [bln, setBln] = useState(BUL[0].p)
  const [shift, setShift] = useState(2)

  const b = BUL.find((x) => x.p === bln)!

  const hasil = Object.entries(GRUP).map(([g, G]) => {
    const arr = HAR[G.kat] || []
    const butuh = G.unit * shift
    const off = Math.round(G.op * 0.065)
    let ok = 0, bad = 0, sum = 0, mx = 0
    for (let i = b.i0; i < b.i0 + b.hari; i++) {
      const c = arr[i] || 0
      sum += c
      if (c > mx) mx = c
      if (G.op - c - off >= butuh) ok++; else bad++
    }
    const pct = Math.round((100 * ok) / (ok + bad))
    return { g, ...G, butuh, off, ok, bad, mx, rata: sum / b.hari, tersedia: G.op - sum / b.hari - off, pct }
  })

  const d85 = hasil.find((x) => x.g.startsWith('D85'))

  return (
    <>
      <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-[13px] font-black text-[#0b2a5b]">Apakah operator cukup untuk semua unit?</h3>
            <p className="mt-0.5 text-[10px] text-slate-500">Kebutuhan = unit kontrak × jumlah shift</p>
          </div>
          <div className="flex gap-1.5">
            <select value={bln} onChange={(e) => setBln(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-bold text-[#0b2a5b]">
              {BUL.map((x) => <option key={x.p} value={x.p}>{lam(x.p)}</option>)}
            </select>
            <select value={shift} onChange={(e) => setShift(+e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-bold text-[#0b2a5b]">
              <option value={1}>1 shift</option>
              <option value={2}>2 shift</option>
              <option value={3}>3 shift</option>
            </select>
          </div>
        </div>

        <div className="mt-2 grid gap-2 lg:grid-cols-3">
          {hasil.map((x) => {
            const tone = x.pct === 100 ? 'emerald' : x.pct >= 70 ? 'amber' : 'red'
            const cls = tone === 'emerald' ? 'bg-emerald-50 text-emerald-700' : tone === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
            const bar = tone === 'emerald' ? 'bg-[#00c37a]' : tone === 'amber' ? 'bg-amber-400' : 'bg-red-500'
            return (
              <div key={x.g} className="rounded-xl border border-slate-100 p-2.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-black text-[#0b2a5b]">{x.g}</span>
                  <span className={`rounded px-1.5 py-0.5 text-[8px] font-black uppercase ${cls}`}>
                    {x.pct === 100 ? 'Cukup' : x.pct >= 70 ? 'Sebagian' : 'Kurang'}
                  </span>
                </div>
                <p className="mt-1.5 text-xl font-black leading-none text-[#0b2a5b]">
                  {x.ok} <span className="text-[10px] font-bold text-slate-400">dari {b.hari} hari cukup</span>
                </p>
                <div className="mt-1.5 h-2 overflow-hidden rounded bg-slate-100">
                  <div className={`h-full rounded ${bar}`} style={{ width: `${x.pct}%` }} />
                </div>
                <p className="mt-1 text-[9px] text-slate-500">
                  Tersedia rata-rata <b>{f1(x.tersedia)}</b> · butuh <b>{x.butuh}</b>/hari
                </p>
                <div className="mt-1.5 grid grid-cols-3 gap-1 border-t border-slate-50 pt-1.5 text-[9px] text-slate-400">
                  <div>Unit<b className="block text-[11px] text-[#0b2a5b]">{x.unit}</b></div>
                  <div>Operator<b className="block text-[11px] text-[#0b2a5b]">{x.op}</b></div>
                  <div>Cuti puncak<b className="block text-[11px] text-[#0b2a5b]">{x.mx}</b></div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-2 rounded-xl bg-slate-50 p-2.5 text-[10px] leading-relaxed text-slate-600">
          <b className="text-[#0b2a5b]">Paling perlu diperhatikan:</b> grup <b>D85 / D65</b> hanya {d85?.op} operator
          untuk {d85?.unit} unit. Dengan {shift} shift kebutuhan {d85?.butuh} orang/hari — kalau 3 orang cuti bersamaan,
          satu unit tidak jalan. Sebaiknya dibuat aturan: <b>tidak boleh lebih dari 1 orang D85 cuti bersamaan</b>.
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
        <h3 className="text-[13px] font-black text-[#0b2a5b]">Armada unit kontrak</h3>
        <div className="mt-2 flex flex-wrap gap-1">
          {UNIT.filter((u) => u.status.toLowerCase().startsWith('kontrak')).map((u) => (
            <span key={u.kode} className="rounded-lg border border-slate-100 bg-slate-50 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">
              {u.kode} <span className="text-slate-400">{u.tipe}</span>
            </span>
          ))}
        </div>
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. PERIODICAL CUTI — grid harian Mekanik / GL Produksi / GL Plant
// ═══════════════════════════════════════════════════════════════════════════
const GRUP6 = [
  { nama: 'Mekanik', arr: ['0081123', '2011225', '1530525', '1830925', '0430124', '1211024'] },
  { nama: 'GL Produksi', arr: ['1780825', '1570625', '1720825', '2440926', '2430926'] },
  { nama: 'GL Plant', arr: ['0420124', '1261124', '2220426', '1750825'] },
]

function Periodical() {
  const [grup, setGrup] = useState('Semua grup')
  const [bulanN, setBulanN] = useState(24)

  const { hari, bulan, rows } = useMemo(() => {
    const A0 = new Date('2026-11-01T00:00:00')
    const akhir = new Date(A0.getFullYear(), A0.getMonth() + bulanN, 0)
    const hari: Date[] = []
    const d = new Date(A0)
    while (d <= akhir) { hari.push(new Date(d)); d.setDate(d.getDate() + 1) }

    const bulan: { y: number; m: number; n: number }[] = []
    hari.forEach((x) => {
      const k = x.getFullYear() + '-' + x.getMonth()
      const last = bulan[bulan.length - 1]
      if (!last || `${last.y}-${last.m}` !== k) bulan.push({ y: x.getFullYear(), m: x.getMonth(), n: 1 })
      else last.n++
    })

    const rows = GRUP6.filter((g) => grup === 'Semua grup' || g.nama === grup).map((g) => {
      const isi = g.arr.map((nrp) => {
        const o = orang.find((x) => x.n === nrp)
        const set = new Set<string>()
        o?.cuti30.forEach((c) => {
          const a = dt(c.d)
          for (let i = 0; i < 14; i++) {
            const x = addD(a, i)
            if (x >= A0 && x <= akhir) set.add(`${x.getFullYear()}-${n2(x.getMonth() + 1)}-${n2(x.getDate())}`)
          }
        })
        const hariCuti = hari.map((x) => set.has(`${x.getFullYear()}-${n2(x.getMonth() + 1)}-${n2(x.getDate())}`))
        return { o, hariCuti, kali: hariCuti.filter((v, i) => v && (i === 0 || !hariCuti[i - 1])).length }
      })
      return { nama: g.nama, isi, jumlah: g.arr.length }
    })
    return { hari, bulan, rows }
  }, [grup, bulanN])

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-[13px] font-black text-[#0b2a5b]">Analisis Periodical Cuti</h3>
          <p className="mt-0.5 text-[10px] text-slate-500">Grid harian · CR = cuti roster 14 hari · Nama menempel di kiri saat digeser</p>
        </div>
        <div className="flex gap-1.5">
          <select value={grup} onChange={(e) => setGrup(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-bold text-[#0b2a5b]">
            {['Semua grup', ...GRUP6.map((g) => g.nama)].map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <select value={bulanN} onChange={(e) => setBulanN(+e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-bold text-[#0b2a5b]">
            <option value={12}>12 bulan</option>
            <option value={24}>24 bulan</option>
            <option value={38}>38 bulan</option>
          </select>
        </div>
      </div>

      {rows.map((r) => (
        <div key={r.nama} className="mt-3">
          <div className="flex items-baseline justify-between">
            <h4 className="text-[11px] font-black text-[#0b2a5b]">{r.nama}</h4>
            <span className="text-[9px] font-bold text-slate-400">
              {r.jumlah} orang · {r.isi.reduce((a, b) => a + b.kali, 0)} kali cuti
            </span>
          </div>
          <div className="mt-1 overflow-auto rounded-lg border border-slate-100" style={{ maxHeight: 300 }}>
            <table className="border-collapse text-[8px]">
              <thead>
                <tr>
                  <th className="sticky left-0 z-20 min-w-[120px] bg-[#0b2a5b] px-1.5 py-1 text-left text-[8px] font-black text-white">Nama</th>
                  <th className="bg-[#0b2a5b] px-1 py-1 text-[8px] font-black text-white/90">MK</th>
                  <th className="bg-[#0b2a5b] px-1 py-1 text-[8px] font-black text-white/90">MC</th>
                  {bulan.map((b, i) => (
                    <th key={i} colSpan={b.n} className="border-l border-slate-600 bg-[#123a73] px-1 py-0.5 text-[8px] font-black text-white">
                      {NMB[b.m + 1]} <span className="text-white/50">{b.y}</span>
                    </th>
                  ))}
                </tr>
                <tr>
                  <th className="sticky left-0 z-20 bg-[#0b2a5b]" />
                  <th className="bg-[#0b2a5b]" />
                  <th className="bg-[#0b2a5b]" />
                  {hari.map((x, i) => (
                    <th key={i} className={`min-w-[13px] px-0 py-0.5 text-[7px] font-bold ${x.getDay() === 0 ? 'bg-slate-500 text-white' : 'bg-[#1e477f] text-white/80'}`}>
                      {x.getDate()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {r.isi.map(({ o, hariCuti }, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0">
                    <td className="sticky left-0 z-10 max-w-[120px] truncate bg-white px-1.5 py-0.5 font-black text-[#0b2a5b]">{o?.nm}</td>
                    <td className="bg-slate-50 px-1 text-center font-bold text-slate-500">{o?.mk ?? '—'}</td>
                    <td className="bg-slate-50 px-1 text-center font-bold text-slate-500">14</td>
                    {hariCuti.map((v, j) => (
                      <td key={j} className={`px-0 py-0.5 text-center ${v ? 'bg-red-50 font-black text-red-600' : hari[j].getDay() === 0 ? 'bg-slate-100' : ''}`}>
                        {v ? 'CR' : ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <div className="mt-2 rounded-xl bg-slate-50 p-2.5 text-[10px] leading-relaxed text-slate-600">
        <b className="text-[#0b2a5b]">Masa Kerja (MK)</b> = bulan, dihitung sampai 1 November 2026 dari tanggal masuk (Database &amp; ATR).
        <b className="text-[#0b2a5b]"> Masa Cuti (MC)</b> = 14 hari setiap kali cuti roster.
        Sanim dan Slamet Prayetno belum punya tanggal masuk, jadi MK bertanda “—”.
      </div>
    </div>
  )
}
