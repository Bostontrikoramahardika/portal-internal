'use client'

// app/components/ui/HeroBanner.tsx
// Banner biru ringkas (gaya Approval Center) — dipakai di semua halaman.
// Tinggi ±52px, bukan kartu besar: judul + sub + angka ringkas + tombol.

import React from 'react'

export type HeroStat = {
  label: string
  value: React.ReactNode
  tone?: 'green' | 'red' | 'amber' | 'violet' | 'sky' | 'plain'
}

type Props = {
  eyebrow?: string
  judul: string
  sub?: string
  stats?: HeroStat[]
  onRefresh?: () => void
  refreshing?: boolean
  density?: 'normal' | 'rapat' | 'ekstra'
  onDensity?: (v: 'normal' | 'rapat' | 'ekstra') => void
  children?: React.ReactNode
}

const TONE: Record<string, string> = {
  green: 'text-emerald-300',
  red: 'text-rose-300',
  amber: 'text-amber-300',
  violet: 'text-violet-300',
  sky: 'text-sky-300',
  plain: 'text-white',
}

export default function HeroBanner({
  eyebrow = 'Monitoring',
  judul,
  sub,
  stats = [],
  onRefresh,
  refreshing = false,
  density,
  onDensity,
  children,
}: Props) {
  const pilihan: Array<'normal' | 'rapat' | 'ekstra'> = ['normal', 'rapat', 'ekstra']
  const label: Record<string, string> = { normal: 'Normal', rapat: 'Rapat', ekstra: 'Ekstra' }

  return (
    <div className="relative overflow-hidden rounded-xl border border-[#16428c] bg-gradient-to-r from-[#092A5E] via-[#12428A] to-[#16498F] px-3 py-2 text-white shadow-sm">
      {/* cahaya dekoratif */}
      <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-sky-400/20 blur-2xl" />

      <div className="relative flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-[#00df81]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00df81] opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#00df81]" />
            </span>
            {eyebrow}
          </div>
          <h1 className="truncate text-[15px] font-extrabold leading-tight tracking-tight">{judul}</h1>
          {sub ? (
            <p className="truncate text-[10px] font-semibold leading-tight text-blue-100/85">{sub}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {stats.map((s, i) => (
            <div
              key={i}
              className="flex min-w-[54px] flex-col items-center justify-center rounded-md border border-white/15 bg-white/10 px-2 py-1"
            >
              <span className={'text-[13px] font-black leading-none tracking-tight ' + TONE[s.tone || 'plain']}>
                {s.value}
              </span>
              <span className="mt-0.5 text-[7px] font-extrabold uppercase tracking-wider text-blue-100/80">
                {s.label}
              </span>
            </div>
          ))}

          {onDensity ? (
            <div className="flex rounded-md border border-white/20 bg-black/25 p-0.5">
              {pilihan.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onDensity(p)}
                  className={
                    'h-6 rounded px-2 text-[9px] font-extrabold transition-colors ' +
                    ((density || 'normal') === p
                      ? 'bg-white text-[#092A5E] shadow-sm'
                      : 'text-blue-100/80 hover:text-white')
                  }
                >
                  {label[p]}
                </button>
              ))}
            </div>
          ) : null}

          {onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              className="flex h-6 items-center gap-1 rounded-md border border-white/25 bg-white/15 px-2 text-[9.5px] font-extrabold text-white transition-colors hover:bg-white/25 disabled:opacity-50"
              disabled={refreshing}
            >
              <span className={refreshing ? 'animate-spin' : ''}>⟳</span>
              {refreshing ? 'Memuat' : 'Refresh'}
            </button>
          ) : null}

          {children}
        </div>
      </div>
    </div>
  )
}
