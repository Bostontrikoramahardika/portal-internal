'use client';

import React from 'react';
import { renderIcon, type IcoName } from './icons';

/**
 * 🔢 FilterGrid — grid filter 3 kolom.
 *
 * ATURAN MUTLAK dari dokumen handover:
 *  "Pada grid filter 3 kolom, angka WAJIB DI SAMPING TEKS (flex-row),
 *   TIDAK BOLEH berada di bawah teks."
 *
 * Maka baris label+angka memakai: flex flex-row items-center justify-center gap-1.5
 * Ikon berada di ATAS baris tersebut (sesuai tampilan produksi v1.7.0).
 */

export type FilterItem = {
  id: string;
  label: string;
  count: number;
  /** nama ikon std ('Palm'), emoji ('🌴'), atau JSX */
  icon?: React.ReactNode | IcoName;
  /** warna ikon saat TIDAK aktif */
  color?: string;
};

type Props = {
  /** judul kecil di atas grid */
  label?: string;
  items: FilterItem[];
  value: string;
  onChange: (id: string) => void;
  /** sembunyikan ikon, hanya label + angka */
  hideIcons?: boolean;
};

export default function FilterGrid({
  label = 'Filter Jenis Pengajuan',
  items,
  value,
  onChange,
  hideIcons = false,
}: Props) {
  if (!items?.length) return null;

  return (
    <div>
      {label && (
        <p className="mb-1.5 ml-1 text-[8.5px] font-black uppercase tracking-[0.18em] text-slate-400">
          {label}
        </p>
      )}

      <div className="grid grid-cols-3 gap-2">
        {items.map((it) => {
          const on = value === it.id;
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => onChange(it.id)}
              className={`rounded-xl border px-1 py-2.5 text-center transition-all active:scale-[.98]
                ${on
                  ? 'border-[#0b2a5b] bg-[#0b2a5b] shadow-[0_5px_14px_rgba(11,42,91,.22)]'
                  : 'border-slate-100 bg-white hover:border-slate-200'}`}
            >
              {!hideIcons && it.icon && (
                <div className="mb-1.5 flex h-5 items-center justify-center">
                  {renderIcon(it.icon, on ? '#ffffff' : it.color || '#64748b', 18)}
                </div>
              )}

              {/* ⬇️ ANGKA DI SAMPING TEKS — jangan diubah jadi flex-col */}
              <div className="flex flex-row items-center justify-center gap-1.5">
                <span
                  className={`text-[8px] font-black uppercase tracking-wide whitespace-nowrap
                    ${on ? 'text-white' : 'text-slate-500'}`}
                >
                  {it.label}
                </span>
                <span
                  className={`text-[12px] font-black leading-none ${on ? 'text-white' : 'text-[#0b2a5b]'}`}
                >
                  {it.count}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
