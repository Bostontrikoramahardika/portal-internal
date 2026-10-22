'use client'

import { useEffect, useMemo, useState } from 'react'
import { MPP_GRUP, MPP_TOTAL } from './mpp-data'

type Baris = {
  grup: string
  jabatan: string
  mpp: number
  unit: number | null
  shift: number | null
  faktor: number | null
  rumus: 'manual' | 'unit_x_shift_x_faktor'
  live: number
}

const BLN = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
const now = new Date()
const THN_INI = now.getFullYear()

function pad(n: number) { return String(n).padStart(2, '0') }
function norm(s: any) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}
function kunciJabatan(j: string) {
  const n = norm(j)
  if (/excavator|excavat/.test(n)) return 'operator excavator'
  if (/bulldozer|dozer/.test(n)) return 'operator bulldozer'
  if (/grader/.test(n)) return 'operator grader'
  return n
}
function tgl(s: any) {
  if (!s) return ''
  const x = String(s)
  if (/^\d{4}-\d{2}-\d{2}/.test(x)) return x.slice(0, 10)
  const d = new Date(x)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
function aktifDiBulan(row: any, tahun: number, bulan: number) {
  const start = `${tahun}-${pad(bulan)}-01`
  const end = tgl(new Date(tahun, bulan, 0).toISOString())
  const masuk = tgl(row.tanggal_masuk)
  const resign = tgl(row.tanggal_resign)
  if (masuk && masuk > end) return false
  if (resign && resign < start) return false
  const st = String(row.status_karyawan || row.status || '').toLowerCase()
  if (st.includes('resign') && !resign) return false
  return true
}
function hitungMpp(b: Baris) {
  if (b.rumus === 'unit_x_shift_x_faktor') {
    return Math.round(Number(b.unit || 0) * Number(b.shift || 0) * Number(b.faktor || 0))
  }
  return Number(b.mpp) || 0
}
function pct(a: number, b: number) {
  if (!b) return 0
  return Math.round((a / b) * 1000) / 10
}
function bulanMaksTahun(tahun: number) {
  if (tahun < THN_INI) return 12
  if (tahun > THN_INI) return 0
  return now.getMonth() + 1
}

function GrafikGaris({
  data, onPilih,
}: {
  data: { m: number; mpp: number; acv: number }[]
  onPilih: (m: number) => void
}) {
  const W = 640, H = 210
  const L = 38, R = 10, T = 18, B = 28
  const n = data.length
  const max = Math.max(1, ...data.map(d => Math.max(d.mpp, d.acv))) * 1.2
  const x = (i: number) => (n <= 1 ? (L + W - R) / 2 : L + (i * (W - L - R)) / (n - 1))
  const y = (v: number) => T + (1 - v / max) * (H - T - B)
  const garis = (key: 'mpp' | 'acv') => data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(' ')
  const ticks = 4
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[210px]" role="img">
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const v = Math.round((max / ticks) * (ticks - i))
        const yy = y(v)
        return (
          <g key={i}>
            <line x1={L} x2={W - R} y1={yy} y2={yy} stroke="#e2e8f0" strokeWidth="1" />
            <text x={L - 6} y={yy + 3} textAnchor="end" fontSize="9" fill="#94a3b8">{v}</text>
          </g>
        )
      })}
      <path d={garis('mpp')} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="6 4" />
      <path d={garis('acv')} fill="none" stroke="#003D79" strokeWidth="2.5" />
      {data.map((d, i) => (
        <g key={d.m} onClick={() => onPilih(d.m)} className="cursor-pointer">
          <circle cx={x(i)} cy={y(d.mpp)} r="3.5" fill="#f59e0b" />
          <circle cx={x(i)} cy={y(d.acv)} r="3.5" fill="#003D79" />
          <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fontWeight="700" fill="#64748b">{BLN[d.m - 1]}</text>
        </g>
      ))}
    </svg>
  )
}

function Donat({ label, aktual, mpp, warna }: { label: string; aktual: number; mpp: number; warna: string }) {
  const p = mpp > 0 ? Math.min(1, aktual / mpp) : 0
  const r = 28
  const c = 2 * Math.PI * r
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-white border border-slate-200 px-2.5 py-2">
      <svg width="72" height="72" viewBox="0 0 72 72" className="shrink-0">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle cx="36" cy="36" r={r} fill="none" stroke={warna} strokeWidth="8"
          strokeLinecap="round" strokeDasharray={`${p * c} ${c - p * c}`}
          transform="rotate(-90 36 36)" />
        <text x="36" y="39" textAnchor="middle" fontSize="13" fontWeight="800" fill="#0b2a5b">{pct(aktual, mpp)}%</text>
      </svg>
      <div className="min-w-0">
        <p className="text-[11px] font-black text-[#003D79]">{label}</p>
        <p className="text-[11px] tabular-nums text-slate-600">{aktual} / {mpp} MPP</p>
        <p className={`text-[10px] font-black tabular-nums ${aktual < mpp ? 'text-rose-600' : 'text-emerald-600'}`}>
          dev {aktual - mpp > 0 ? '+' : ''}{aktual - mpp}
        </p>
      </div>
    </div>
  )
}

function defaultBaris(): Baris[] {
  return MPP_GRUP.flatMap(g => g.baris.filter(b => b.mpp > 0 || (b.unit || 0) > 0).map(b => ({
    grup: g.nama === 'Operator' ? 'Produksi' : g.nama,
    jabatan: b.jabatan,
    mpp: b.mpp,
    unit: b.unit ?? null,
    shift: b.shift ?? null,
    faktor: b.faktor ?? null,
    rumus: b.unit != null ? 'unit_x_shift_x_faktor' as const : 'manual' as const,
    live: 0,
  })))
}

export default function MppDashboard() {
  const [tahun, setTahun] = useState(THN_INI)
  const [bulan, setBulan] = useState(0)
  const [baris, setBaris] = useState<Baris[]>(defaultBaris)
  const [karyawan, setKaryawan] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pesan, setPesan] = useState('')
  const [planTahun, setPlanTahun] = useState<any[]>([])

  const token = () => (typeof window !== 'undefined' ? localStorage.getItem('btm_session_token_v1') || '' : '')
  const hdr = () => {
    const t = token()
    return t ? { Authorization: `Bearer ${t}` } : {}
  }

  useEffect(() => {
    let stop = false
    async function loadKar() {
      try {
        const res = await fetch('/api/data?menu=kelola_karyawan', { cache: 'no-store', credentials: 'include', headers: hdr() })
        const json = await res.json()
        if (!stop) setKaryawan(Array.isArray(json.rows) ? json.rows : [])
      } catch { /* biarkan kosong */ }
    }
    loadKar()
    return () => { stop = true }
  }, [])

  useEffect(() => {
    let stop = false
    async function loadPlan() {
      setLoading(true)
      try {
        const res = await fetch(`/api/hr/mpp?tahun=${tahun}`, { credentials: 'include', headers: hdr() })
        const json = await res.json()
        if (!stop) setPlanTahun(json.ok ? (json.rows || []) : [])
      } catch {
        if (!stop) setPlanTahun([])
      } finally {
        if (!stop) setLoading(false)
      }
    }
    loadPlan()
    return () => { stop = true }
  }, [tahun])

  useEffect(() => {
    if (!bulan) return
    const saved = planTahun.filter((r: any) => Number(r.bulan) === bulan)
    const dasar = defaultBaris()
    const gabung = dasar.map(d => {
      const s = saved.find((x: any) => kunciJabatan(x.jabatan) === kunciJabatan(d.jabatan))
      if (!s) return d
      return {
        ...d,
        mpp: Number(s.mpp) || 0,
        unit: s.unit == null ? d.unit : Number(s.unit),
        shift: s.shift == null ? d.shift : Number(s.shift),
        faktor: s.faktor == null ? d.faktor : Number(s.faktor),
        rumus: s.rumus === 'unit_x_shift_x_faktor' ? 'unit_x_shift_x_faktor' as const : 'manual' as const,
      }
    })
    setBaris(gabung)
  }, [bulan, planTahun])

  const barisLive = useMemo(() => {
    const bln = bulan || (now.getMonth() + 1)
    const hit: Record<string, number> = {}
    for (const r of karyawan) {
      if (!aktifDiBulan(r, tahun, bln)) continue
      const k = kunciJabatan(r.jabatan)
      hit[k] = (hit[k] || 0) + 1
    }
    return baris.map(b => ({ ...b, mpp: hitungMpp(b), live: hit[kunciJabatan(b.jabatan)] || 0 }))
  }, [baris, karyawan, tahun, bulan])

  const grupNama = ['Staff', 'Plant', 'Produksi'] as const
  const warna = { Staff: '#003D79', Plant: '#059669', Produksi: '#d97706' }
  const ringkas = grupNama.map(g => {
    const isi = barisLive.filter(b => b.grup === g)
    return {
      nama: g,
      mpp: isi.reduce((s, b) => s + b.mpp, 0),
      aktual: isi.reduce((s, b) => s + b.live, 0),
    }
  })
  const totMpp = ringkas.reduce((s, g) => s + g.mpp, 0) || MPP_TOTAL.mpp
  const totAkt = ringkas.reduce((s, g) => s + g.aktual, 0)
  const bulanMaks = bulanMaksTahun(tahun)

  useEffect(() => {
    if (bulan > bulanMaks) setBulan(0)
  }, [bulan, bulanMaks])

  const bulanChart = useMemo(() => {
    const mppDefault = defaultBaris().reduce((s, b) => s + hitungMpp(b), 0)
    const n = bulanMaksTahun(tahun)
    return Array.from({ length: n }, (_, i) => {
      const m = i + 1
      const saved = planTahun.filter((r: any) => Number(r.bulan) === m)
      const mpp = saved.length
        ? saved.reduce((s: number, r: any) => s + Number(r.mpp || 0), 0)
        : mppDefault
      let acv = 0
      for (const r of karyawan) {
        if (aktifDiBulan(r, tahun, m)) acv++
      }
      return { m, mpp, acv, p: pct(acv, mpp) }
    })
  }, [planTahun, karyawan, tahun])

  function setField(i: number, patch: Partial<Baris>) {
    setBaris(prev => prev.map((b, idx) => {
      if (idx !== i) return b
      const n = { ...b, ...patch }
      if (n.rumus === 'unit_x_shift_x_faktor') n.mpp = hitungMpp(n)
      return n
    }))
  }

  async function simpan() {
    if (!bulan) { setPesan('Pilih bulan dulu'); return }
    setSaving(true); setPesan('')
    try {
      const res = await fetch('/api/hr/mpp', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...hdr() },
        body: JSON.stringify({
          tahun, bulan, site: 'PPA-MLP',
          rows: barisLive.map(b => ({
            grup: b.grup, jabatan: b.jabatan, mpp: b.mpp,
            unit: b.unit, shift: b.shift, faktor: b.faktor, rumus: b.rumus,
          })),
        }),
      })
      const json = await res.json()
      if (!json.ok) {
        setPesan(json.need_sql
          ? 'Tabel mpp_plan belum ada. Jalankan scripts/mpp-plan.sql — perubahan ini hanya simulasi, belum disimpan.'
          : (json.error || 'Gagal simpan') + ' — hanya simulasi, belum disimpan.')
        return
      }
      setPesan(`Tersimpan ${json.saved} jabatan · ${BLN[bulan - 1]} ${tahun}`)
      const ulang = await fetch(`/api/hr/mpp?tahun=${tahun}`, { credentials: 'include', headers: hdr() })
      const j2 = await ulang.json()
      if (j2.ok) setPlanTahun(j2.rows || [])
    } catch {
      setPesan('Koneksi gagal — hanya simulasi, belum disimpan.')
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <select value={tahun} onChange={e => setTahun(Number(e.target.value))}
          className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[12px] font-black text-[#003D79]">
          {[THN_INI - 1, THN_INI, THN_INI + 1].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button type="button" onClick={() => setBulan(0)}
          className={`h-8 px-2.5 rounded-lg text-[11px] font-black ${bulan === 0 ? 'bg-[#003D79] text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
          Tahun
        </button>
        {BLN.slice(0, bulanMaks).map((n, i) => (
          <button key={n} type="button" onClick={() => setBulan(i + 1)}
            className={`h-8 min-w-[36px] px-1.5 rounded-lg text-[11px] font-black ${bulan === i + 1 ? 'bg-[#003D79] text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
            {n}
          </button>
        ))}
        {bulan > 0 && (
          <button type="button" onClick={simpan} disabled={saving}
            className="h-8 ml-auto px-3 rounded-lg bg-emerald-600 text-white text-[11px] font-black disabled:opacity-60">
            {saving ? 'Menyimpan…' : 'Simpan MPP'}
          </button>
        )}
      </div>

      {pesan && (
        <p className="text-[11px] rounded-lg px-2.5 py-1.5 bg-amber-50 text-amber-900 border border-amber-100">{pesan}</p>
      )}

      <div className="grid grid-cols-3 gap-2">
        {ringkas.map(g => (
          <Donat key={g.nama} label={g.nama} aktual={g.aktual} mpp={g.mpp} warna={warna[g.nama]} />
        ))}
      </div>

      <div className="rounded-xl bg-[#003D79] text-white px-3 py-2 flex flex-wrap gap-4 items-center text-[12px]">
        <span className="font-black">{bulan ? `${BLN[bulan - 1]} ${tahun}` : `Tahun ${tahun}`}</span>
        <span className="tabular-nums">Target MPP <b>{bulan === 0 && bulanChart.length ? bulanChart[bulanChart.length - 1].mpp : totMpp}</b></span>
        <span className="tabular-nums">ACV <b>{bulan === 0 && bulanChart.length ? bulanChart[bulanChart.length - 1].acv : totAkt}</b></span>
        <span className="tabular-nums">Tercapai <b>{pct(
          bulan === 0 && bulanChart.length ? bulanChart[bulanChart.length - 1].acv : totAkt,
          bulan === 0 && bulanChart.length ? bulanChart[bulanChart.length - 1].mpp : totMpp
        )}%</b></span>
        <span className="text-blue-200 text-[10px] ml-auto">Aktual = karyawan aktif di aplikasi. Rumus operator: Unit × Shift × Faktor</span>
      </div>

      {bulan === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-3 pt-2.5 pb-1 flex flex-wrap items-center gap-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target MPP vs ACV</p>
            <span className="text-[10px] font-bold text-amber-600">- - Target (MPP)</span>
            <span className="text-[10px] font-bold text-[#003D79]">— ACV (total all)</span>
            <span className="text-[10px] text-slate-400 ml-auto">Jan–{BLN[Math.max(0, bulanMaks - 1)]} {tahun}</span>
          </div>
          <GrafikGaris data={bulanChart} onPilih={setBulan} />
          <table className="w-full text-[11px] border-t border-slate-100">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-2 py-1.5 text-left font-black">Bulan</th>
                <th className="px-2 py-1.5 text-center font-black">Target MPP</th>
                <th className="px-2 py-1.5 text-center font-black">ACV</th>
                <th className="px-2 py-1.5 text-center font-black">%</th>
                <th className="px-2 py-1.5 text-center font-black">Dev</th>
              </tr>
            </thead>
            <tbody>
              {bulanChart.map(b => {
                const d = b.acv - b.mpp
                return (
                  <tr key={b.m} className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => setBulan(b.m)}>
                    <td className="px-2 py-1 font-bold text-slate-800">{BLN[b.m - 1]} {tahun}</td>
                    <td className="px-2 py-1 text-center tabular-nums font-black text-amber-700">{b.mpp}</td>
                    <td className="px-2 py-1 text-center tabular-nums font-black text-[#003D79]">{b.acv}</td>
                    <td className="px-2 py-1 text-center tabular-nums">{b.p}%</td>
                    <td className={`px-2 py-1 text-center font-black tabular-nums ${d < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{d > 0 ? `+${d}` : d}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {bulan > 0 && (
        <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-[#0b2a5b] text-white">
                <th className="px-2 py-1.5 text-left">Jabatan</th>
                <th className="px-1 py-1.5 text-center">Rumus</th>
                <th className="px-1 py-1.5 text-center">Unit</th>
                <th className="px-1 py-1.5 text-center">Shift</th>
                <th className="px-1 py-1.5 text-center">Faktor</th>
                <th className="px-1 py-1.5 text-center">MPP</th>
                <th className="px-1 py-1.5 text-center">Aktual</th>
                <th className="px-1 py-1.5 text-center">%</th>
                <th className="px-1 py-1.5 text-center">Dev</th>
              </tr>
            </thead>
            <tbody>
              {barisLive.map((b, i) => {
                const d = b.live - b.mpp
                const inp = 'w-12 mx-auto block text-center border border-slate-200 rounded px-0.5 py-0.5 tabular-nums'
                return (
                  <tr key={b.jabatan} className={i % 2 ? 'bg-slate-50' : 'bg-white'}>
                    <td className="px-2 py-1 font-bold text-slate-800">
                      {b.jabatan}
                      <span className="block text-[9px] font-medium text-slate-400">{b.grup}</span>
                    </td>
                    <td className="px-1 py-1">
                      <select value={b.rumus} onChange={e => setField(i, { rumus: e.target.value as Baris['rumus'] })}
                        className="text-[10px] border border-slate-200 rounded px-1 py-0.5 bg-white">
                        <option value="manual">Manual</option>
                        <option value="unit_x_shift_x_faktor">U×S×F</option>
                      </select>
                    </td>
                    <td className="px-1 py-1">
                      <input type="number" step="1" disabled={b.rumus !== 'unit_x_shift_x_faktor'} value={b.unit ?? ''}
                        onChange={e => setField(i, { unit: e.target.value === '' ? null : Number(e.target.value) })} className={inp} />
                    </td>
                    <td className="px-1 py-1">
                      <input type="number" step="1" disabled={b.rumus !== 'unit_x_shift_x_faktor'} value={b.shift ?? ''}
                        onChange={e => setField(i, { shift: e.target.value === '' ? null : Number(e.target.value) })} className={inp} />
                    </td>
                    <td className="px-1 py-1">
                      <input type="number" step="0.01" disabled={b.rumus !== 'unit_x_shift_x_faktor'} value={b.faktor ?? ''}
                        onChange={e => setField(i, { faktor: e.target.value === '' ? null : Number(e.target.value) })} className={inp} />
                    </td>
                    <td className="px-1 py-1">
                      {b.rumus === 'manual' ? (
                        <input type="number" step="1" value={b.mpp}
                          onChange={e => setField(i, { mpp: Number(e.target.value) })} className={inp + ' font-black'} />
                      ) : (
                        <span className="block text-center font-black tabular-nums">{b.mpp}</span>
                      )}
                    </td>
                    <td className="px-1 py-1 text-center font-black tabular-nums text-[#003D79]">{b.live}</td>
                    <td className="px-1 py-1 text-center tabular-nums">{pct(b.live, b.mpp)}%</td>
                    <td className={`px-1 py-1 text-center font-black tabular-nums ${d < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{d > 0 ? `+${d}` : d}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="px-2 py-1.5 text-[10px] text-slate-500 bg-slate-50">
            Rumus Produksi: MPP = Unit × Shift × Faktor (dibulatkan). Staff & Plant: isi MPP manual. {loading ? 'Memuat rencana…' : ''}
          </p>
        </div>
      )}
    </div>
  )
}
