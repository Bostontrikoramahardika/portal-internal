'use client';

import React from 'react';
import { Ico, renderIcon, type IcoName } from './icons';

/**
 * 🎉 EmptyState — kartu "SEMUA BERES!" / "TIDAK ADA DATA".
 * Dipakai juga sebagai state loading & error supaya konsisten.
 */

type Props = {
  /** 'done' = 🎉 semua beres · 'empty' = 📭 tidak ada hasil · 'loading' · 'error' */
  variant?: 'done' | 'empty' | 'loading' | 'error';
  title?: string;
  text?: string;
  icon?: React.ReactNode | IcoName;
};

const PRESET = {
  done:    { title: 'Semua Beres!',        text: 'Tidak ada data yang perlu diproses saat ini' },
  empty:   { title: 'Tidak Ada Hasil',     text: 'Coba pilih filter lain di atas' },
  loading: { title: 'Memuat…',             text: 'Mengambil data dari server' },
  error:   { title: 'Gagal Memuat Data',   text: 'Periksa koneksi lalu coba lagi' },
};

export default function EmptyState({ variant = 'done', title, text, icon }: Props) {
  const p = PRESET[variant];
  const isErr = variant === 'error';

  const defaultIcon =
    variant === 'done' ? <Ico.Party size={40} c="#9aa7b8" />
    : variant === 'empty' ? <Ico.Inbox size={40} c="#9aa7b8" />
    : variant === 'loading' ? <Ico.Clock size={40} c="#9aa7b8" />
    : <Ico.Warn size={40} c="#ef4444" />;

  return (
    <div
      className={`rounded-2xl border border-dashed bg-white px-4 py-9 text-center
        ${isErr ? 'border-red-200' : 'border-slate-200'}`}
    >
      <div className={`mb-2.5 flex justify-center ${variant === 'loading' ? 'animate-pulse' : 'opacity-30'}`}>
        {icon ? renderIcon(icon, undefined, 40) : defaultIcon}
      </div>

      <h3
        className={`text-[11.5px] font-black uppercase tracking-[0.18em]
          ${isErr ? 'text-red-500' : 'text-slate-400'}`}
      >
        {title ?? p.title}
      </h3>

      <p className="mt-1 px-4 text-[9.5px] font-semibold text-slate-300">{text ?? p.text}</p>
    </div>
  );
}
