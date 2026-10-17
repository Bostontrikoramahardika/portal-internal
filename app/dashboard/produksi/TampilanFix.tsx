'use client'

import { useMemo, useState, type ReactNode } from 'react'

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

function Ring({ p, size, children }: { p: number; size: number; children: ReactNode }) {
  const v = Math.max(0, Math.min(100, p))
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flex: `0 0 ${size}px`,
      background: `conic-gradient(#0a5bd3 ${v}%, #e7edf3 0)`,
      display: 'grid', placeItems: 'center', position: 'relative',
    }}>
      <div style={{
        position: 'absolute', inset: size > 90 ? 11 : 6, borderRadius: '50%', background: '#fff',
      }} />
      <div style={{ position: 'relative', textAlign: 'center' }}>{children}</div>
    </div>
  )
}

function Panel({ judul, desc, tag, children }: { judul: string; desc?: string; tag?: string; children: ReactNode }) {
  return (
    <article className="bg-white rounded-xl border border-slate-200 overflow-hidden min-w-0 shadow-sm">
      <div className="flex justify-between items-start gap-2 px-3.5 pt-3 pb-2">
        <div>
          <div className="text-[12px] font-black text-[#1a3d62]">{judul}</div>
          {desc && <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">{desc}</div>}
        </div>
        {tag && <span className="text-[9px] font-black uppercase tracking-wide px-2 py-1 rounded-full bg-slate-100 text-slate-500 whitespace-nowrap">{tag}</span>}
      </div>
      {children}
    </article>
  )
}

function Blok({ no, judul, sub }: { no: string; judul: string; sub: string }) {
  return (
    <div className="flex items-center gap-2.5 mt-5 mb-2">
      <span className="w-7 h-7 rounded-lg bg-[#e5f0fb] text-[#15518b] text-[11px] font-black grid place-items-center">{no}</span>
      <div>
        <h2 className="m-0 text-[15px] font-black text-[#183d63] leading-tight">{judul}</h2>
        <p className="m-0 mt-0.5 text-[10px] text-slate-400">{sub}</p>
      </div>
    </div>
  )
}

function pill(v: number | null, ambang: number | null) {
  if (v == null) return <span className="text-slate-300">-</span>
  const cek = ambang != null
  const ok = !cek || v >= ambang
  const cls = !cek ? 'bg-slate-100 text-slate-700' : ok ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'
  return <span className={'inline-block min-w-[48px] text-center rounded px-1.5 py-0.5 text-[10px] font-black ' + cls}>{fmt(v)}%</span>
}

export default function TampilanFix({ d, bulan }: { d: any; bulan: string }) {
  const [filter, setFilter] = useState('Semua')
  const [klip, setKlip] = useState<any>(null)
  const [cekAll, setCekAll] = useState(false)

  const paAcu = Number(d.target?.pa_target ?? 90)
  const maAcu = Number(d.target?.ma_target ?? 92)
  const targetJam = Number(d.target?.target_jam || 0)
  const targetHarian = Number(d.target_harian || 0)
  const hariBulan = Number(d.hari_bulan || 31)
  const hariTerisi = Number(d.hari_terisi || 0)
  const diharapkan = targetHarian * hariTerisi
  const gap = Number(d.total_hm || 0) - diharapkan
  const pctDS = d.total_hm ? (d.hm_ds / d.total_hm) * 100 : 0
  const pctNS = 100 - pctDS

  const units = d.per_unit || []
  let paW = 0, paH = 0, maW = 0, maH = 0, uaW = 0, uaH = 0, fuel = 0
  for (const u of units) {
    if (u.pa != null) { paW += u.pa * u.mtd; paH += u.mtd }
    if (u.ma != null) { maW += u.ma * u.mtd; maH += u.mtd }
    if (u.ua != null) { uaW += u.ua * u.mtd; uaH += u.mtd }
    if (u.fuel_total != null) fuel += Number(u.fuel_total)
  }
  const paSite = paH ? paW / paH : null
  const maSite = maH ? maW / maH : null
  const uaSite = uaH ? uaW / uaH : null
  const fc = d.total_hm > 0 && fuel ? fuel / d.total_hm : null

  const catatanN = (d.cek || []).filter((c: any) => c.tag === 'Catatan BD').length
  const minggu = d.minggu || []
  const mingguIni = minggu[minggu.length - 1]
  const hmBar = Number(d.total_hm || 0)
  const stbBar = Number(d.total_stb || 0)
  const totBar = hmBar + stbBar || 1

  const days = Array.from({ length: hariBulan }, (_, i) => i + 1)
  const ops = useMemo(() => {
    return (d.operator || []).filter((o: any) => filter === 'Semua' || o.jenis === filter)
  }, [d.operator, filter])

  function isiHari(o: any, day: number) {
    return (o.hari || []).filter((h: any) => Number(String(h.tgl).slice(8, 10)) === day)
  }

  const cekList = d.cek || []
  const cekTampil = cekAll ? cekList : cekList.slice(0, 6)
  const tglAkhir = d.tgl_terakhir ? String(d.tgl_terakhir).slice(8, 10) : '—'

  return (
    <div className="space-y-2">
      <div className="rounded-xl overflow-hidden shadow-sm">
        <div className="bg-gradient-to-r from-[#0a5bd3] to-[#003D79] py-2.5 text-center text-white text-[13px] font-black uppercase tracking-wide">
          Laporan Produksi + Monitoring · Site {d.site || ''}
        </div>
        <div className="bg-[#dceafa] py-1.5 text-center text-[11px] font-bold text-[#194675]">
          Bulanan · 01 – {tglAkhir} {labelBulan(bulan)} · TS Opt
        </div>
      </div>

      <div>
        <h2 className="m-0 text-[17px] font-black text-[#183d63]">Ringkasan Produksi</h2>
        <p className="m-0 mt-0.5 text-[11px] text-slate-400">Laporan HM dan metrik monitoring dalam satu tampilan.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {[
          { l: 'HM didapat', v: `${fmt1(d.total_hm)}`, s: 'HM', f: `Target harian ${fmt1(targetHarian)}` },
          { l: 'Revenue / Pendapatan', v: '—', s: '', f: 'Tarif belum diatur' },
          { l: 'Jam BD', v: catatanN ? String(catatanN) : '—', s: catatanN ? 'catatan' : '', f: 'Dari kolom Catatan TS Opt' },
          { l: 'Fuel & FC', v: fuel ? fmt1(fuel) : '—', s: fuel ? 'L' : '', f: fc != null ? `FC ${fmt(fc)} L/HM` : 'Dari rate unit × HM' },
        ].map((k) => (
          <div key={k.l} className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#2674c5]" />
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{k.l}</div>
            <div className="mt-1.5 text-[22px] font-black text-[#153b61] leading-tight">
              {k.v}{k.s ? <small className="text-[11px] text-slate-400 font-bold ml-1">{k.s}</small> : null}
            </div>
            <div className="mt-1.5 text-[10px] text-slate-400">{k.f}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
        {[
          ['Target HM bulan', `${fmt1(targetJam)} HM`, 'Satu-satunya target HM'],
          ['Hari kalender', `${hariBulan} hari`, labelBulan(bulan)],
          ['Target per hari', `${fmt1(targetHarian)} HM`, 'Otomatis = target bulan / hari'],
          ['Hari berjalan (data terisi)', `${hariTerisi} / ${hariBulan}`, 'Hari terakhir ada HM'],
          ['HM seharusnya s.d. hari ini', `${fmt1(diharapkan)} HM`, 'Target/hari × hari berjalan'],
          ['HM kumulatif vs laju', `${gap >= 0 ? '+' : ''}${fmt1(gap)} HM`, 'Kumulatif vs seharusnya'],
        ].map(([a, b, c]) => (
          <div key={a} className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
            <small className="block text-[9px] font-black uppercase tracking-wider text-slate-400">{a}</small>
            <b className="block mt-1 text-[16px] text-[#153b61]">{b}</b>
            <span className="block mt-0.5 text-[9px] text-slate-400">{c}</span>
          </div>
        ))}
      </div>

      <Blok no="01" judul="Laporan Produksi · HM & target" sub="Total HM, achievement, target, dan pembagian per shift (gauge lingkaran)." />
      <div className="grid gap-2.5 md:grid-cols-2">
        <Panel judul="HM tercapai" desc="Pencapaian terhadap target bulan." tag="TS OPT">
          <div className="flex items-center gap-4 px-4 pb-4">
            <Ring p={Number(d.achievement_pct || 0)} size={120}>
              <strong className="block text-[20px] text-[#143c64]">{fmt1(d.achievement_pct)}%</strong>
              <small className="text-[9px] font-black uppercase text-slate-400">pencapaian</small>
            </Ring>
            <div className="flex-1 min-w-0">
              <div className="text-[18px] font-black text-[#173e63]">{fmt1(d.total_hm)} <small className="text-[11px] text-slate-400">HM didapat</small></div>
              <div className="flex justify-between text-[10px] text-slate-400 border-t border-slate-100 py-1.5 mt-1"><span>Target bulan</span><b className="text-[#244765]">{fmt1(targetJam)} HM</b></div>
              <div className="flex justify-between text-[10px] text-slate-400 border-t border-slate-100 py-1.5"><span>Tersisa Excel 88%</span><b className="text-[#244765]">{fmt1(d.target?.tersisa)} HM</b></div>
            </div>
          </div>
        </Panel>
        <Panel judul="HM per shift" desc="Gauge lingkaran = porsi dari HM periode. Tidak ada target per shift." tag="Shift I + II">
          <div className="grid grid-cols-2 gap-2 px-3 pb-2">
            <div className="flex items-center gap-2 p-2 rounded-xl border border-slate-100 bg-slate-50">
              <Ring p={pctDS} size={70}><span className="text-[11px] font-black text-[#173f65]">{fmt1(pctDS)}%</span></Ring>
              <div>
                <div className="text-[9px] font-black uppercase text-slate-400">Shift I / DS</div>
                <div className="text-[15px] font-black text-[#173b60]">{fmt1(d.hm_ds)} HM</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl border border-slate-100 bg-slate-50">
              <Ring p={pctNS} size={70}><span className="text-[11px] font-black text-[#173f65]">{fmt1(pctNS)}%</span></Ring>
              <div>
                <div className="text-[9px] font-black uppercase text-slate-400">Shift II / NS</div>
                <div className="text-[15px] font-black text-[#173b60]">{fmt1(d.hm_ns)} HM</div>
              </div>
            </div>
          </div>
          <div className="mx-3 mb-3 text-center text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg py-1.5">
            Cocok · {fmt1(d.hm_ds)} + {fmt1(d.hm_ns)} = {fmt1(d.total_hm)} HM
          </div>
        </Panel>
      </div>

      <Blok no="02" judul="Grafik & perbandingan" sub="Tren HM harian. Revenue tidak dihitung — tarif belum ada." />
      <div className="grid gap-2.5 md:grid-cols-2">
        <Panel judul="HM per hari" desc="Garis putus-putus = target harian kalender.">
          <div className="overflow-x-auto px-2 pb-2">
            <div className="flex items-end gap-0.5 h-24 min-w-[520px]">
              {(d.per_hari || []).map((v: number, i: number) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                  <div className="w-full max-w-[14px] rounded-t bg-[#0a5bd3]"
                    style={{ height: `${Math.min(100, (v / Math.max(targetHarian * 1.4, 1)) * 100)}%` }} />
                </div>
              ))}
            </div>
            <div className="flex gap-0.5 min-w-[520px] mt-1">
              {(d.per_hari || []).map((_: any, i: number) => (
                <div key={i} className="flex-1 text-center text-[8px] text-slate-400">{String(i + 1).padStart(2, '0')}</div>
              ))}
            </div>
          </div>
          <p className="px-3 pb-2 text-[9px] text-slate-400">Target harian monitoring {fmt1(targetHarian)} jam (bukan rumus Excel 88%).</p>
        </Panel>
        <Panel judul="Revenue / Pendapatan" desc="Batang pendapatan per hari." tag="TARIF BELUM ADA">
          <div className="h-28 grid place-items-center text-[11px] text-slate-400 px-4 text-center">
            Tidak dihitung. Isi tarif/harga unit dulu di pengaturan — jangan pakai angka simulasi.
          </div>
        </Panel>
      </div>

      <Blok no="03" judul="Kinerja unit & EGI" sub="HM per unit, PA/MA/UA, satu acuan site." />
      <Panel judul="Ringkasan unit" desc={`${units.length} unit · acuan PA ${fmt1(paAcu)} / MA ${fmt1(maAcu)} · UA dipantau`} tag="TS OPT">
        <div className="overflow-x-auto pb-2">
          <table className="w-full text-[10px]">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                {['Unit', 'Jenis', 'HM S1', 'HM S2', 'Total', 'PA', 'MA', 'UA'].map((h) => (
                  <th key={h} className="px-2 py-2 text-left font-black uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {units.map((u: any) => (
                <tr key={u.kode} className="border-t border-slate-100">
                  <td className="px-2 py-1.5 font-black text-[#155b9c]">{u.kode}</td>
                  <td className="px-2 py-1.5">{u.jenis}</td>
                  <td className="px-2 py-1.5 tabular-nums">{fmt(u.s1)}</td>
                  <td className="px-2 py-1.5 tabular-nums">{fmt(u.s2)}</td>
                  <td className="px-2 py-1.5 tabular-nums font-black">{fmt(u.mtd)}</td>
                  <td className="px-2 py-1.5">{pill(u.pa, paAcu)}</td>
                  <td className="px-2 py-1.5">{pill(u.ma, maAcu)}</td>
                  <td className="px-2 py-1.5">{pill(u.ua, null)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <div className="grid gap-2.5 md:grid-cols-2 mt-2.5">
        <Panel judul="PA, MA, UA per EGI" desc="Satu acuan site, bukan per EGI.">
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead className="bg-slate-50"><tr>{['EGI', 'SUM', 'AVG', 'PA', 'MA', 'UA'].map((h) => <th key={h} className="px-2 py-2 text-left font-black">{h}</th>)}</tr></thead>
              <tbody>
                {(d.per_egi || []).map((e: any) => (
                  <tr key={e.egi} className="border-t border-slate-100">
                    <td className="px-2 py-1.5 font-black">{e.egi}</td>
                    <td className="px-2 py-1.5 tabular-nums">{fmt(e.hm)}</td>
                    <td className="px-2 py-1.5 tabular-nums">{fmt(e.avg)}</td>
                    <td className="px-2 py-1.5">{pill(e.pa, paAcu)}</td>
                    <td className="px-2 py-1.5">{pill(e.ma, maAcu)}</td>
                    <td className="px-2 py-1.5">{pill(e.ua, null)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel judul="2 tertinggi / 2 terendah per EGI" tag="PER EGI">
          <div className="grid grid-cols-2 gap-2 px-3 pb-3 text-[10px]">
            {([['Tertinggi', d.top_egi], ['Terendah', d.low_egi]] as const).map(([judul, data]) => (
              <div key={judul}>
                <div className="font-black text-slate-400 uppercase mb-1">{judul}</div>
                {['Excavator', 'Bulldozer', 'Grader'].map((j) => (
                  <div key={judul + j} className="mb-1.5">
                    <div className="font-black text-[#155b9c]">{j}</div>
                    {((data as any)?.[j] || []).map((r: any, i: number) => (
                      <div key={i}>{i + 1}. <b>{r.nama}</b> · {r.unit} · {fmt1(r.hm)}</div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Blok no="04" judul="Analisis mingguan PA · MA · UA" sub="Satu acuan site. Pecahan HM vs STB dari TS Opt." />
      <div className="grid grid-cols-3 gap-2.5">
        {[
          ['PA minggu berjalan', mingguIni?.pa, paAcu],
          ['MA minggu berjalan', mingguIni?.ma, maAcu],
          ['UA minggu berjalan', mingguIni?.ua, null],
        ].map(([l, v, a]) => (
          <div key={String(l)} className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
            <small className="block text-[9px] font-black uppercase text-slate-400">{l as string}</small>
            <div className="mt-1 text-[22px] font-black text-[#153b61]">{fmtP(v as any)}</div>
            <div className="text-[10px] text-slate-400 mt-1">{a == null ? 'Dipantau · tanpa acuan' : `vs acuan ${fmt1(a as number)}%`}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-2.5 md:grid-cols-2 mt-2.5">
        <Panel judul="PA / MA / UA per minggu">
          <div className="px-3 pb-3 space-y-1">
            {minggu.map((w: any) => (
              <div key={w.kunci} className="flex justify-between text-[10px] border-t border-slate-50 py-1">
                <span className="font-bold">{w.label?.replace(bulan, labelBulan(bulan))}</span>
                <span className="tabular-nums font-black">PA {fmtP(w.pa)} · MA {fmtP(w.ma)} · UA {fmtP(w.ua)}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel judul="Pecahan waktu · akar UA" desc="HM vs standby. HM BD bukan kolom TS Opt.">
          <div className="flex h-4 rounded-full overflow-hidden mx-3 mb-2 bg-slate-100">
            <i className="block h-full bg-[#0a5bd3]" style={{ width: `${(hmBar / totBar) * 100}%` }} />
            <i className="block h-full bg-amber-400" style={{ width: `${(stbBar / totBar) * 100}%` }} />
          </div>
          <div className="px-3 pb-3 text-[10px] text-slate-500">
            <b className="text-[#244765]">HM {fmt1(hmBar)}</b> · STB {fmt1(stbBar)} · PA site {fmtP(paSite)} · MA {fmtP(maSite)} · UA {fmtP(uaSite)}
          </div>
        </Panel>
      </div>

      <Blok no="05" judul="Perlu dicek" sub="Dari TS Opt: UA kosong, STB &gt; HM, catatan BD, HM 0, di bawah avg EGI." />
      <Panel judul={`Perlu dicek hari ini`} tag={`${cekList.length} item`}>
        <ul className="m-0 px-3.5 pb-3 list-none">
          {cekTampil.map((c: any, i: number) => (
            <li key={i} className="py-1.5 border-t border-slate-100 text-[10px] text-slate-600 first:border-0">
              <span className="inline-block mr-1.5 rounded px-1.5 py-0.5 text-[8px] font-black uppercase bg-amber-100 text-amber-800">{c.tag}</span>
              {c.teks}
            </li>
          ))}
        </ul>
        {cekList.length > 6 && (
          <button onClick={() => setCekAll(!cekAll)} className="mx-3.5 mb-3 text-[10px] font-black uppercase text-[#003D79] underline">
            {cekAll ? 'Tutup' : `Lihat semua (${cekList.length})`}
          </button>
        )}
      </Panel>

      <Blok no="06" judul="Papan HM per operator" sub="Klik angka tanggal = klip unit, HM awal, HM akhir. Tanpa Charge, tanpa OFF/CR." />
      <Panel judul="Papan HM per operator" desc="Diurutkan HM tertinggi. Sel kosong = belum ada baris TS Opt." tag="TS OPT">
        <div className="flex gap-1 px-3 pb-2 flex-wrap items-center">
          {['Semua', 'Excavator', 'Bulldozer', 'Grader'].map((j) => (
            <button key={j} onClick={() => { setFilter(j); setKlip(null) }}
              className={'px-2 py-1 rounded-lg text-[9px] font-black uppercase ' + (filter === j ? 'bg-[#003D79] text-white' : 'bg-slate-100 text-slate-500')}>
              {j}
            </button>
          ))}
          <span className="ml-auto text-[9px] text-slate-400">{ops.length} baris</span>
        </div>
        <div className="overflow-x-auto max-h-[420px]">
          <table className="text-[9px] border-collapse">
            <thead className="bg-[#0a5bd3] text-white sticky top-0 z-20">
              <tr>
                <th className="px-1 py-1">#</th>
                <th className="px-1 py-1 text-left min-w-[88px]">Nama</th>
                <th className="px-1 py-1 text-left">Unit</th>
                <th className="px-1 py-1 text-right">HM</th>
                <th className="px-1 py-1 text-right">vs avg</th>
                {days.map((day) => <th key={day} className="px-0.5 py-1 min-w-[28px]">{day}</th>)}
              </tr>
            </thead>
            <tbody>
              {ops.map((o: any, i: number) => {
                const avg = Number(d.avg_egi?.[o.jenis] || 0)
                const delta = avg ? o.hm - avg : 0
                return (
                  <tr key={o.nama + o.unit + i} className={i % 2 ? 'bg-slate-50' : 'bg-white'}>
                    <td className="px-1 py-0.5 font-black">{i + 1}</td>
                    <td className="px-1 py-0.5 font-bold whitespace-nowrap">{o.nama}</td>
                    <td className="px-1 py-0.5 whitespace-nowrap text-[#155b9c] font-black">{o.unit}</td>
                    <td className="px-1 py-0.5 text-right font-black tabular-nums">{fmt1(o.hm)}</td>
                    <td className={'px-1 py-0.5 text-right tabular-nums ' + (delta < 0 ? 'text-amber-700' : 'text-emerald-700')}>
                      {avg ? (delta >= 0 ? '+' : '') + fmt1(delta) : '-'}
                    </td>
                    {days.map((day) => {
                      const items = isiHari(o, day)
                      const hm = items.reduce((s: number, h: any) => s + Number(h.hm || 0), 0)
                      const on = klip && klip.op === o && klip.day === day
                      if (!items.length) return <td key={day} className="text-center text-slate-200">·</td>
                      return (
                        <td key={day} onClick={() => setKlip(on ? null : { op: o, day, items })}
                          className={'text-center tabular-nums font-black cursor-pointer ' + (on ? 'bg-[#003D79] text-white' : 'bg-amber-50 text-[#173e63]')}>
                          {fmt1(hm)}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {klip && (
          <div className="m-3 p-3 rounded-xl border border-amber-200 bg-[#fffef8] text-[11px]">
            <div className="text-[9px] font-black uppercase tracking-wider text-amber-800 mb-1">Klip HM</div>
            <div className="font-black text-[#183d63] mb-1">{klip.op.nama} · {klip.op.unit} · tgl {String(klip.day).padStart(2, '0')}</div>
            {klip.items.map((h: any, i: number) => (
              <div key={i} className="flex justify-between border-t border-amber-100 py-1">
                <span>Shift {h.shift}</span>
                <span>awal {fmt1(h.awal)} → akhir {fmt1(h.akhir)} · HM {fmt1(h.hm)}</span>
              </div>
            ))}
            <button onClick={() => setKlip(null)} className="mt-1 text-[9px] font-black uppercase text-slate-400">Tutup</button>
          </div>
        )}
      </Panel>
    </div>
  )
}
