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
          {([['laporan', '📈 Laporan Produksi'], ['import', '📥 Import Harian']] as const).map(([id, l]) => (
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
function SelPct({ v, ambang = 100 }: { v: number | null; ambang?: number }) {
  if (v == null) return <td className="px-1.5 py-0.5 text-center text-slate-300">-</td>
  const ok = v >= ambang
  return (
    <td className="px-1 py-0.5 text-center">
      <span className={'inline-block min-w-[44px] rounded px-1 py-0.5 text-[10px] font-black ' +
        (ok ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white')}>
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
    target: null, estimasi: 0, per_hari_target: 0, tgl_terakhir: null,
    per_hari: [], per_hari_atr: [], per_egi: [], per_unit: [], boleh_kelola: false, cuaca: null,
  }
  const hariHM = (D.per_hari || []).length ? D.per_hari : Array(31).fill(0)
  const hariATR = (D.per_hari_atr || []).length ? D.per_hari_atr : Array(31).fill(null)

  const maxHari = useMemo(() => Math.max(1, ...hariHM, Number(D.per_hari_target || 0)), [hariHM, D])
  const pctDS = D.total_hm ? Math.round((D.hm_ds / D.total_hm) * 100) : 0
  const tglAkhir = D.tgl_terakhir ? Number(String(D.tgl_terakhir).slice(8, 10)) : null

  return (
    <div className="space-y-2">
      {/* banner biru seperti Excel */}
      <div className="rounded-xl overflow-hidden shadow-md">
        <div className="bg-gradient-to-r from-[#0a5bd3] to-[#003D79] py-2 text-center">
          <div className="text-white text-[13px] font-black tracking-wide uppercase">
            Pencapaian HM Site {site}
          </div>
        </div>
        <div className="bg-blue-100/70 py-1 text-center text-[10px] font-bold text-[#0b2a5b]">
          {D.baris_data
            ? `Tanggal 01 – ${String(tglAkhir || 1).padStart(2, '0')} ${labelBulan(bulan)}`
            : labelBulan(bulan)}
          <button onClick={muat} disabled={memuat}
            className="ml-2 text-[9px] font-black uppercase text-[#003D79] underline disabled:opacity-50">
            {memuat ? 'memuat…' : 'refresh'}
          </button>
        </div>
      </div>

      {/* filter */}
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

      {(<>
      {/* ═══ 2 kolom persis Excel: kiri ringkasan · kanan grafik+tabel (di HP maupun desktop) ═══ */}
      <div className="grid gap-1.5 items-start" style={{ gridTemplateColumns: 'minmax(0,34%) minmax(0,1fr)' }}>
        <div className="space-y-1.5">
            <div className="bg-white rounded-xl border border-slate-200 p-2 text-center">
              <Donut pct={D.achievement_pct} total={D.total_hm} />
              <div className="mt-1 text-[9px] font-black uppercase tracking-wider text-slate-400">Achievement</div>
              <div className="text-lg font-black text-[#0a5bd3]">{fmtP(D.achievement_pct)}</div>
            </div>

              <div className="bg-white rounded-xl border border-slate-200 p-2">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1 mb-1">Target</div>
                <BarisExcel label="Total Target" nilai={`${fmt1(D.target?.target_jam)} Jam`} />
                <BarisExcel label={`Tersisa (${fmt(D.target?.faktor ?? 88)}%)`} nilai={`${fmt1(D.target?.tersisa)} Jam`} />
                <BarisExcel label="Per Hari" nilai={`${fmt1(D.per_hari_target)} Jam`} />
                <BarisExcel label={`Estimasi (${fmt(D.achievement_pct)}%)`} nilai={`${fmt1(D.estimasi)} Jam`} sorot />
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-2">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1 mb-1">HM per Shift</div>
                <BarisExcel label={`Shift I / DS (${pctDS}%)`} nilai={`${fmt1(D.hm_ds)} Jam`} />
                <BarisExcel label={`Shift II / NS (${100 - pctDS}%)`} nilai={`${fmt1(D.hm_ns)} Jam`} />
              </div>

            {/* EGI: sum / avg / pa / ma */}
              <KartuSeksi judul="Sum HM per EGI">
                {(D.per_egi || []).map((e: any) => (
                  <BarisExcel key={e.egi} label={e.egi} nilai={`${fmt(e.hm)} Jam`} />
                ))}
              </KartuSeksi>
              <KartuSeksi judul="Avg HM per EGI">
                {(D.per_egi || []).map((e: any) => (
                  <BarisExcel key={e.egi} label={e.egi} nilai={`${fmt(e.avg)} Jam`} />
                ))}
              </KartuSeksi>
              <KartuSeksi judul="PA per EGI">
                {(D.per_egi || []).map((e: any) => (
                  <BarisExcel key={e.egi} label={e.egi} nilai={fmtP(e.pa)} />
                ))}
              </KartuSeksi>
              <KartuSeksi judul="MA per EGI">
                {(D.per_egi || []).map((e: any) => (
                  <BarisExcel key={e.egi} label={e.egi} nilai={fmtP(e.ma)} />
                ))}
              </KartuSeksi>

            {/* CUACA — replika blok Excel */}
            <div className="bg-white rounded-xl border border-slate-200 p-2">
              <div className="text-[9px] font-black uppercase tracking-wider text-slate-500 text-center border-b border-slate-100 pb-1 mb-1">
                Cuaca Tgl {D.cuaca ? fmtTglPanjang(D.cuaca.tanggal) : '–'}
              </div>
              <div className="grid grid-cols-2 gap-1 text-center">
                <div>
                  <div className="text-[8px] font-black uppercase text-slate-400">Shift 1</div>
                  <IkonCuaca jenis={D.cuaca?.cuaca_s1 || 'cerah'} />
                  <div className="text-[9px] font-bold text-slate-600">{LABEL_CUACA[D.cuaca?.cuaca_s1] || '–'}</div>
                </div>
                <div>
                  <div className="text-[8px] font-black uppercase text-slate-400">Shift 2</div>
                  <IkonCuaca jenis={D.cuaca?.cuaca_s2 || 'cerah'} />
                  <div className="text-[9px] font-bold text-slate-600">{LABEL_CUACA[D.cuaca?.cuaca_s2] || '–'}</div>
                </div>
              </div>
              {D.boleh_kelola && (
                <div className="mt-1.5 space-y-1 border-t border-slate-100 pt-1">
                  <input type="date" value={cwTgl} onChange={(e) => setCwTgl(e.target.value)}
                    className="w-full px-1.5 py-0.5 rounded border border-slate-200 text-[9px] font-bold" />
                  <div className="grid grid-cols-2 gap-1">
                    <select value={cwS1} onChange={(e) => setCwS1(e.target.value)}
                      className="px-1 py-0.5 rounded border border-slate-200 text-[9px] font-bold">
                      <option value="cerah">S1 ☀ Cerah</option>
                      <option value="berawan">S1 ⛅ Berawan</option>
                      <option value="hujan">S1 🌧 Hujan</option>
                    </select>
                    <select value={cwS2} onChange={(e) => setCwS2(e.target.value)}
                      className="px-1 py-0.5 rounded border border-slate-200 text-[9px] font-bold">
                      <option value="cerah">S2 ☀ Cerah</option>
                      <option value="berawan">S2 ⛅ Berawan</option>
                      <option value="hujan">S2 🌧 Hujan</option>
                    </select>
                  </div>
                  <button onClick={simpanCuaca} disabled={muatCw || !cwTgl}
                    className="w-full py-1 rounded bg-[#003D79] text-white text-[9px] font-black uppercase tracking-wider disabled:opacity-50">
                    {muatCw ? 'menyimpan…' : 'Simpan Cuaca'}
                  </button>
                </div>
              )}
            </div>
        </div>

        <div className="space-y-1.5">
          <KartuSeksi judul="Pencapaian HM per Hari">
            <div className="overflow-x-auto pb-1">
              <div className="relative min-w-[520px]">
                {/* garis target merah putus-putus */}
                {D.per_hari_target > 0 && (
                  <div className="absolute left-0 right-0 border-t-2 border-dashed border-rose-500 z-10"
                    style={{ bottom: `${(D.per_hari_target / maxHari) * 96 + 28}px` }} />
                )}
                <div className="flex items-end gap-[3px] h-24">
                  {hariHM.map((v: number, i: number) => (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                      {v > 0 && (
                        <div className="text-[7px] font-black text-[#003D79] mb-0.5"
                          style={{ writingMode: 'vertical-rl' as any }}>
                          {fmt1(v)}
                        </div>
                      )}
                      <div className="w-full max-w-[18px] rounded-t bg-gradient-to-t from-[#003D79] to-[#0a5bd3]"
                        style={{ height: `${(v / maxHari) * 96}px` }} />
                    </div>
                  ))}
                </div>
                <div className="flex gap-[3px] mt-1">
                  {hariHM.map((_: any, i: number) => (
                    <div key={i} className="flex-1 text-center text-[8px] font-bold text-slate-500 border-t border-slate-200 pt-0.5">
                      {String(i + 1).padStart(2, '0')}
                    </div>
                  ))}
                </div>
                <div className="flex gap-[3px]">
                  {hariHM.map((v: number, i: number) => (
                    <div key={i} className="flex-1 text-center text-[8px] font-bold text-slate-400">
                      {v > 0 ? Math.round(v) : '-'}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </KartuSeksi>

          {/* ATR unit per hari */}
          <KartuSeksi judul="Persentase (%) ATR Unit per Hari">
            <div className="overflow-x-auto pb-1">
              <div className="min-w-[520px]">
                <div className="flex items-end gap-[3px] h-16">
                  {hariATR.map((v: number | null, i: number) => (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                      {v != null && (
                        <div className="text-[7px] font-black mb-0.5"
                          style={{ writingMode: 'vertical-rl' as any, color: v >= 100 ? '#003D79' : '#e11d48' }}>
                          {fmt(v)}
                        </div>
                      )}
                      <div className={'w-full max-w-[18px] rounded-t ' +
                        (v == null ? 'bg-slate-100' : v >= 100 ? 'bg-[#0a5bd3]' : 'bg-rose-600')}
                        style={{ height: v == null ? 2 : `${(v / 100) * 64}px` }} />
                    </div>
                  ))}
                </div>
                <div className="flex gap-[3px] mt-1">
                  {hariATR.map((_: any, i: number) => (
                    <div key={i} className="flex-1 text-center text-[8px] font-bold text-slate-500 border-t border-slate-200 pt-0.5">
                      {String(i + 1).padStart(2, '0')}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </KartuSeksi>

          {/* tabel unit */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="rounded-t-2xl bg-gradient-to-r from-[#003D79] to-[#0a5bd3] text-white text-center text-[10px] font-black uppercase tracking-wider py-1">
              Sum HM per EGI — per Unit · {(D.per_unit || []).length} unit
            </div>
            <div className="overflow-x-auto pb-2">
              <table className="w-full text-[10px]">
                <thead className="bg-[#0a5bd3] text-white">
                  <tr>
                    <th className="px-1.5 py-2 sticky left-0 z-10 bg-[#0a5bd3] text-left min-w-[34px]">No</th>
                    <th className="px-1.5 py-2 text-left min-w-[74px]">Jenis Unit</th>
                    <th className="px-1.5 py-2 text-left min-w-[64px]">Tipe</th>
                    <th className="px-1.5 py-2 text-left min-w-[76px]">C/N</th>
                    <th className="px-1.5 py-2 text-right min-w-[52px]">HM S1</th>
                    <th className="px-1.5 py-2 text-right min-w-[52px]">HM S2</th>
                    <th className="px-1.5 py-2 text-right min-w-[56px]">Total</th>
                    <th className="px-1.5 py-2 text-center min-w-[56px]">PA (%)</th>
                    <th className="px-1.5 py-2 text-center min-w-[56px]">MA (%)</th>
                    <th className="px-1.5 py-2 text-center min-w-[56px]">UA (%)</th>
                    <th className="px-1.5 py-2 text-left min-w-[110px]">Ket</th>
                  </tr>
                </thead>
                <tbody>
                  {(D.per_unit || []).map((u: any, i: number) => {
                    const bg = i % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                    return (
                      <tr key={u.kode} className={bg}>
                        <td className={'px-1.5 py-0.5 sticky left-0 z-10 italic text-slate-500 ' + bg}>{i + 1}</td>
                        <td className="px-1.5 py-0.5 italic">{u.jenis}</td>
                        <td className="px-1.5 py-0.5">{u.egi.replace('SPR', '').replace('RB', 'RB')}</td>
                        <td className="px-1.5 py-0.5 italic font-bold">{u.kode}</td>
                        <td className={'px-1.5 py-0.5 text-right tabular-nums ' +
                          (u.s1 > 0 ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-rose-100 text-rose-600')}>{fmt(u.s1)}</td>
                        <td className={'px-1.5 py-0.5 text-right tabular-nums ' +
                          (u.s2 > 0 ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-rose-100 text-rose-600')}>{fmt(u.s2)}</td>
                        <td className="px-1.5 py-0.5 text-right tabular-nums font-black text-[#0b2a5b]">{fmt(u.mtd)}</td>
                        <SelPct v={u.pa} />
                        <SelPct v={u.ma} />
                        <SelPct v={u.ua} ambang={70} />
                        <td className="px-1.5 py-0.5 italic text-slate-500">{u.ket || ''}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
        </>
      )}

      {D.boleh_kelola && (
        <FormTarget site={site} bulan={bulan} target={D.target} onSaved={muat} />
      )}
    </div>
  )
}

function FormTarget({ site, bulan, target, onSaved }: { site: string; bulan: string; target: any; onSaved: () => void }) {
  const [tj, setTj] = useState('')
  const [fk, setFk] = useState('')
  const [simpan, setSimpan] = useState(false)
  const [pesan, setPesan] = useState('')

  useEffect(() => {
    setTj(target ? String(target.target_jam) : '')
    setFk(target ? String(target.faktor) : '88')
  }, [target, site, bulan])

  async function kirim() {
    setSimpan(true); setPesan('')
    try {
      const r = await fetch('/api/produksi/dashboard', {
        method: 'POST', credentials: 'include', headers: hdr(),
        body: JSON.stringify({ site, bulan, target_jam: Number(tj), faktor: Number(fk) }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j?.error || 'Gagal')
      setPesan('✅ Target tersimpan')
      onSaved()
    } catch (e: any) { setPesan('❌ ' + (e?.message || 'Gagal')) }
    setSimpan(false)
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-2">
      <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">
        🎯 Target HM Bulanan ({labelBulan(bulan)})
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 mb-1">Target Jam</label>
          <input type="number" min={0} value={tj} onChange={(e) => setTj(e.target.value)} placeholder="cth: 10500"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-400 mb-1">Faktor Tersisa (%)</label>
          <input type="number" min={0} max={100} value={fk} onChange={(e) => setFk(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold" />
        </div>
      </div>
      <button onClick={kirim} disabled={simpan || !tj}
        className="mt-2 w-full py-2 rounded-xl bg-[#003D79] text-white font-black text-[11px] uppercase tracking-wider disabled:opacity-50">
        {simpan ? 'Menyimpan…' : 'Simpan Target'}
      </button>
      {pesan && <p className="mt-1.5 text-[10px] font-bold text-center text-slate-500">{pesan}</p>}
    </div>
  )
}

/* ═══════════════ TAB 2 — IMPORT HARIAN ═══════════════ */

function ImportHarian() {
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
    </div>
  )
}
