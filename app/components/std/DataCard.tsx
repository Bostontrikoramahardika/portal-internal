'use client';

import React from 'react';
import { renderIcon, type IcoName } from './icons';

/**
 * 🗂️ DataCard — kartu baris data standar (pengganti kartu buatan tangan di tiap halaman).
 *
 * Struktur:
 *   [ikon]  [badge status] [judul]          →  baris meta (label : nilai)
 *           [subjudul]                          + tombol aksi opsional
 */

export type BadgeTone = 'pending' | 'done' | 'info' | 'danger' | 'neutral';

const TONE: Record<BadgeTone, string> = {
  pending: 'bg-amber-100 text-amber-700',
  done: 'bg-emerald-100 text-emerald-700',
  info: 'bg-sky-100 text-sky-700',
  danger: 'bg-red-100 text-red-700',
  neutral: 'bg-slate-100 text-slate-600',
};

const ICON_BG: Record<BadgeTone, string> = {
  pending: 'bg-amber-50',
  done: 'bg-emerald-50',
  info: 'bg-sky-50',
  danger: 'bg-red-50',
  neutral: 'bg-slate-50',
};

const ICON_FG: Record<BadgeTone, string> = {
  pending: '#f59e0b',
  done: '#10b981',
  info: '#0369a1',
  danger: '#ef4444',
  neutral: '#64748b',
};

export type MetaRow = { label: string; value: React.ReactNode };

type Props = {
  title: string;
  subtitle?: string;
  badge?: string;
  tone?: BadgeTone;
  icon?: React.ReactNode | IcoName;
  meta?: MetaRow[];
  actions?: React.ReactNode;
  onClick?: () => void;
  dimmed?: boolean;
};

export default function DataCard({
  title,
  subtitle,
  badge,
  tone = 'neutral',
  icon,
  meta,
  actions,
  onClick,
  dimmed = false,
}: Props) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-slate-100 bg-white p-3 shadow-sm transition-all
        ${onClick ? 'cursor-pointer hover:shadow-md active:scale-[.995]' : ''}
        ${dimmed ? 'opacity-50 pointer-events-none' : ''}`}
    >
      <div className="flex items-start gap-2.5">
        {icon && (
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${ICON_BG[tone]}`}
          >
            {renderIcon(icon, ICON_FG[tone], 18)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {badge && (
              <span
                className={`rounded-full px-2 py-0.5 text-[7.5px] font-black uppercase tracking-[0.1em] ${TONE[tone]}`}
              >
                {badge}
              </span>
            )}
            <h3 className="truncate text-[12px] font-extrabold text-slate-900">{title}</h3>
          </div>

          {subtitle && (
            <p className="mt-0.5 truncate text-[9px] font-bold uppercase tracking-[0.08em] text-slate-400">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {meta && meta.length > 0 && (
        <div className="mt-2.5 rounded-xl bg-slate-50/80 px-2.5 py-2">
          {meta.map((m, i) => (
            <div key={i} className="flex items-center justify-between py-0.5 text-[9.5px]">
              <span className="font-black uppercase tracking-[0.1em] text-slate-400">{m.label}</span>
              <span className="font-extrabold text-slate-700">{m.value}</span>
            </div>
          ))}
        </div>
      )}

      {actions && <div className="mt-2.5 flex gap-2">{actions}</div>}
    </div>
  );
}
