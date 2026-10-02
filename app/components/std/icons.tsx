'use client';

import React from 'react';

/**
 * 🎨 STD ICONS — SVG line icon standar BTM
 *
 * Sesuai DESIGN-SYSTEM.md: "✅ DO: Pakai SVG line icon".
 * Emoji TETAP didukung di seluruh komponen std (prop icon menerima ReactNode
 * maupun string emoji), jadi halaman lama yang masih pakai 📊 tidak rusak.
 *
 * Pemakaian:
 *   <Ico.Chart />            → warna ikut teks induk
 *   <Ico.Palm c="#f59e0b" /> → warna khusus
 */

type P = { size?: number; c?: string; sw?: number; className?: string };

function S({ size = 18, c = 'currentColor', sw = 2.2, className = '', children }: P & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const Ico = {
  /** 📊 statistik / semua */
  Chart: (p: P) => <S {...p}><path d="M18 20V10M12 20V4M6 20v-6" /></S>,
  /** 🌴 cuti */
  Palm: (p: P) => <S {...p}><path d="M12 22V12" /><path d="M12 12c0-4 3-7 7-7-1 4-3 7-7 7Z" /><path d="M12 12C12 8 9 5 5 5c1 4 3 7 7 7Z" /></S>,
  /** ⏱️ lembur / jam */
  Clock: (p: P) => <S {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></S>,
  /** 🙁 sakit */
  Sick: (p: P) => <S {...p}><circle cx="12" cy="12" r="9" /><path d="M8 15.5c1-1 2.3-1.5 4-1.5s3 .5 4 1.5" /><path d="M9 9h.01M15 9h.01" /></S>,
  /** ⚠️ peringatan / izin potongan */
  Warn: (p: P) => <S {...p}><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></S>,
  /** ✅ izin berbayar / setuju (kotak) */
  CheckBox: (p: P) => <S {...p}><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M8 12.5l2.5 2.5L16 9.5" /></S>,
  /** ✔ centang polos */
  Check: (p: P) => <S {...p}><path d="M20 6 9 17l-5-5" /></S>,
  /** ✕ tolak */
  Close: (p: P) => <S {...p}><path d="M18 6 6 18M6 6l12 12" /></S>,
  /** 📋 pengajuan / clipboard */
  Clipboard: (p: P) => <S {...p}><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /></S>,
  /** 📝 revisi / edit-check */
  EditCheck: (p: P) => <S {...p}><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></S>,
  /** 👔 atasan / user */
  User: (p: P) => <S {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></S>,
  /** 👥 tim */
  Users: (p: P) => <S {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.9" /></S>,
  /** 🎖️ PJO / medali */
  Medal: (p: P) => <S {...p}><circle cx="12" cy="8" r="6" /><path d="M8.2 13.9 7 22l5-3 5 3-1.2-8.1" /></S>,
  /** 🔄 refresh */
  Refresh: (p: P) => <S {...p}><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></S>,
  /** 📅 kalender / absensi */
  Calendar: (p: P) => <S {...p}><rect x="3" y="4" width="18" height="18" rx="3" /><path d="M8 2v4M16 2v4M3 10h18" /></S>,
  /** 📄 dokumen */
  Doc: (p: P) => <S {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /></S>,
  /** ⬇ import / unduh */
  Import: (p: P) => <S {...p}><path d="M12 3v12M8 11l4 4 4-4" /><path d="M4 21h16" /></S>,
  /** 🏠 site */
  Home: (p: P) => <S {...p}><path d="M3 21V8l9-5 9 5v13" /><path d="M9 21v-6h6v6" /></S>,
  /** 🌐 semua site */
  Globe: (p: P) => <S {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18" /></S>,
  /** ➕ tambah */
  Plus: (p: P) => <S {...p}><path d="M12 5v14M5 12h14" /></S>,
  /** 🩺 medis / MCU */
  Pulse: (p: P) => <S {...p}><path d="M3 12h4l2 5 4-12 2 7h6" /></S>,
  /** 🎉 selesai / party */
  Party: (p: P) => <S {...p} sw={1.6}><path d="M4 20 9 9l6 6-11 5Z" /><path d="M14 4.5 15 7M19.5 9 17 10M17.8 3.2 16 5" /></S>,
  /** 📭 kosong */
  Inbox: (p: P) => <S {...p} sw={1.6}><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.4 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.4-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.8 1.1Z" /></S>,
};

export type IcoName = keyof typeof Ico;

/** Render ikon dari nama string, emoji, atau elemen React. */
export function renderIcon(icon: React.ReactNode | IcoName, color?: string, size = 18): React.ReactNode {
  if (typeof icon === 'string' && icon in Ico) {
    const C = Ico[icon as IcoName];
    return <C c={color} size={size} />;
  }
  return icon; // emoji atau JSX apa adanya
}
