'use client';

import React from 'react';
import AppFooter from '../AppFooter';

/**
 * 📐 StdPage — Pembungkus baku SEMUA halaman dashboard.
 *
 * Mengunci aturan tata letak dari dokumen handover:
 *  - Side margin normal  : px-3 max-w-lg mx-auto
 *  - Top margin rapat    : pt-2
 *  - Footer TUNGGAL      : menempel mt-6 tepat di bawah konten terakhir,
 *                          BUKAN melayang di dasar viewport.
 *  - Ruang aman bawah    : pb-24 supaya tidak tertutup MobileBottomNav.
 *
 * Pemakaian:
 *   <StdPage>
 *     ...konten...
 *   </StdPage>
 */

type Props = {
  children: React.ReactNode;
  /**
   * Tampilkan footer BTM di dalam halaman.
   *
   * ⚠️ DEFAULT false — karena app/dashboard/layout.tsx SUDAH merender <AppFooter />
   * untuk semua halaman dashboard. Menyalakan ini di halaman dashboard akan
   * membuat FOOTER DOBEL (masalah yang tercatat di dokumen handover).
   *
   * Nyalakan hanya untuk halaman DI LUAR /dashboard yang tidak punya layout footer.
   */
  footer?: boolean;
  /** Lebar maksimum. 'lg' = mobile-first (default), 'full' = halaman tabel lebar. */
  width?: 'lg' | 'xl' | 'full';
  className?: string;
};

const W = {
  lg: 'max-w-lg',
  xl: 'max-w-3xl',
  full: 'max-w-none',
};

export default function StdPage({ children, footer = false, width = 'lg', className = '' }: Props) {
  return (
    <div className={`w-full ${W[width]} mx-auto px-3 pt-2 pb-24 ${className}`}>
      <div className="flex flex-col gap-2.5">{children}</div>
      {footer && <AppFooter />}
    </div>
  );
}
