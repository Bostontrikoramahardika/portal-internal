'use client'

import { useMemo, useState, type ReactNode } from 'react'

const fmt = (n: number | null | undefined) =>
  n == null ? '-' : Number(n).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmt1 = (n: number | null | undefined) =>
  n == null ? '-' : Number(n).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const fmtP = (n: number | null | undefined) => (n == null ? '-' : `${fmt(n)}%`)
function fmtRp(n: number | null | undefined) {
  if (n == null || !isFinite(Number(n)) || Number(n) === 0) return '—'
  const v = Number(n)
  if (v >= 1e9) return 'Rp ' + (v / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' M'
  if (v >= 1e6) return 'Rp ' + (v / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' jt'
  return 'Rp ' + Math.round(v).toLocaleString('id-ID')
}

const NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
function labelBulan(b: string) {
  const [th, bl] = b.split('-')
  return `${NAMA_BULAN[Number(bl) - 1] || bl} ${th}`
}

function Ring({ p, size, children, color = '#0a5bd3' }: { p: number; size: number; children: ReactNode; color?: string }) {
  const v = Math.max(0, Math.min(100, p))
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flex: `0 0 ${size}px`,
      background: `conic-gradient(${color} ${v}%, #e7edf3 0)`,
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

function WeeklyCompare({ minggu, bulan }: { minggu: any[]; bulan: string }) {
  const ini = minggu?.[minggu.length - 1]
  const lalu = minggu?.[minggu.length - 2]
  if (!ini) return <p className="px-3 pb-3 text-[11px] text-slate-400">Belum ada data minggu.</p>
  if (!lalu) {
    return (
      <p className="px-3 pb-3 text-[11px] text-slate-400">
        Minggu ini: {ini.label?.replace(bulan, labelBulan(bulan))}. Minggu lalu belum ada di import — upload TS Opt minggu sebelumnya untuk perbandingan.
      </p>
    )
  }
  function pctCh(a: number | null, b: number | null) {
    if (a == null || b == null || !Number(b)) return null
    return ((Number(a) - Number(b)) / Math.abs(Number(b))) * 100
  }
  const rows: [string, any, any, boolean, boolean][] = [
    ['HM', ini.hm, lalu.hm, false, false],
    ['STB', ini.stb, lalu.stb, false, true],
    ['PA %', ini.pa, lalu.pa, true, false],
    ['MA %', ini.ma, lalu.ma, true, false],
    ['UA %', ini.ua, lalu.ua, true, false],
    ['FC L/HM', ini.fc, lalu.fc, false, true],
    ['Fuel L', ini.fuel, lalu.fuel, false, true],
  ]
  return (
    <div className="overflow-x-auto px-3 pb-3">
      <table className="w-full text-[10px]">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-2 py-2 text-left">Metrik</th>
            <th className="px-2 py-2 text-right">Minggu ini<br />{ini.label?.replace(bulan, labelBulan(bulan))}</th>
            <th className="px-2 py-2 text-right">Minggu lalu<br />{lalu.label?.replace(bulan, labelBulan(bulan))}</th>
            <th className="px-2 py-2 text-right">Naik / turun</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([n, a, b, isPct, worseIfUp]) => {
            const p = pctCh(a, b)
            const naik = p != null && p > 0.05
            const turun = p != null && p < -0.05
            const bagus = p == null ? null : (worseIfUp ? turun : naik)
            const label = p == null ? '—' : `${p >= 0 ? '▲ +' : '▼ '}${fmt1(Math.abs(p))}%`
            return (
              <tr key={n} className="border-t border-slate-100">
                <td className="px-2 py-1.5 font-black">{n}</td>
                <td className="px-2 py-1.5 text-right tabular-nums font-black">{isPct ? fmtP(a) : fmt1(a)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{isPct ? fmtP(b) : fmt1(b)}</td>
                <td className={'px-2 py-1.5 text-right tabular-nums font-black ' + (bagus == null ? 'text-slate-400' : bagus ? 'text-emerald-700' : 'text-rose-600')}>
                  {label}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function potongHari(arr: number[] | undefined, n: number) {
  const a = arr || []
  const sampai = Math.max(1, n)
  return a.slice(0, sampai)
}

function BatangPaMaHari({ pa, ma, ambang, sampai }: { pa: (number | null)[]; ma: (number | null)[]; ambang: number; sampai: number }) {
  const n = Math.max(1, sampai)
  const paD = (pa || []).slice(0, n)
  const maD = (ma || []).slice(0, n)
  const H = 120
  const [pilih, setPilih] = useState<number | null>(n - 1)
  const lineBottom = 28 + (Math.min(100, ambang) / 100) * H
  const idx = pilih == null ? n - 1 : Math.min(pilih, n - 1)
  function warna(v: number | null) {
    if (v == null) return '#e2e8f0'
    return v < ambang ? '#e11d48' : '#16a34a'
  }
  function tinggi(v: number | null) {
    const n = v == null ? 0 : Math.max(0, Math.min(100, v))
    return (n / 100) * H
  }
  return (
    <div className="px-2 pb-2">
      <div className="flex gap-3 px-1 pb-1 text-[9px] font-black text-slate-500">
        <span>█ kiri = PA</span><span>█ kanan = MA</span><span className="text-red-600">— garis {fmt1(ambang)}%</span>
      </div>
      <div className="overflow-x-auto">
        <div className="relative min-w-[560px]" style={{ height: H + 28 }}>
          <div className="absolute left-0 right-0 z-10 border-t-2 border-red-500 pointer-events-none" style={{ bottom: lineBottom }} />
          <div className="absolute inset-x-0 bottom-7 flex items-end gap-[4px]" style={{ height: H }}>
            {paD.map((_, i) => (
              <button key={i} type="button" onClick={() => setPilih(i)}
                className="flex-1 h-full flex items-end justify-center gap-[1px]">
                <div className="w-[45%] max-w-[12px] rounded-t" style={{ height: `${tinggi(paD[i])}px`, background: warna(paD[i]), minHeight: 2 }} />
                <div className="w-[45%] max-w-[12px] rounded-t" style={{ height: `${tinggi(maD[i])}px`, background: warna(maD[i]), minHeight: 2 }} />
              </button>
            ))}
          </div>
          <div className="absolute inset-x-0 bottom-0 flex gap-[4px]">
            {paD.map((_, i) => (
              <div key={i} className={'flex-1 text-center text-[8px] font-black ' + (idx === i ? 'text-[#003D79]' : 'text-slate-400')}>{i + 1}</div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-2 rounded-lg bg-slate-50 border border-slate-100 px-2 py-1.5 text-[11px] font-bold text-slate-600">
        Tanggal {idx + 1}: PA {paD[idx] == null ? '—' : fmt1(paD[idx]) + '%'}
        {paD[idx] != null ? (paD[idx]! >= ambang ? ' hijau' : ' merah') : ''}
        {' · '}MA {maD[idx] == null ? '—' : fmt1(maD[idx]) + '%'}
        {maD[idx] != null ? (maD[idx]! >= ambang ? ' hijau' : ' merah') : ''}
        {' · garis '}{fmt1(ambang)}%
      </div>
    </div>
  )
}

function BatangPaUnit({ units, ambang }: { units: any[]; ambang: number }) {
  const list = (units || []).slice().sort((a: any, b: any) => String(a.kode).localeCompare(String(b.kode)))
  const [pilih, setPilih] = useState<string | null>(list[0]?.kode || null)
  const H = 130
  const u = list.find((x: any) => x.kode === pilih)
  return (
    <div className="px-2 pb-2">
      <div className="overflow-x-auto">
        <div className="relative" style={{ minWidth: Math.max(520, list.length * 36), height: H + 52 }}>
          <div className="absolute left-0 right-0 z-10 border-t-2 border-red-500 pointer-events-none"
            style={{ bottom: 52 + (Math.min(100, ambang) / 100) * H }} />
          <div className="absolute inset-x-0 bottom-[52px] flex items-end gap-[3px]" style={{ height: H }}>
            {list.map((x: any) => {
              const v = x.pa
              const n = v == null ? 0 : Math.max(0, Math.min(100, v))
              const bawah = v != null && v < ambang
              const warna = v == null ? '#e2e8f0' : bawah ? '#e11d48' : '#16a34a'
              return (
                <button key={x.kode} type="button" onClick={() => setPilih(x.kode)}
                  className="flex-1 h-full flex flex-col items-center justify-end min-w-[22px]">
                  {v != null && (
                    <div className="text-[7px] font-black mb-0.5" style={{ color: bawah ? '#b91c1c' : '#15803d' }}>{fmt1(v)}</div>
                  )}
                  <div className="w-full max-w-[16px] rounded-t" style={{ height: `${(n / 100) * H}px`, background: warna, minHeight: 3 }} />
                </button>
              )
            })}
          </div>
          <div className="absolute inset-x-0 bottom-0 flex gap-[3px] h-[50px] overflow-visible">
            {list.map((x: any) => (
              <div key={x.kode} className="flex-1 min-w-[28px] relative">
                <span className={'absolute left-0 top-1 text-[8px] font-bold italic whitespace-nowrap origin-top-left ' + (pilih === x.kode ? 'text-[#003D79]' : 'text-slate-500')}
                  style={{ transform: 'rotate(-38deg)' }}>{x.kode}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {u && (
        <div className="mt-2 rounded-lg bg-slate-50 border border-slate-100 px-2 py-1.5 text-[11px] font-bold text-slate-600">
          {u.kode} · {u.jenis} · PA {u.pa == null ? '—' : fmt1(u.pa) + '%'}
          {u.pa != null ? (u.pa >= ambang ? ' · hijau (≥ garis)' : ' · merah (di bawah garis)') : ''}
          {' · garis '}{fmt1(ambang)}%
        </div>
      )}
    </div>
  )
}

function BatangTargetHari({ data, ambang, sampai }: { data: (number | null)[]; ambang: number | null; sampai: number }) {
  const d = (data || []).slice(0, Math.max(1, sampai))
  const H = 120
  const [pilih, setPilih] = useState<number | null>(d.length ? d.length - 1 : null)
  const lineBottom = ambang != null ? 28 + (Math.min(100, ambang) / 100) * H : null
  const idx = pilih == null ? null : Math.min(pilih, d.length - 1)
  const val = idx != null ? d[idx] : null
  return (
    <div className="px-2 pb-2">
      <div className="overflow-x-auto">
        <div className="relative min-w-[520px]" style={{ height: H + 28 }}>
          {lineBottom != null && (
            <div className="absolute left-0 right-0 z-10 border-t-2 border-red-500 pointer-events-none" style={{ bottom: lineBottom }} />
          )}
          <div className="absolute inset-x-0 bottom-7 flex items-end gap-[3px]" style={{ height: H }}>
            {d.map((v, i) => {
              const n = v == null ? 0 : Math.max(0, Math.min(100, v))
              const bawah = ambang != null && v != null && v < ambang
              const warna = v == null ? '#e2e8f0' : bawah ? '#e11d48' : '#16a34a'
              return (
                <button key={i} type="button" onClick={() => setPilih(i)}
                  className="flex-1 h-full flex flex-col items-center justify-end">
                  {v != null && (
                    <div className="text-[7px] font-black mb-0.5" style={{ color: bawah ? '#b91c1c' : '#15803d' }}>{fmt1(v)}</div>
                  )}
                  <div className="w-full max-w-[18px] rounded-t" style={{ height: `${(n / 100) * H}px`, background: warna, minHeight: v != null ? 4 : 1 }} />
                </button>
              )
            })}
          </div>
          <div className="absolute inset-x-0 bottom-0 flex gap-[3px]">
            {d.map((_, i) => (
              <div key={i} className={'flex-1 text-center text-[8px] font-black ' + (idx === i ? 'text-[#003D79]' : 'text-slate-400')}>{i + 1}</div>
            ))}
          </div>
        </div>
      </div>
      {idx != null && (
        <div className="mt-2 rounded-lg bg-slate-50 border border-slate-100 px-2 py-1.5 text-[11px] font-bold text-slate-600">
          Tanggal {idx + 1}: aktual {val == null ? '—' : fmt1(val) + '%'}
          {ambang != null ? ` · plan ${fmt1(ambang)}%` : ' · tanpa acuan'}
          {ambang != null && val != null ? (val >= ambang ? ' · hijau (di atas garis)' : ' · merah (di bawah garis)') : ''}
        </div>
      )}
    </div>
  )
}

function BatangHari({ data, warna = '#e11d48', sampai, onPilih, pilih }: {
  data: number[]; warna?: string; sampai: number; onPilih?: (i: number) => void; pilih?: number | null
}) {
  const d = potongHari(data, sampai)
  const max = Math.max(1, ...d)
  return (
    <div className="overflow-x-auto px-2 pb-2">
      <div className="flex items-end gap-[3px] h-32 min-w-[520px]">
        {d.map((v, i) => (
          <button key={i} type="button" onClick={() => onPilih?.(i)}
            className={'flex-1 flex flex-col items-center justify-end h-full rounded-t ' + (pilih === i ? 'bg-rose-50' : '')}>
            <div className="text-[8px] font-black text-rose-800 mb-0.5 h-3">{v > 0 ? (v % 1 ? fmt1(v) : v) : ''}</div>
            <div className="w-full max-w-[18px] rounded-t shadow-sm" style={{ height: `${Math.max(v > 0 ? 8 : 2, (v / max) * 100)}%`, background: warna }} />
            <div className={'text-[8px] font-black mt-1 ' + (pilih === i ? 'text-[#003D79]' : 'text-slate-400')}>{i + 1}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

function GarisHari({ series, sampai, onPilih }: { series: { nama: string; warna: string; data: number[] }[]; sampai: number; onPilih?: (i: number) => void }) {
  const [pilih, setPilih] = useState<number | null>(sampai > 0 ? sampai - 1 : 0)
  const n = Math.max(1, sampai)
  const sliced = series.map((s) => ({ ...s, data: potongHari(s.data, n) }))
  const max = Math.max(1, ...sliced.flatMap((s) => s.data))
  const W = Math.max(560, n * 36)
  const H = 200
  const padL = 36, padR = 12, padT = 16, padB = 28
  function X(i: number) { return padL + (n === 1 ? 0 : (i * (W - padL - padR)) / (n - 1)) }
  function Y(v: number) { return padT + (1 - v / max) * (H - padT - padB) }
  const idx = pilih == null ? n - 1 : Math.min(pilih, n - 1)
  return (
    <div className="px-2 pb-3">
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[560px] h-52 select-none">
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const y = Y(max * t)
            return (
              <g key={t}>
                <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="#edf1f5" strokeWidth="1" />
                <text x={padL - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#94a3b8">{fmt1(max * t)}</text>
              </g>
            )
          })}
          {pilih != null && (
            <line x1={X(idx)} x2={X(idx)} y1={padT} y2={H - padB} stroke="#003D79" strokeWidth="1.5" strokeDasharray="4 3" />
          )}
          {sliced.map((s) => {
            const d = s.data.map((v, i) => `${i === 0 ? 'M' : 'L'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')
            const area = `${d} L${X(s.data.length - 1).toFixed(1)},${H - padB} L${X(0).toFixed(1)},${H - padB} Z`
            return (
              <g key={s.nama}>
                <path d={area} fill={s.warna} opacity="0.08" />
                <path d={d} fill="none" stroke={s.warna} strokeWidth="2.8" strokeLinejoin="round" strokeLinecap="round" />
                {s.data.map((v, i) => (
                  <circle key={i} cx={X(i)} cy={Y(v)} r={idx === i ? 5.5 : 3.2} fill="#fff" stroke={s.warna} strokeWidth={idx === i ? 3 : 2} />
                ))}
              </g>
            )
          })}
          {Array.from({ length: n }, (_, i) => (
            <g key={'h' + i}>
              <rect x={X(i) - 14} y={padT} width="28" height={H - padT - padB} fill="transparent" className="cursor-pointer"
                onClick={() => { setPilih(i); onPilih?.(i) }} />
              <text x={X(i)} y={H - 8} textAnchor="middle" fontSize="9" fontWeight="700" fill={idx === i ? '#003D79' : '#94a3b8'}>{i + 1}</text>
            </g>
          ))}
        </svg>
      </div>
      <div className="flex flex-wrap gap-2 px-1 mt-1">
        {sliced.map((s) => (
          <span key={s.nama} className="inline-flex items-center gap-1.5 text-[10px] font-black text-slate-600 bg-slate-50 border border-slate-100 rounded-full px-2 py-0.5">
            <i className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: s.warna }} /> {s.nama}
          </span>
        ))}
      </div>
    </div>
  )
}

function OutlookBaris({ aktual, outlook, target, satuan, fmtNilai }: {
  aktual: number; outlook: number; target: number | null; satuan: string
  fmtNilai: (n: number) => string
}) {
  const max = Math.max(aktual, outlook, target || 0, 1)
  const pctAkt = target ? (aktual / target) * 100 : null
  const pctOut = target ? (outlook / target) * 100 : null
  const rows: [string, number, string][] = [
    ['Aktual MTD', aktual, '#0a5bd3'],
    ['Outlook EOM', outlook, '#199b8c'],
  ]
  if (target) rows.push(['Target bulan', target, '#94a3b8'])
  return (
    <div className="px-3 pb-3 space-y-2">
      {rows.map(([n, v, c]) => (
        <div key={n}>
          <div className="flex justify-between text-[10px] font-bold text-slate-500">
            <span>{n}</span>
            <span className="tabular-nums font-black text-[#153b61]">{fmtNilai(v)}{satuan ? ` ${satuan}` : ''}</span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden mt-0.5">
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, (v / max) * 100)}%`, background: c }} />
          </div>
        </div>
      ))}
      {target != null && target > 0 ? (
        <div className="text-[10px] text-slate-500">
          Aktual {fmt1(pctAkt)}% dari target · Outlook {fmt1(pctOut)}% dari target
        </div>
      ) : aktual > 0 ? (
        <div className="text-[10px] text-slate-500">
          Outlook vs aktual {outlook >= aktual ? '▲ +' : '▼ '}{fmt1(Math.abs(((outlook - aktual) / aktual) * 100))}%
        </div>
      ) : null}
    </div>
  )
}

function DonatEmpat({ irisan, sub }: { irisan: { nama: string; nilai: number; warna: string }[]; sub: string }) {
  const tot = irisan.reduce((s, x) => s + Math.max(0, x.nilai), 0) || 1
  let a = -90
  const R = 34, C = 44
  const path = (mulai: number, lebar: number) => {
    if (lebar >= 359.9) return `M ${C} ${C - R} A ${R} ${R} 0 1 1 ${C - 0.01} ${C - R} Z`
    const r1 = (mulai * Math.PI) / 180, r2 = ((mulai + lebar) * Math.PI) / 180
    const x1 = C + R * Math.cos(r1), y1 = C + R * Math.sin(r1)
    const x2 = C + R * Math.cos(r2), y2 = C + R * Math.sin(r2)
    return `M ${C} ${C} L ${x1} ${y1} A ${R} ${R} 0 ${lebar > 180 ? 1 : 0} 1 ${x2} ${y2} Z`
  }
  const pctStr = (n: number) => n.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return (
    <div className="flex flex-col items-center gap-2 px-2 py-2">
      <svg viewBox="0 0 88 88" className="w-36 h-36">
        {irisan.map((x) => {
          const lebar = (Math.max(0, x.nilai) / tot) * 360
          if (lebar < 0.2) return <g key={x.nama} />
          const d = path(a, lebar)
          a += lebar
          return <path key={x.nama} d={d} fill={x.warna} />
        })}
        <circle cx={C} cy={C} r="18" fill="#fff" />
        <text x={C} y={C - 1} textAnchor="middle" fontSize="10" fontWeight="800" fill="#153b61">100%</text>
        <text x={C} y={C + 11} textAnchor="middle" fontSize="7" fill="#94a3b8">{sub}</text>
      </svg>
      <div className="w-full space-y-1">
        {irisan.map((x) => {
          const pct = (Math.max(0, x.nilai) / tot) * 100
          return (
            <div key={x.nama} className="flex items-center justify-between text-[10px] gap-2">
              <span className="inline-flex items-center gap-1.5 font-bold text-slate-600">
                <i className="w-2 h-2 rounded-full inline-block" style={{ background: x.warna }} /> {x.nama}
              </span>
              <span className="tabular-nums font-black" style={{ color: x.warna }}>{fmt1(x.nilai)} jam · {pctStr(pct)}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BatangFc({ list, satuan }: { list: { kode: string; nilai: number | null; target?: number | null }[]; satuan: string }) {
  const [pilih, setPilih] = useState<string | null>(null)
  const nums = list.map((x) => Number(x.nilai || 0))
  const max = Math.max(...nums, ...list.map((x) => Number(x.target || 0)), 0.01)
  const H = 120
  const satu = list.find((x) => x.kode === pilih) || list[0]
  return (
    <div className="px-2 pb-3">
      <div className="overflow-x-auto">
        <div className="relative" style={{ minWidth: Math.max(280, list.length * 40), height: H + 44 }}>
          <div className="absolute inset-x-0 bottom-10 flex items-end gap-1" style={{ height: H }}>
            {list.map((x) => {
              const v = Number(x.nilai || 0)
              const t = x.target != null ? Number(x.target) : null
              const over = t != null && t > 0 && v > t
              return (
                <button key={x.kode} type="button" onClick={() => setPilih(x.kode)}
                  className="flex-1 min-w-[28px] h-full flex flex-col justify-end items-center relative">
                  {t != null && t > 0 && (
                    <i className="absolute left-0 right-0 border-t border-dashed border-rose-400 pointer-events-none" style={{ bottom: `${(t / max) * 100}%` }} />
                  )}
                  <span className="text-[8px] font-black tabular-nums mb-0.5" style={{ color: over ? '#e11d48' : '#64748b' }}>{v ? fmt1(v) : '—'}</span>
                  <div className="w-[70%] rounded-t" style={{ height: `${(v / max) * 100}%`, minHeight: v ? 4 : 0, background: over ? '#e11d48' : pilih === x.kode ? '#003D79' : '#7eb8e8' }} />
                </button>
              )
            })}
          </div>
          <div className="absolute inset-x-0 bottom-0 flex gap-1 h-10 overflow-visible">
            {list.map((x) => (
              <div key={x.kode} className="flex-1 min-w-[28px] relative">
                <span className="absolute left-0 top-1 text-[8px] font-bold italic whitespace-nowrap origin-top-left text-slate-500"
                  style={{ transform: 'rotate(-38deg)' }}>{x.kode}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {satu && (
        <div className="mt-1 text-[11px] text-slate-600">{satu.kode}: <b className="text-[#153b61]">{satu.nilai != null ? fmt1(Number(satu.nilai)) : '—'} {satuan}</b>
          {satu.target != null ? ` · target ${fmt1(Number(satu.target))}` : ''}</div>
      )}
    </div>
  )
}

export default function TampilanFix({ d, bulan }: { d: any; bulan: string }) {
  const [filter, setFilter] = useState('Semua')
  const [hoverOp, setHoverOp] = useState<any>(null)
  const [cekAll, setCekAll] = useState(false)
  const [klikHari, setKlikHari] = useState<number | null>(null)

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
  const kHari = (d.komposisi_hari || [])[klikHari ?? -1]
  const kPakai = kHari || d.komposisi_mtd || {}
  const irisan24 = [
    { nama: 'HM', nilai: Number(kPakai.hm || 0), warna: '#0a5bd3' },
    { nama: 'NO', nilai: Number(kPakai.tanpa_op || 0), warna: '#7c3aed' },
    { nama: 'BD', nilai: Number(kPakai.bd || 0), warna: '#e11d48' },
    { nama: 'Standby', nilai: Number(kPakai.stb || 0), warna: '#d09534' },
  ]
  const jamKal = irisan24.reduce((s, x) => s + x.nilai, 0)
  const fcUnit = units.map((u: any) => ({
    kode: u.kode,
    nilai: u.mtd > 0 && u.fuel_total != null ? Number(u.fuel_total) / Number(u.mtd) : null,
    target: null as number | null,
  }))
  const fcEgi = (d.per_egi || []).map((e: any) => ({
    kode: e.egi,
    nilai: e.fc,
    target: e.fc_target,
  }))

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
          { l: 'Revenue / Pendapatan',
            v: fmtRp(d.revenue_total),
            s: '',
            f: d.revenue_unit_isi ? `${d.revenue_unit_isi} unit ber-tarif · HM × tarif unit` : 'Isi tarif per unit di Pengaturan' },
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
        <Panel judul="Revenue / Pendapatan" desc="HM unit × tarif Rp/HM unit itu. Hanya unit yang tarifnya diisi." tag={d.revenue_unit_isi ? `${d.revenue_unit_isi} UNIT` : 'ISI TARIF'}>
          {d.revenue_total ? (
            <>
              <div className="px-3 pb-1 text-[20px] font-black text-[#153b61]">{fmtRp(d.revenue_total)} <small className="text-[11px] text-slate-400 font-bold">aktual MTD</small></div>
              <BatangHari data={(d.per_hari_rev || []).map((x: number) => x / 1e6)} warna="#199b8c" sampai={hariTerisi || 1} />
              <p className="px-3 pb-2 text-[9px] text-slate-400">Batang = juta Rp per hari (tanggal berjalan). Outlook bulan {fmtRp(d.outlook_revenue)}.</p>
            </>
          ) : (
            <div className="h-24 grid place-items-center text-[11px] text-slate-500 px-4 text-center">
              Kosong karena belum ada tarif per unit. Buka Import → Pengaturan → B. isi Rp/HM tiap unit → Simpan.
            </div>
          )}
        </Panel>
      </div>

      <Blok no="00" judul="Outlook bulan berjalan" sub="Proyeksi s.d. akhir bulan = (aktual ÷ hari terisi) × hari kalender. Bukan target." />
      <div className="grid gap-2.5 md:grid-cols-2">
        <Panel judul="Outlook HM" desc={`01–${String(Math.max(1, hariTerisi)).padStart(2, '0')} terisi · sisa ${Math.max(0, hariBulan - hariTerisi)} hari`} tag="HM">
          <OutlookBaris
            aktual={Number(d.total_hm || 0)}
            outlook={Number(d.outlook_hm || d.estimasi || 0)}
            target={targetJam}
            satuan="HM"
            fmtNilai={fmt1}
          />
        </Panel>
        <Panel judul="Outlook pendapatan" desc="Sama rumus laju, pakai revenue aktual (unit ber-tarif)." tag="RP">
          {d.revenue_total ? (
            <OutlookBaris
              aktual={Number(d.revenue_total || 0)}
              outlook={Number(d.outlook_revenue || 0)}
              target={null}
              satuan=""
              fmtNilai={(n) => fmtRp(n)}
            />
          ) : (
            <p className="px-3 pb-3 text-[11px] text-slate-500">Isi tarif per unit dulu agar outlook pendapatan terhitung.</p>
          )}
        </Panel>
      </div>

      <Blok no="02b" judul="Perbandingan harian" sub="Empat garis jam TS Opt: HM, BD, No Opt, Standby. Sama sumber dengan donat. Bukan jumlah unit, bukan PA/MA/UA." />
      <div className="grid gap-2.5 lg:grid-cols-[1.6fr_1fr]">
        <Panel judul="Perbandingan harian" desc={`Jam per tanggal 01–${String(Math.max(1, hariTerisi)).padStart(2, '0')} ${labelBulan(bulan)}. Klik tanggal → donat hari itu (24 jam/unit).`}>
          <GarisHari
            sampai={hariTerisi || 1}
            onPilih={(i) => setKlikHari(i)}
            series={[
              { nama: 'HM', warna: '#0a5bd3', data: (d.komposisi_hari || []).map((x: any) => Number(x?.hm || 0)) },
              { nama: 'BD', warna: '#e11d48', data: (d.komposisi_hari || []).map((x: any) => Number(x?.bd || 0)) },
              { nama: 'No Opt', warna: '#7c3aed', data: (d.komposisi_hari || []).map((x: any) => Number(x?.tanpa_op || 0)) },
              { nama: 'Standby', warna: '#d09534', data: (d.komposisi_hari || []).map((x: any) => Number(x?.stb || 0)) },
            ]}
          />
        </Panel>
        <Panel
          judul={klikHari == null ? 'Donat waktu 24 jam · MTD' : `Donat waktu 24 jam · tgl ${String(klikHari + 1).padStart(2, '0')}`}
          desc="HM = jam operasi. BD = jam kolom X, atau sisa 12 jam jika ada Catatan Breakdown. NO = jam kolom W, atau sisa 12 jam jika nama operator kosong. Sisa → Standby. Bukan PA/MA/UA."
          tag="24 JAM"
        >
          <DonatEmpat irisan={irisan24} sub="24 jam" />
          <p className="px-3 pb-1 text-[9px] text-slate-400">Total {fmt1(jamKal)} jam · {klikHari == null ? `${d.unit_hari || 0} unit-hari × 24` : 'unit hari itu × 24'} = 100%.</p>
          <div className="px-3 pb-3 grid grid-cols-2 gap-1.5 text-[10px]">
            {irisan24.map((x) => {
              const pct = jamKal ? (x.nilai / jamKal) * 100 : 0
              return (
                <div key={x.nama} className="rounded-lg bg-slate-50 border border-slate-100 px-2 py-1.5">
                  <div className="text-[9px] font-bold text-slate-400">{x.nama}</div>
                  <div className="text-[14px] font-black tabular-nums" style={{ color: x.warna }}>{fmt1(x.nilai)} <span className="text-[10px] font-bold text-slate-400">jam</span></div>
                  <div className="text-[10px] font-black text-slate-500">{pct.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</div>
                </div>
              )
            })}
          </div>
        </Panel>
      </div>

      <Blok no="03" judul="PA, UA, BD" sub="PA per unit miring. UA harian tanpa garis. BD = unit ber-catatan." />
      <Panel judul="PA per unit" desc={`Nama unit miring. Garis merah = acuan PA ${fmt1(paAcu)}%. Klik batang.`} tag="PER UNIT">
        <BatangPaUnit units={units} ambang={paAcu} />
      </Panel>
      <div className="mt-2.5">
        <Panel judul="Actual UA / Day" desc="UA dipantau, tanpa garis acuan." tag="DIPANTAU">
          <BatangTargetHari data={d.per_hari_ua || []} ambang={null} sampai={hariTerisi || 1} />
        </Panel>
      </div>
      <div className="mt-2.5">
        <Panel judul="Total Breakdown stop operasi per hari" desc={`Hanya tanggal berjalan. Merah = unit ada Catatan BD, bukan jam BD.`} tag="BATANG">
          <BatangHari data={d.per_hari_bd_unit || []} warna="#e11d48" sampai={hariTerisi || 1} />
        </Panel>
      </div>

      <Blok no="03b" judul="Ringkasan unit" sub={`${units.length} unit · acuan PA ${fmt1(paAcu)} / MA ${fmt1(maAcu)} · UA dipantau`} />
      <Panel judul="Ringkasan unit" desc="HM, PA, MA, UA tiap unit dari TS Opt." tag="TS OPT">
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

      <Blok no="04" judul="Review performa mingguan" sub="Bandingkan minggu ini vs minggu lalu dari TS Opt yang sama." />
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
      <Panel judul="Perbandingan minggu ini vs minggu lalu" desc="Hanya muncul jika kedua minggu ada di import TS Opt." tag="REVIEW">
        <WeeklyCompare minggu={minggu} bulan={bulan} />
      </Panel>
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

      <Blok no="04b" judul="FC" sub="Diagram batang. EGI dulu, unit di bawah. Merah = di atas target EGI." />
      <Panel judul="FC per EGI" desc="Batang L/HM. Garis putus = target EGI. Klik batang." tag="BATANG">
        {fcEgi.length ? <BatangFc list={fcEgi} satuan="L/HM" /> : <p className="px-3 pb-3 text-[11px] text-slate-500">Belum ada data FC EGI.</p>}
      </Panel>
      <div className="mt-2.5">
        <Panel judul="FC per unit" desc="Fuel ÷ HM unit. Nama unit miring. Klik batang." tag="PER UNIT">
          {fcUnit.some((x: any) => x.nilai != null) ? <BatangFc list={fcUnit} satuan="L/HM" /> : <p className="px-3 pb-3 text-[11px] text-slate-500">Fuel unit belum terbaca dari import.</p>}
        </Panel>
      </div>

      <Blok no="06" judul="Papan HM per operator" sub="Arahkan mouse ke tanggal/HM: tooltip HM awal, HM akhir, total, unit. Bukan panel di bawah tabel." />
      <Panel judul="Papan HM per operator" desc="Garis per nama. Diurutkan HM tertinggi. Sel kosong = belum ada baris TS Opt." tag="TS OPT">
        <div className="flex gap-1 px-3 pb-2 flex-wrap items-center">
          {['Semua', 'Excavator', 'Bulldozer', 'Grader'].map((j) => (
            <button key={j} onClick={() => { setFilter(j); setHoverOp(null) }}
              className={'px-2 py-1 rounded-lg text-[9px] font-black uppercase ' + (filter === j ? 'bg-[#003D79] text-white' : 'bg-slate-100 text-slate-500')}>
              {j}
            </button>
          ))}
          <span className="ml-auto text-[9px] text-slate-400">{ops.length} baris</span>
        </div>
        {hoverOp && (
          <div className="mx-3 mb-2 rounded-lg border border-[#c7dbef] bg-white shadow-sm px-3 py-2 text-[11px] pointer-events-none">
            <div className="font-black text-[#183d63]">{hoverOp.op.nama} · unit {hoverOp.op.unit} · tgl {String(hoverOp.day).padStart(2, '0')}</div>
            {hoverOp.items.map((h: any, i: number) => (
              <div key={i} className="flex justify-between gap-3 text-slate-600">
                <span>Shift {h.shift}</span>
                <span>HM awal {fmt1(h.awal)} → HM akhir {fmt1(h.akhir)} · total {fmt1(h.hm)}</span>
              </div>
            ))}
          </div>
        )}
        <div className="overflow-x-auto max-h-[420px]">
          <table className="text-[9px] border-collapse w-full">
            <thead className="bg-[#0a5bd3] text-white sticky top-0 z-20">
              <tr>
                <th className="px-1 py-1">#</th>
                <th className="px-1 py-1 text-left min-w-[110px] sticky left-0 bg-[#0a5bd3] z-30">Nama</th>
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
                const bg = i % 2 ? 'bg-slate-50' : 'bg-white'
                return (
                  <tr key={o.nama + o.unit + i} className={bg + ' border-b border-slate-300'}>
                    <td className="px-1 py-1 font-black border-b border-slate-300">{i + 1}</td>
                    <td className={'px-1 py-1 font-black whitespace-nowrap sticky left-0 z-10 border-b border-slate-300 ' + bg}>{o.nama}</td>
                    <td className="px-1 py-1 whitespace-nowrap text-[#155b9c] font-black border-b border-slate-300">{o.unit}</td>
                    <td className="px-1 py-1 text-right font-black tabular-nums border-b border-slate-300">{fmt1(o.hm)}</td>
                    <td className={'px-1 py-1 text-right tabular-nums border-b border-slate-300 ' + (delta < 0 ? 'text-amber-700' : 'text-emerald-700')}>
                      {avg ? (delta >= 0 ? '+' : '') + fmt1(delta) : '-'}
                    </td>
                    {days.map((day) => {
                      const items = isiHari(o, day)
                      const hm = items.reduce((s: number, h: any) => s + Number(h.hm || 0), 0)
                      const on = hoverOp && hoverOp.op === o && hoverOp.day === day
                      if (!items.length) return <td key={day} className="text-center text-slate-200 border-b border-slate-300">·</td>
                      return (
                        <td key={day}
                          onMouseEnter={() => setHoverOp({ op: o, day, items })}
                          onMouseLeave={() => setHoverOp(null)}
                          className={'text-center tabular-nums font-black cursor-default border-b border-slate-300 ' + (on ? 'bg-[#003D79] text-white' : 'bg-amber-50 text-[#173e63]')}>
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
      </Panel>
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

    </div>
  )
}
