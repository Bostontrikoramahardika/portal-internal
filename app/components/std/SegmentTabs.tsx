'use client';

import React from 'react';
import { renderIcon, type IcoName } from './icons';

/**
 * 🎚️ SegmentTabs — tab peran / lingkup di bawah banner.
 * Contoh: 👔 SEBAGAI ATASAN | 🎖️ SEBAGAI PJO
 *
 * Kalau hanya ada 1 item, otomatis tampil sebagai LABEL (bukan tombol),
 * meniru perilaku Approval Center untuk user single-role.
 */

export type SegItem = {
  id: string;
  label: string;
  icon?: React.ReactNode | IcoName;
};

type Props = {
  items: SegItem[];
  value: string;
  onChange: (id: string) => void;
  /** teks kecil di atas label saat mode single */
  singleCaption?: string;
};

export default function SegmentTabs({ items, value, onChange, singleCaption = 'Approval sebagai' }: Props) {
  if (!items?.length) return null;

  // Mode tunggal → tampil sebagai label informasi
  if (items.length === 1) {
    const it = items[0];
    return (
      <div className="rounded-xl border border-slate-100 bg-white p-2.5 text-center shadow-sm">
        <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{singleCaption}</p>
        <p className="mt-0.5 flex items-center justify-center gap-1.5 text-sm font-black text-[#0b2a5b]">
          {it.icon ? renderIcon(it.icon, '#0b2a5b', 14) : null}
          {it.label}
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      {items.map((it) => {
        const on = value === it.id;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onChange(it.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2
              text-[10px] font-extrabold uppercase tracking-wider transition-all active:scale-[.98]
              ${on
                ? 'bg-[#0b2a5b] text-white shadow-[0_4px_12px_rgba(11,42,91,.22)]'
                : 'bg-white text-slate-400 border border-slate-100'}`}
          >
            {it.icon ? renderIcon(it.icon, undefined, 12) : null}
            <span className="whitespace-nowrap">{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}
