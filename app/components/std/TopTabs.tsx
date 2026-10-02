'use client';

import React from 'react';
import { renderIcon, type IcoName } from './icons';

/**
 * 🔝 TopTabs — 2 tab besar di paling atas halaman.
 * Contoh: 📋 PENGAJUAN | 📝 REVISI ABSENSI
 */

export type TopTabItem = {
  id: string;
  label: string;
  /** nama ikon std ('Clipboard'), emoji ('📋'), atau JSX */
  icon?: React.ReactNode | IcoName;
  /** angka badge opsional di kanan label */
  count?: number;
};

type Props = {
  tabs: TopTabItem[];
  value: string;
  onChange: (id: string) => void;
  /**
   * Mode untuk tab yang jumlahnya banyak / dinamis dari DB.
   * Tab tidak dipaksa lebar sama, tapi bisa digeser ke samping.
   */
  scroll?: boolean;
};

export default function TopTabs({ tabs, value, onChange, scroll = false }: Props) {
  if (!tabs?.length) return null;

  return (
    <div
      className={
        scroll
          ? 'flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]{display:none}'
          : 'flex gap-2'
      }
    >
      {tabs.map((t) => {
        const on = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`${scroll ? 'shrink-0 px-3' : 'flex-1 px-2'}
              py-2.5 rounded-xl text-[11px] font-extrabold tracking-wide uppercase
              transition-all active:scale-[.98] flex items-center justify-center gap-1.5
              ${on
                ? 'bg-[#0b2a5b] text-white shadow-[0_4px_12px_rgba(11,42,91,.25)]'
                : 'bg-white text-slate-400 border border-slate-100'}`}
          >
            {t.icon ? renderIcon(t.icon, undefined, 13) : null}
            <span className="whitespace-nowrap">{t.label}</span>
            {typeof t.count === 'number' && t.count > 0 && (
              <span
                className={`text-[9px] font-black px-1.5 py-0.5 rounded-full
                  ${on ? 'bg-white/20 text-white' : 'bg-slate-100 text-[#0b2a5b]'}`}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
