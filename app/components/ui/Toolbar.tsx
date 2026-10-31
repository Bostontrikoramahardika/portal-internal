'use client'

// app/components/ui/Toolbar.tsx
// Tab + filter + tombol aksi dalam SATU baris (hemat tinggi ±180px).
// Dipakai di semua halaman supaya strukturnya seragam.

import React from 'react'

export type TabItem = { id: string; label: string; badge?: number | string }

type Props = {
  tabs?: TabItem[]
  activeTab?: string
  onTab?: (id: string) => void
  actions?: React.ReactNode
  onReset?: () => void
  children?: React.ReactNode // isi filter
}

export default function Toolbar({ tabs, activeTab, onTab, actions, onReset, children }: Props) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(11,21,36,0.04)]">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 px-2 py-1.5">
        {tabs && tabs.length > 0 && (
          <>
            <div className="flex rounded-md border border-slate-200 bg-slate-100 p-0.5">
              {tabs.map((t) => {
                const aktif = activeTab === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onTab?.(t.id)}
                    className={
                      'flex h-6 items-center gap-1 rounded px-2.5 text-[10px] font-extrabold transition-all ' +
                      (aktif
                        ? 'bg-white text-[#003D79] shadow-[0_1px_2px_rgba(11,21,36,0.10)]'
                        : 'text-slate-500 hover:text-[#003D79]')
                    }
                  >
                    {t.label}
                    {t.badge !== undefined && Number(t.badge) > 0 ? (
                      <span
                        className={
                          'rounded-full px-1 text-[8px] font-black ' +
                          (aktif ? 'bg-[#E0EDFB] text-[#0A4A8F]' : 'bg-slate-200 text-slate-500')
                        }
                      >
                        {t.badge}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
            <div className="mx-0.5 h-5 w-px bg-slate-200" />
          </>
        )}

        {children}

        {onReset ? (
          <button
            type="button"
            onClick={onReset}
            className="ml-auto text-[10px] font-extrabold text-slate-400 transition-colors hover:text-rose-600"
          >
            Reset ✕
          </button>
        ) : null}

        {actions ? <div className="flex flex-wrap items-center gap-1.5">{actions}</div> : null}
      </div>
    </div>
  )
}

/* ── potongan kecil yang dipakai berulang ── */
export function FilterBox({
  label,
  children,
  className = '',
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label
      className={
        'flex h-6 items-center gap-1 rounded border border-slate-300 bg-white px-1.5 ' +
        'focus-within:border-[#003D79] focus-within:ring-2 focus-within:ring-[#003D79]/15 ' +
        className
      }
    >
      <span className="text-[8px] font-black uppercase tracking-wide text-slate-400">{label}</span>
      {children}
    </label>
  )
}

export function ToolBtn({
  children,
  onClick,
  tone = 'light',
  disabled,
  title,
}: {
  children: React.ReactNode
  onClick?: () => void
  tone?: 'light' | 'navy' | 'teal' | 'amber' | 'rose' | 'icon'
  disabled?: boolean
  title?: string
}) {
  const gaya: Record<string, string> = {
    light: 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
    navy: 'border-[#003D79] bg-[#003D79] text-white hover:bg-[#004b95]',
    teal: 'border-[#0E9384] bg-[#0E9384] text-white hover:bg-[#0b7b6e]',
    amber: 'border-[#F3D19B] bg-[#FFF8EC] text-[#8A5300] hover:bg-[#FFF1DA]',
    rose: 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100',
    icon: 'border-slate-300 bg-white text-[#003D79] hover:bg-slate-50 w-6 px-0 justify-center',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={
        'inline-flex h-6 items-center gap-1 whitespace-nowrap rounded border px-2 text-[10px] font-extrabold ' +
        'transition-colors active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ' +
        gaya[tone]
      }
    >
      {children}
    </button>
  )
}
