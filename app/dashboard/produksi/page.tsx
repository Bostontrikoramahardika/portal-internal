'use client'

// ═══════════════════════════════════════════════════════════════
// 📈 LAPORAN PRODUKSI — tampilan meniru sheet Excel "Laporan Produksi":
//   banner biru + tanggal rentang
//   → donut achievement + blok TARGET
//   → HM PER SHIFT
//   → Pencapaian HM per Hari (bar vertikal, garis putus target)
//   → Persentase (%) ATR Unit per Hari
//   → SUM / AVG / PA / MA per EGI
//   → tabel unit: HM S1 · HM S2 · Total · PA% · MA% · UA% (sel hijau/merah)
// Tab Import: upload .xlsx (hanya sheet TS Opt yang dibaca) atau tempel.
// ═══════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useState } from 'react'
import { StdPage, EmptyState } from '@/app/components/std'
import TampilanFix from './TampilanFix'

function hdr() {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  try {
    const t = localStorage.getItem('btm_session_token_v1')
    if (t) h['Authorization'] = 'Bearer ' + t
  } catch {}
  return h
}

const fmt = (n: number | null | undefined) =>
  n == null ? '-' : Number(n).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmt1 = (n: number | null | undefined) =>
  n == null ? '-' : Number(n).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const fmtP = (n: number | null | undefined) => (n == null ? '-' : `${fmt(n)}%`)

const NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
function labelBulan(b: string) {
  const [th, bl] = b.split('-')
  return `${NAMA_BULAN[Number(bl) - 1] || bl} ${th}`
}

export default function ProduksiPage() {
  const [bolehImport, setBolehImport] = useState(false)
  const [tab, setTab] = useState<'laporan' | 'import'>('laporan')

  useEffect(() => {
    fetch('/api/produksi/import', { credentials: 'include', headers: hdr() })
      .then((r) => r.json())
      .then((d) => setBolehImport(Boolean(d?.boleh_import)))
      .catch(() => {})
  }, [])

  return (
    <StdPage width="full">
      {bolehImport && (
        <div className="mb-3 flex gap-2">
          {([['laporan', '📈 Laporan + Monitoring'], ['import', '📥 Import Harian']] as const).map(([id, l]) => (
            <button key={id} onClick={() => setTab(id)}
              className={'flex-1 py-2 rounded-xl text-[11px] font-extrabold uppercase tracking-wide transition-all ' +
                (tab === id ? 'bg-[#003D79] text-white shadow' : 'bg-white text-slate-400 border border-slate-100')}>
              {l}
            </button>
          ))}
        </div>
      )}
      {tab === 'laporan'
        ? <DashboardLaporan gotoImport={() => setTab('import')} bolehImport={bolehImport} />
        : bolehImport && <ImportHarian />}
    </StdPage>
  )
}

/* ─────────── komponen kecil ─────────── */

function BarisExcel({ label, nilai, sorot }: { label: string; nilai: string; sorot?: boolean }) {
  return (
    <div className={'flex items-baseline justify-between gap-2 py-[3px] ' +
      (sorot ? 'bg-[#003D79] -mx-2 px-2 rounded' : '')}>
      <span className={'text-[10px] font-bold whitespace-nowrap ' + (sorot ? 'text-white' : 'text-slate-500')}>{label}</span>
      <span className={'text-right text-[11px] font-black ' + (sorot ? 'text-white' : 'text-[#0b2a5b]')}>{nilai}</span>
    </div>
  )
}

function KartuSeksi({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-2">
      <div className="rounded-lg bg-gradient-to-r from-[#003D79] to-[#0a5bd3] text-white text-center text-[9px] font-black uppercase tracking-wider py-1 mb-1">
        {judul}
      </div>
      {children}
    </div>
  )
}

function Donut({ pct, total }: { pct: number; total: number }) {
  const r = 42
  const c = 2 * Math.PI * r
  const v = Math.min(pct, 100)
  return (
    <div className="relative w-24 h-24 mx-auto">
      <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#e2e8f0" strokeWidth="12" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="#003D79" strokeWidth="12"
          strokeDasharray={`${(v / 100) * c} ${c}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-sm font-black text-[#0b2a5b]">{fmt1(total)}</div>
        <div className="text-[8px] font-bold uppercase text-slate-400">Jam</div>
      </div>
    </div>
  )
}

/** sel tabel berwarna seperti Excel: hijau ok, merah kalau di bawah ambang */
function SelPct({ v, ambang = 100 }: { v: number | null; ambang?: number | null }) {
  if (v == null) return <td className="px-1.5 py-0.5 text-center text-slate-300">-</td>
  const cek = ambang != null
  const ok = !cek || v >= ambang
  return (
    <td className="px-1 py-0.5 text-center">
      <span className={'inline-block min-w-[44px] rounded px-1 py-0.5 text-[10px] font-black ' +
        (!cek ? 'bg-slate-100 text-slate-700' : ok ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white')}>
        {fmt(v)}%
      </span>
    </td>
  )
}

function IkonCuaca({ jenis }: { jenis: string }) {
  const sinar = (cx: number, cy: number) =>
    [0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
      <line key={a}
        x1={cx + 12 * Math.cos((a * Math.PI) / 180)} y1={cy + 12 * Math.sin((a * Math.PI) / 180)}
        x2={cx + 16 * Math.cos((a * Math.PI) / 180)} y2={cy + 16 * Math.sin((a * Math.PI) / 180)}
        stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />
    ))
  if (jenis === 'hujan') return (
    <svg viewBox="0 0 48 48" className="w-9 h-9 mx-auto">
      <ellipse cx="24" cy="16" rx="13" ry="8" fill="#94a3b8" />
      <ellipse cx="15" cy="19" rx="8" ry="6" fill="#94a3b8" />
      <ellipse cx="33" cy="19" rx="8" ry="6" fill="#94a3b8" />
      {[16, 24, 32].map((x) => (
        <line key={x} x1={x} y1={28} x2={x - 3} y2={38} stroke="#0ea5e9" strokeWidth="3" strokeLinecap="round" />
      ))}
    </svg>
  )
  if (jenis === 'berawan') return (
    <svg viewBox="0 0 48 48" className="w-9 h-9 mx-auto">
      <circle cx="17" cy="15" r="8" fill="#fbbf24" />
      {sinar(17, 15)}
      <ellipse cx="28" cy="27" rx="13" ry="8" fill="#e2e8f0" stroke="#94a3b8" />
    </svg>
  )
  return (
    <svg viewBox="0 0 48 48" className="w-9 h-9 mx-auto">
      <circle cx="24" cy="24" r="10" fill="#fbbf24" />
      {sinar(24, 24)}
    </svg>
  )
}
const LABEL_CUACA: Record<string, string> = { cerah: 'Cerah', berawan: 'Berawan', hujan: 'Hujan' }
function fmtTglPanjang(iso: string) {
  return `${String(Number(iso.slice(8, 10))).padStart(2, '0')} ${labelBulan(iso.slice(0, 7))}`
}

/* ═══════════════ TAB 1 — DASHBOARD ═══════════════ */

function DashboardLaporan({ gotoImport, bolehImport }: { gotoImport: () => void; bolehImport: boolean }) {
  const [bulan, setBulan] = useState(() => new Date().toISOString().slice(0, 7))
  const [site, setSite] = useState('PPA-MLP')
  const [d, setD] = useState<any>(null)
  const [memuat, setMemuat] = useState(false)
  const [err, setErr] = useState('')
  const [cwTgl, setCwTgl] = useState('')
  const [cwS1, setCwS1] = useState('cerah')
  const [cwS2, setCwS2] = useState('cerah')
  const [muatCw, setMuatCw] = useState(false)

  const muat = useCallback(async () => {
    setMemuat(true); setErr('')
    try {
      const r = await fetch(`/api/produksi/dashboard?bulan=${bulan}&site=${site}`,
        { credentials: 'include', headers: hdr() })
      const j = await r.json()
      if (!r.ok) throw new Error(j?.error || 'Gagal memuat')
      setD(j)
    } catch (e: any) { setErr(e?.message || 'Gagal memuat') }
    setMemuat(false)
  }, [bulan, site])

  useEffect(() => { muat() }, [muat])

  useEffect(() => {
    if (d?.cuaca) { setCwTgl(d.cuaca.tanggal); setCwS1(d.cuaca.cuaca_s1); setCwS2(d.cuaca.cuaca_s2) }
    else if (d?.tgl_terakhir && !cwTgl) setCwTgl(d.tgl_terakhir)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d])

  async function simpanCuaca() {
    if (!cwTgl) return
    setMuatCw(true)
    try {
      const r = await fetch('/api/produksi/cuaca', {
        method: 'POST', credentials: 'include', headers: hdr(),
        body: JSON.stringify({ site, tanggal: cwTgl, s1: cwS1, s2: cwS2 }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j?.error || 'Gagal simpan cuaca')
      await muat()
    } catch (e: any) { setErr(e?.message || 'Gagal simpan cuaca') }
    setMuatCw(false)
  }

  // ── kerangka laporan selalu tampil (nol bila belum ada data) ──
  const D: any = d || {
    baris_data: 0, total_hm: 0, hm_ds: 0, hm_ns: 0, achievement_pct: 0,
    target: null, estimasi: 0, per_hari_target: 0, target_harian: 0, tgl_terakhir: null,
    per_hari: [], per_hari_atr: [], per_egi: [], per_unit: [], boleh_kelola: false, cuaca: null,
    operator: [], minggu: [], top_egi: {}, low_egi: {}, cek: [], avg_egi: {}, hari_bulan: 31, hari_terisi: 0,
  }
  const hariHM = (D.per_hari || []).length ? D.per_hari : Array(31).fill(0)
  const hariATR = (D.per_hari_atr || []).length ? D.per_hari_atr : Array(31).fill(null)

  const maxHari = useMemo(() => Math.max(1, ...hariHM, Number(D.per_hari_target || 0)), [hariHM, D])
  const pctDS = D.total_hm ? Math.round((D.hm_ds / D.total_hm) * 100) : 0
  const tglAkhir = D.tgl_terakhir ? Number(String(D.tgl_terakhir).slice(8, 10)) : null

  return (
    <div className="space-y-2">
      <div className="bg-white rounded-xl border border-slate-200 p-2 grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Bulan</label>
          <input type="month" value={bulan} onChange={(e) => setBulan(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold" />
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Nama Site</label>
          <input value={site} onChange={(e) => setSite(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold" />
        </div>
      </div>

      {err && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[10px] font-bold text-amber-800">
          ⚠ {err} — laporan tetap ditampilkan dengan angka nol.
        </div>
      )}

      {!D.baris_data && bolehImport && (
        <button onClick={gotoImport}
          className="w-full py-2 rounded-xl bg-[#003D79] text-white font-black text-[10px] uppercase tracking-wider">
          📥 Belum ada data {labelBulan(bulan)} — Buka Import Harian
        </button>
      )}

      <div className="flex justify-end">
        <button onClick={muat} disabled={memuat}
          className="text-[9px] font-black uppercase text-[#003D79] underline disabled:opacity-50">
          {memuat ? 'memuat…' : 'refresh'}
        </button>
      </div>

      <TampilanFix d={D} bulan={bulan} />

      {D.boleh_kelola && (
        <FormTarget site={site} bulan={bulan} target={D.target} units={D.armada || D.per_unit} fcTarget={D.fc_target} onSaved={muat} />
      )}
    </div>
  )
}

function Field({ label, children, span2 }: { label: string; children: any; span2?: boolean }) {
  return (
    <div className={span2 ? 'col-span-2' : ''}>
      <label className="block text-[10px] font-bold text-slate-400 mb-1">{label}</label>
      {children}
    </div>
  )
}
const inp = 'w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold bg-white'
function KartuSet({ judul, desc, children }: { judul: string; desc: string; children: any }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-3 pt-3 pb-1">
        <div className="text-[12px] font-black text-[#1a3d62]">{judul}</div>
        <div className="text-[10px] text-slate-400 mt-0.5">{desc}</div>
      </div>
      <div className="grid grid-cols-2 gap-2 p-3 pt-2">{children}</div>
    </div>
  )
}

const EGI_FC = ['PC200SPR', 'PC200RB', 'D65', 'D85', 'GD705']

function FormTarget({ site, bulan, target, units, fcTarget, onSaved }: { site: string; bulan: string; target: any; units?: any[]; fcTarget?: Record<string, any>; onSaved: () => void }) {
  const [th, bl] = bulan.split('-').map(Number)
  const hariBulan = (th && bl) ? new Date(th, bl, 0).getDate() : 31
  const [tj, setTj] = useState('')
  const [fk, setFk] = useState('88')
  const [pa, setPa] = useState('90')
  const [ma, setMa] = useState('92')
  const [ua, setUa] = useState('')
  const [tarifMap, setTarifMap] = useState<Record<string, string>>({})
  const [fcMap, setFcMap] = useState<Record<string, string>>({})
  const [bdCount, setBdCount] = useState('2')
  const [bdLingkup, setBdLingkup] = useState('unit-shift')
  const [bdPeriode, setBdPeriode] = useState('periode')
  const [simpan, setSimpan] = useState(false)
  const [pesan, setPesan] = useState('')
  const harian = Number(tj) > 0 ? Number(tj) / hariBulan : 0

  useEffect(() => {
    setTj(target ? String(target.target_jam || '') : '')
    setFk(target ? String(target.faktor ?? 88) : '88')
    setPa(target?.pa_target != null ? String(target.pa_target) : '90')
    setMa(target?.ma_target != null ? String(target.ma_target) : '92')
  }, [target, site, bulan])

  useEffect(() => {
    const m: Record<string, string> = {}
    for (const u of (units || [])) {
      m[u.kode] = u.tarif_hm != null && u.tarif_hm !== '' ? String(u.tarif_hm) : ''
    }
    setTarifMap(m)
  }, [units])

  useEffect(() => {
    const m: Record<string, string> = {}
    for (const e of EGI_FC) {
      const v = fcTarget?.[e]
      m[e] = v != null && v !== '' ? String(v) : ''
    }
    setFcMap(m)
  }, [fcTarget])

  async function kirim() {
    setSimpan(true); setPesan('')
    try {
      const r = await fetch('/api/produksi/dashboard', {
        method: 'POST', credentials: 'include', headers: hdr(),
        body: JSON.stringify({
          site, bulan, target_jam: Number(tj), faktor: Number(fk),
          pa_target: Number(pa), ma_target: Number(ma),
          tarifs: Object.entries(tarifMap).map(([kode_unit, tarif_hm]) => ({ kode_unit, tarif_hm })),
          fc_targets: Object.entries(fcMap).map(([egi, fc_target]) => ({ egi, fc_target })),
        }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j?.error || 'Gagal')
      setPesan(j?.peringatan ? '⚠️ ' + j.peringatan : '✅ Target HM, PA, MA tersimpan')
      onSaved()
    } catch (e: any) { setPesan('❌ ' + (e?.message || 'Gagal')) }
    setSimpan(false)
  }

  return (
    <div className="space-y-2">
      <KartuSet judul="A. Target HM" desc="Satu target per bulan. Harian otomatis = bulan ÷ hari kalender.">
        <Field label="Bulan terpilih"><input readOnly value={labelBulan(bulan)} className={inp + ' bg-slate-50'} /></Field>
        <Field label="Hari kalender"><input readOnly value={String(hariBulan)} className={inp + ' bg-slate-50'} /></Field>
        <Field label="Target HM bulanan">
          <input type="number" min={0} value={tj} onChange={(e) => setTj(e.target.value)} placeholder="cth: 11000" className={inp} />
        </Field>
        <Field label="Target HM harian (otomatis)">
          <input readOnly value={harian ? harian.toLocaleString('id-ID', { maximumFractionDigits: 1 }) : '—'} className={inp + ' bg-slate-50'} />
        </Field>
        <Field label="Faktor Excel tersisa (%)">
          <input type="number" min={0} max={100} value={fk} onChange={(e) => setFk(e.target.value)} className={inp} />
        </Field>
      </KartuSet>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-3 pt-3 pb-1">
          <div className="text-[12px] font-black text-[#1a3d62]">B. Tarif per unit (Rp / HM)</div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Tiap unit beda. Bukan tarif global. Revenue = HM unit × tarif unit itu.
          </div>
        </div>
        <div className="overflow-x-auto max-h-72">
          <table className="w-full text-[10px]">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th className="px-2 py-2 text-left">Unit</th>
                <th className="px-2 py-2 text-left">Jenis</th>
                <th className="px-2 py-2 text-left">EGI</th>
                <th className="px-2 py-2 text-right">Tarif Rp / HM</th>
              </tr>
            </thead>
            <tbody>
              {(units || []).map((u: any) => (
                <tr key={u.kode} className="border-t border-slate-100">
                  <td className="px-2 py-1.5 font-black text-[#155b9c]">{u.kode}</td>
                  <td className="px-2 py-1.5">{u.jenis}</td>
                  <td className="px-2 py-1.5">{u.egi}</td>
                  <td className="px-2 py-1">
                    <input type="number" min={0} step={1000}
                      value={tarifMap[u.kode] ?? ''}
                      onChange={(e) => setTarifMap((p) => ({ ...p, [u.kode]: e.target.value }))}
                      placeholder="kosong = belum"
                      className="w-full px-2 py-1 rounded-lg border border-slate-200 text-right font-bold" />
                  </td>
                </tr>
              ))}
              {!(units || []).length && (
                <tr><td colSpan={4} className="px-2 py-3 text-center text-slate-400">Belum ada unit di TS Opt / config bulan ini.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <KartuSet judul="C. Target PA, MA, UA" desc="Satu acuan untuk seluruh site. UA boleh kosong.">
        <Field label="Acuan PA (%)">
          <input type="number" min={0} max={100} step={0.1} value={pa} onChange={(e) => setPa(e.target.value)} className={inp} />
        </Field>
        <Field label="Acuan MA (%)">
          <input type="number" min={0} max={100} step={0.1} value={ma} onChange={(e) => setMa(e.target.value)} className={inp} />
        </Field>
        <Field label="Acuan UA (%) · kosong = dipantau" span2>
          <input type="number" min={0} max={100} step={0.1} value={ua} onChange={(e) => setUa(e.target.value)} placeholder="Belum ditetapkan" className={inp} />
        </Field>
      </KartuSet>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-3 pt-3 pb-1">
          <div className="text-[12px] font-black text-[#1a3d62]">D. Target FC per EGI (L/HM)</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Batas liter per jam. Aktual = rate unit × HM ÷ HM. Di bawah target = lebih hemat.</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead className="bg-slate-50"><tr>
              <th className="px-2 py-2 text-left">EGI</th>
              <th className="px-2 py-2 text-right">Target FC (L/HM)</th>
            </tr></thead>
            <tbody>
              {EGI_FC.map((e) => (
                <tr key={e} className="border-t border-slate-100">
                  <td className="px-2 py-1.5 font-black">{e}</td>
                  <td className="px-2 py-1">
                    <input type="number" min={0} step={0.01} value={fcMap[e] ?? ''}
                      onChange={(ev) => setFcMap((p) => ({ ...p, [e]: ev.target.value }))}
                      placeholder="cth: 3.50"
                      className="w-full px-2 py-1 rounded-lg border border-slate-200 text-right font-bold" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <KartuSet judul="E. Aturan BD berulang" desc="Jam BD (durasi) tidak digabung ke HM BD.">
        <Field label={'Jumlah kejadian untuk "berulang"'}>
          <input type="number" min={1} value={bdCount} onChange={(e) => setBdCount(e.target.value)} className={inp} />
        </Field>
        <Field label="Lingkup hitung">
          <select value={bdLingkup} onChange={(e) => setBdLingkup(e.target.value)} className={inp}>
            <option value="unit-shift">Per unit + shift</option>
            <option value="unit">Per unit saja</option>
          </select>
        </Field>
        <Field label="Jangka waktu" span2>
          <select value={bdPeriode} onChange={(e) => setBdPeriode(e.target.value)} className={inp}>
            <option value="periode">Mengikuti periode laporan</option>
            <option value="7hari">7 hari berjalan</option>
            <option value="bulan">Satu bulan kalender</option>
          </select>
        </Field>
      </KartuSet>

      <KartuSet judul="F. Kategori HM" desc="HM Travel, HM BD, dan Jam BD tetap terpisah.">
        <label className="col-span-2 flex items-center gap-2 text-[11px] font-bold text-slate-600">
          <input type="checkbox" checked readOnly /> Tampilkan HM Travel terpisah
        </label>
        <label className="col-span-2 flex items-center gap-2 text-[11px] font-bold text-slate-600">
          <input type="checkbox" checked readOnly /> Tampilkan HM BD terpisah
        </label>
        <label className="col-span-2 flex items-center gap-2 text-[11px] font-bold text-slate-600">
          <input type="checkbox" checked readOnly /> Jam BD tidak digabung ke HM BD
        </label>
      </KartuSet>

      <button onClick={kirim} disabled={simpan || !tj}
        className="w-full py-2.5 rounded-xl bg-[#003D79] text-white font-black text-[11px] uppercase tracking-wider disabled:opacity-50">
        {simpan ? 'Menyimpan…' : 'Simpan Target HM · PA · MA · tarif unit · FC EGI'}
      </button>
      {pesan && <p className="text-[10px] font-bold text-center text-slate-500">{pesan}</p>}
      <p className="text-[9px] text-slate-400 text-center">
        Tombol simpan menulis Target HM, faktor, PA, MA ke database. Tarif / FC / BD tersimpan di isian ini untuk diisi — rumus pendapatan belum dipasang.
      </p>
    </div>
  )
}

/* ═══════════════ TAB 2 — IMPORT HARIAN ═══════════════ */

function ImportHarian() {
  const [sub, setSub] = useState<'upload' | 'atur'>('upload')
  const [site, setSite] = useState('PPA-MLP')
  const [text, setText] = useState('')
  const [namaFile, setNamaFile] = useState('')
  const [muat, setMuat] = useState(false)
  const [prev, setPrev] = useState<any>(null)
  const [hasil, setHasil] = useState<any>(null)
  const [err, setErr] = useState('')

  /** file dibaca DI BROWSER — hanya baris sheet TS Opt yang dikirim ke server */
  async function pilihFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setMuat(true); setErr('')
    try {
      const XLSX = await import('xlsx')
      const wb = XLSX.read(await f.arrayBuffer())
      const nama = wb.SheetNames.find((n: string) => /ts\s*opt/i.test(n)) || wb.SheetNames[0]
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[nama], { header: 1, raw: false, defval: '' }) as any[][]
      setText(rows.map((r) => r.join('\t')).join('\n'))
      setNamaFile(`${f.name} — hanya sheet "${nama}" (${rows.length} baris)`)
    } catch (e2: any) {
      setErr('Gagal membaca file: ' + (e2?.message || 'bukan .xlsx?'))
    }
    setMuat(false)
  }

  async function kirim(mode: 'preview' | 'commit') {
    setMuat(true); setErr('')
    try {
      const r = await fetch('/api/produksi/import', {
        method: 'POST', credentials: 'include', headers: hdr(),
        body: JSON.stringify({ mode, site, text }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j?.error || 'Gagal')
      if (mode === 'preview') setPrev(j)
      else { setHasil(j); setPrev(null); setText(''); setNamaFile('') }
    } catch (e: any) { setErr(e?.message || 'Gagal') }
    setMuat(false)
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {([['upload', '📥 Upload TS Opt'], ['atur', '🎯 Pengaturan']] as const).map(([id, l]) => (
          <button key={id} onClick={() => setSub(id)}
            className={'flex-1 py-2 rounded-xl text-[11px] font-extrabold uppercase tracking-wide ' +
              (sub === id ? 'bg-[#003D79] text-white' : 'bg-white text-slate-400 border border-slate-100')}>
            {l}
          </button>
        ))}
      </div>

      {sub === 'atur' && <PengaturanImport />}

      {sub === 'upload' && <>
      <div className="rounded-xl overflow-hidden shadow-md">
        <div className="bg-gradient-to-r from-[#0a5bd3] to-[#003D79] py-2 text-center text-white text-[12px] font-black uppercase tracking-wide">
          Import Harian — Sheet TS Opt
        </div>
        <div className="bg-blue-100/70 py-1 text-center text-[9px] font-bold text-[#0b2a5b]">
          file dibaca di perangkat Anda · hanya baris TS Opt yang dikirim · baris lama diperbarui, tidak dihapus
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-2 space-y-2.5">
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Site</label>
          <input value={site} onChange={(e) => setSite(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold" />
        </div>

        <label className="block cursor-pointer">
          <input type="file" accept=".xlsx,.xls" className="hidden" onChange={pilihFile} />
          <div className="rounded-xl border-2 border-dashed border-slate-200 hover:border-[#003D79] py-4 text-center transition-all">
            <div className="text-2xl">📂</div>
            <div className="mt-1 text-[10px] font-black uppercase tracking-wider text-[#003D79]">
              Pilih File Excel (.xlsx)
            </div>
            <div className="text-[9px] text-slate-400 mt-0.5">sheet TS Opt diambil otomatis — sheet lain diabaikan</div>
          </div>
        </label>
        {namaFile && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-[10px] font-bold text-emerald-700">
            ✅ {namaFile}
          </div>
        )}

        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
            Atau tempel baris dari Excel
          </label>
          <textarea rows={6} value={text} onChange={(e) => setText(e.target.value)}
            placeholder={'Blok baris di Excel → Ctrl+C → Ctrl+V di sini'}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-[11px] font-mono" />
        </div>

        <button onClick={() => kirim('preview')} disabled={muat || !text.trim()}
          className="w-full py-2 rounded-xl bg-[#003D79] text-white font-black text-[11px] uppercase tracking-wider disabled:opacity-50">
          {muat ? 'Memproses…' : '🔍 Pratinjau Dulu'}
        </button>
        <p className="text-[9px] text-slate-400">
          Kirim ulang baris yang sama = memperbarui (koreksi), bukan menumpuk — tabel tidak menjadi berat.
        </p>
      </div>

      {err && <EmptyState variant="error" text={err} />}

      {prev && (
        <div className="bg-white rounded-xl border border-slate-200 p-2 space-y-2.5">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
            Hasil Pratinjau — belum tersimpan
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[['Baris Baru', prev.baru, 'text-emerald-600'],
              ['Diperbarui', prev.timpa, 'text-amber-600'],
              ['Total', prev.total, 'text-[#0b2a5b]']].map(([l, v, w]) => (
              <div key={String(l)} className="rounded-xl bg-slate-50 border border-slate-100 p-2 text-center">
                <div className="text-[9px] font-bold uppercase text-slate-400">{l}</div>
                <div className={'text-lg font-black ' + w}>{Number(v)}</div>
              </div>
            ))}
          </div>

          {prev.peringatan?.length > 0 && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-2.5 space-y-1">
              <div className="text-[9px] font-black uppercase tracking-wider text-amber-700">
                ⚠️ Peringatan ({prev.peringatan.length})
              </div>
              {prev.peringatan.slice(0, 8).map((p: any, i: number) => (
                <div key={i} className="text-[10px] text-amber-800">• Baris {p.baris}: {p.pesan}</div>
              ))}
              {prev.peringatan.length > 8 && (
                <div className="text-[10px] text-amber-600">… dan {prev.peringatan.length - 8} lagi</div>
              )}
            </div>
          )}

          <button onClick={() => kirim('commit')} disabled={muat}
            className="w-full py-2 rounded-xl bg-emerald-600 text-white font-black text-[11px] uppercase tracking-wider disabled:opacity-50">
            {muat ? 'Menyimpan…' : `✅ Simpan ${prev.total} Baris`}
          </button>
        </div>
      )}

      {hasil && (
        <EmptyState variant="done" icon="Check"
          title={`${hasil.total} Baris Tersimpan`}
          text={`${hasil.baru} baru · ${hasil.timpa} diperbarui. Dashboard sudah ter-update.`} />
      )}
      </>}
    </div>
  )
}

function PengaturanImport() {
  const now = new Date()
  const [bulan, setBulan] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  const [site, setSite] = useState('PPA-MLP')
  const [target, setTarget] = useState<any>(null)
  const [units, setUnits] = useState<any[]>([])
  const [fcTarget, setFcTarget] = useState<any>({})
  const [boleh, setBoleh] = useState(false)
  const [err, setErr] = useState('')

  const muat = useCallback(() => {
    fetch(`/api/produksi/dashboard?bulan=${bulan}&site=${encodeURIComponent(site)}`,
      { credentials: 'include', headers: hdr() })
      .then((r) => r.json())
      .then((j) => {
        if (j?.error) setErr(j.error)
        else {
          setErr('')
          setTarget(j.target)
          setBoleh(Boolean(j.boleh_kelola))
          setUnits(j.armada || j.per_unit || [])
          setFcTarget(j.fc_target || {})
        }
      })
      .catch((e) => setErr(e?.message || 'Gagal'))
  }, [bulan, site])

  useEffect(() => { muat() }, [muat])

  return (
    <div className="space-y-2">
      <div className="bg-white rounded-xl border border-slate-200 p-2 grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Bulan</label>
          <input type="month" value={bulan} onChange={(e) => setBulan(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold" />
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Site</label>
          <input value={site} onChange={(e) => setSite(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold" />
        </div>
      </div>
      {err && <EmptyState variant="error" text={err} />}
      {boleh
        ? <FormTarget site={site} bulan={bulan} target={target} units={units} fcTarget={fcTarget} onSaved={muat} />
        : <p className="text-[10px] text-slate-400 text-center">Hanya HR/Admin yang bisa mengubah target.</p>}
    </div>
  )
}

function ringkasSite(d: any) {
  const paAcu = Number(d.target?.pa_target ?? 90)
  const maAcu = Number(d.target?.ma_target ?? 92)
  const targetHarian = Number(d.target_harian || 0)
  const hariTerisi = Number(d.hari_terisi || 0)
  const diharapkan = targetHarian * hariTerisi
  const lajuOk = diharapkan <= 0 || Number(d.total_hm) >= diharapkan * 0.95
  const units = d.per_unit || []
  let paW = 0, paH = 0, maW = 0, maH = 0, uaW = 0, uaH = 0
  for (const u of units) {
    if (u.pa != null) { paW += u.pa * u.mtd; paH += u.mtd }
    if (u.ma != null) { maW += u.ma * u.mtd; maH += u.mtd }
    if (u.ua != null) { uaW += u.ua * u.mtd; uaH += u.mtd }
  }
  return {
    paAcu, maAcu, targetHarian, hariTerisi, diharapkan, lajuOk,
    paSite: paH ? paW / paH : null,
    maSite: maH ? maW / maH : null,
    uaSite: uaH ? uaW / uaH : null,
  }
}

function KartuKpi({ judul, nilai, sub, ok }: { judul: string; nilai: string; sub: string; ok?: boolean | null }) {
  const warna = ok == null ? 'text-[#0b2a5b]' : ok ? 'text-emerald-700' : 'text-rose-600'
  return (
    <div className="rounded-xl bg-white border border-slate-200 p-2 min-w-0">
      <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">{judul}</div>
      <div className={'text-base font-black tabular-nums ' + warna}>{nilai}</div>
      <div className="text-[9px] text-slate-500 leading-tight">{sub}</div>
    </div>
  )
}

function KpiMonitoring({ d, bulan }: { d: any; bulan: string }) {
  const s = ringkasSite(d)
  return (
    <div className="space-y-1.5">
      <div className="rounded-xl bg-gradient-to-r from-[#003D79] to-[#0a5bd3] text-white text-center text-[10px] font-black uppercase tracking-wider py-1.5">
        Monitoring — TS Opt · {labelBulan(bulan)}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <KartuKpi judul="HM MTD" nilai={`${fmt1(d.total_hm)} jam`}
          sub={`laju vs kalender ${fmt1(s.diharapkan)}`} ok={s.lajuOk} />
        <KartuKpi judul="Target harian" nilai={`${fmt1(s.targetHarian)} jam`}
          sub={`bulan ${fmt1(d.target?.target_jam)} ÷ ${d.hari_bulan || '-'} hari`} />
        <KartuKpi judul="Standby" nilai={`${fmt1(d.total_stb)} jam`} sub="dari TS Opt" />
        <KartuKpi judul="PA site" nilai={fmtP(s.paSite)} sub={`acuan ${fmt1(s.paAcu)}%`}
          ok={s.paSite == null ? null : s.paSite >= s.paAcu} />
        <KartuKpi judul="MA site" nilai={fmtP(s.maSite)} sub={`acuan ${fmt1(s.maAcu)}%`}
          ok={s.maSite == null ? null : s.maSite >= s.maAcu} />
        <KartuKpi judul="UA site" nilai={fmtP(s.uaSite)} sub="dipantau — tanpa acuan" ok={null} />
      </div>
      <p className="text-[9px] text-slate-400 text-center">
        Revenue / tarif belum dipasang (harga unit belum diputuskan). Kode OFF/CR tidak dipakai — sel kosong = belum ada baris TS Opt.
      </p>
    </div>
  )
}

function MonitoringBlok({ d, bulan }: { d: any; bulan: string }) {
  const [filter, setFilter] = useState('Semua')
  const [klip, setKlip] = useState<any>(null)
  const [cekAll, setCekAll] = useState(false)
  const hariBulan = Number(d.hari_bulan || 31)
  const days = Array.from({ length: hariBulan }, (_, i) => i + 1)
  const ops = (d.operator || []).filter((o: any) => filter === 'Semua' || o.jenis === filter)
  const jenisList = ['Semua', 'Excavator', 'Bulldozer', 'Grader']
  const kunciOp = (o: any) => `${o?.nama}|${o?.unit}`

  function isiHari(o: any, day: number) {
    return (o.hari || []).filter((h: any) => Number(String(h.tgl).slice(8, 10)) === day)
  }

  const cekList = d.cek || []
  const cekTampil = cekAll ? cekList : cekList.slice(0, 6)

  return (
    <div className="space-y-2 pt-1">
      <KartuSeksi judul="Rekap per minggu (ISO)">
        {(d.minggu || []).length === 0 && <div className="text-[10px] text-slate-300">Belum ada data minggu.</div>}
        {(d.minggu || []).map((w: any) => (
          <div key={w.kunci} className="flex justify-between gap-2 py-0.5 text-[10px] border-b border-slate-50 last:border-0">
            <span className="font-bold text-slate-600">{w.label}</span>
            <span className="tabular-nums font-black text-[#0b2a5b]">
              HM {fmt1(w.hm)} · STB {fmt1(w.stb)} · PA {fmtP(w.pa)} · MA {fmtP(w.ma)}
            </span>
          </div>
        ))}
      </KartuSeksi>

      <div className="grid grid-cols-2 gap-1.5">
        {([['2 HM tertinggi per EGI', d.top_egi], ['2 HM terendah per EGI', d.low_egi]] as const).map(([judul, data]) => (
          <KartuSeksi key={judul} judul={judul}>
            {['Excavator', 'Bulldozer', 'Grader'].map((j) => (
              <div key={j} className="mb-1.5 last:mb-0">
                <div className="text-[9px] font-black uppercase text-slate-400">{j}</div>
                {!(data as any)?.[j]?.length && <div className="text-[10px] text-slate-300">— belum ada</div>}
                {((data as any)?.[j] || []).map((r: any, i: number) => (
                  <div key={j + i} className="flex justify-between gap-2 text-[10px]">
                    <span className="truncate font-bold">{i + 1}. {r.nama} · {r.unit}</span>
                    <span className="tabular-nums font-black text-[#0b2a5b] whitespace-nowrap">
                      {fmt1(r.hm)} <span className="font-bold text-slate-400">(avg {fmt1(r.avg)})</span>
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </KartuSeksi>
        ))}
      </div>

      <KartuSeksi judul={`Perlu dicek (${cekList.length})`}>
        {cekList.length === 0 && <div className="text-[10px] text-emerald-700 font-bold">Tidak ada item.</div>}
        {cekTampil.map((c: any, i: number) => (
          <div key={i} className="text-[10px] py-0.5 border-b border-slate-50 last:border-0">
            <span className="font-black text-amber-700">{c.tag}</span>
            <span className="text-slate-600"> — {c.teks}</span>
          </div>
        ))}
        {cekList.length > 6 && (
          <button onClick={() => setCekAll(!cekAll)}
            className="mt-1 text-[9px] font-black uppercase text-[#003D79] underline">
            {cekAll ? 'Tutup' : `Lihat semua (${cekList.length})`}
          </button>
        )}
      </KartuSeksi>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-[#003D79] to-[#0a5bd3] text-white text-center text-[10px] font-black uppercase tracking-wider py-1">
          Papan HM per operator — klik angka tanggal untuk klip HM awal/akhir
        </div>
        <div className="flex gap-1 p-1.5 flex-wrap items-center">
          {jenisList.map((j) => (
            <button key={j} onClick={() => { setFilter(j); setKlip(null) }}
              className={'px-2 py-1 rounded-lg text-[9px] font-black uppercase ' +
                (filter === j ? 'bg-[#003D79] text-white' : 'bg-slate-100 text-slate-500')}>
              {j}
            </button>
          ))}
          <span className="ml-auto text-[9px] font-bold text-slate-400">{ops.length} operator · urut HM</span>
        </div>
        <div className="overflow-x-auto max-h-[420px]">
          <table className="text-[9px] border-collapse">
            <thead className="bg-[#0a5bd3] text-white sticky top-0 z-20">
              <tr>
                <th className="px-1 py-1 sticky left-0 z-30 bg-[#0a5bd3]">#</th>
                <th className="px-1 py-1 text-left sticky left-6 z-30 bg-[#0a5bd3] min-w-[88px]">Nama</th>
                <th className="px-1 py-1 text-left min-w-[64px]">Unit</th>
                <th className="px-1 py-1 text-right min-w-[44px]">HM</th>
                <th className="px-1 py-1 text-right min-w-[52px]">vs avg</th>
                {days.map((day) => (
                  <th key={day} className="px-0.5 py-1 min-w-[28px] text-center font-black">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ops.map((o: any, i: number) => {
                const avg = Number(d.avg_egi?.[o.jenis] || 0)
                const delta = avg ? o.hm - avg : 0
                const aktif = klip && kunciOp(klip.op) === kunciOp(o)
                return (
                  <tr key={o.nama + o.unit + i} className={i % 2 ? 'bg-slate-50' : 'bg-white'}>
                    <td className={'px-1 py-0.5 sticky left-0 z-10 font-black ' + (i % 2 ? 'bg-slate-50' : 'bg-white')}>
                      {i + 1}
                    </td>
                    <td className={'px-1 py-0.5 sticky left-6 z-10 font-bold whitespace-nowrap ' + (i % 2 ? 'bg-slate-50' : 'bg-white')}>
                      {o.nama}
                    </td>
                    <td className="px-1 py-0.5 whitespace-nowrap">{o.unit}</td>
                    <td className="px-1 py-0.5 text-right tabular-nums font-black">{fmt1(o.hm)}</td>
                    <td className={'px-1 py-0.5 text-right tabular-nums ' + (delta < 0 ? 'text-rose-600' : 'text-emerald-700')}>
                      {avg ? (delta >= 0 ? '+' : '') + fmt1(delta) : '-'}
                    </td>
                    {days.map((day) => {
                      const items = isiHari(o, day)
                      const hm = items.reduce((sum: number, h: any) => sum + Number(h.hm || 0), 0)
                      const pilih = aktif && klip.day === day
                      if (!items.length) {
                        return <td key={day} className="px-0.5 py-0.5 text-center text-slate-200">·</td>
                      }
                      return (
                        <td key={day}
                          onClick={() => setKlip(pilih ? null : { op: o, day, items })}
                          className={'px-0.5 py-0.5 text-center tabular-nums font-bold cursor-pointer rounded ' +
                            (pilih ? 'bg-[#003D79] text-white' : hm > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-600')}>
                          {fmt1(hm)}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
              {ops.length === 0 && (
                <tr><td colSpan={5 + days.length} className="px-2 py-3 text-center text-slate-300">Belum ada operator</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {klip && (
          <div className="border-t border-slate-200 p-2 bg-slate-50">
            <div className="text-[10px] font-black text-[#0b2a5b] mb-1">
              Klip · {klip.op.nama} · {klip.op.unit} · tanggal {String(klip.day).padStart(2, '0')} {labelBulan(bulan)}
            </div>
            <div className="space-y-0.5">
              {klip.items.map((h: any, i: number) => (
                <div key={i} className="flex justify-between text-[10px] font-mono">
                  <span>Shift {h.shift}</span>
                  <span>awal {fmt1(h.awal)} → akhir {fmt1(h.akhir)} · HM {fmt1(h.hm)}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setKlip(null)} className="mt-1 text-[9px] font-black uppercase text-slate-400">Tutup klip</button>
          </div>
        )}
        <p className="px-2 py-1 text-[9px] text-slate-400">
          Geser tabel ke kanan untuk tanggal 1–{hariBulan}. Klik sel hijau = klip HM awal/akhir. Tidak ada kolom Charge. Sel titik = belum ada data TS Opt (bukan OFF/CR).
        </p>
      </div>
    </div>
  )
}
