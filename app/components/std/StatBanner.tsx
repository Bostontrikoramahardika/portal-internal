'use client';

import React from 'react';
import { Ico } from './icons';

/**
 * 🎯 StatBanner — Banner navy utama dengan titik hijau berkedip + tombol REFRESH.
 *
 * Elemen wajib sesuai acuan Approval Center:
 *  - gradient navy
 *  - eyebrow kecil huruf kapital + status dot #00c37a animate-ping
 *  - judul tebal
 *  - subjudul tipis
 *  - tombol refresh di kanan atas
 */

type Props = {
  /** teks kecil di atas judul, cth: "APPROVAL CENTER" */
  eyebrow: string;
  /** judul besar, cth: "Semua Sudah Diproses" */
  title: string;
  /** keterangan di bawah judul */
  subtitle?: string;
  /** tampilkan titik hijau berkedip */
  live?: boolean;
  /** handler tombol refresh; kalau tidak diisi, tombol disembunyikan */
  onRefresh?: () => void;
  refreshing?: boolean;
  /** elemen tambahan di kanan (menggantikan tombol refresh) */
  right?: React.ReactNode;
};

export default function StatBanner({
  eyebrow,
  title,
  subtitle,
  live = true,
  onRefresh,
  refreshing = false,
  right,
}: Props) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-3.5 text-white shadow-[0_6px_20px_rgba(11,42,91,.22)]
                    bg-gradient-to-br from-[#0b2a5b] to-[#123a73]">
      {/* ornamen lingkaran hijau samar */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#00c37a]/15 blur-xl" />

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            {live && (
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00c37a] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00c37a]" />
              </span>
            )}
            <span className="text-[8.5px] font-extrabold uppercase tracking-[0.2em] text-blue-200/90 truncate">
              {eyebrow}
            </span>
          </div>

          <h2 className="text-[15px] font-extrabold leading-tight tracking-tight">{title}</h2>

          {subtitle && (
            <p className="mt-0.5 text-[9.5px] font-medium text-blue-100/70">{subtitle}</p>
          )}
        </div>

        {right ??
          (onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className="shrink-0 flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10
                         px-2.5 py-2 text-[8.5px] font-extrabold uppercase tracking-[0.1em]
                         transition-all hover:bg-white/20 active:scale-95 disabled:opacity-50"
            >
              <Ico.Refresh size={11} c="#bfdbfe" className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
          ))}
      </div>
    </div>
  );
}
