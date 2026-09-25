const fs = require('fs');
const path = require('path');

const root = process.cwd();

// ============================================================
// 1. UPDATE PageHeader.tsx AGAR TOMBOL BACK SLALU TAMPIL JELAS
// ============================================================
const headerPath = path.join(root, 'app', 'components', 'PageHeader.tsx');

const updatedHeader = `'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backUrl?: string;
  showBack?: boolean;
  rightElement?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: string;
}

export default function PageHeader({
  title,
  subtitle,
  backUrl,
  showBack = true,
  rightElement,
  icon,
  badge,
}: PageHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (backUrl) {
      router.push(backUrl);
    } else if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-900 border-b border-amber-500/40 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 py-2.5 flex items-center justify-between gap-2.5">
        {/* Left Side: Back Button & Title */}
        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
          {showBack && (
            <button
              onClick={handleBack}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-md active:scale-95 shrink-0 border border-amber-400 cursor-pointer"
              title="Kembali ke halaman sebelumnya"
            >
              <span className="text-sm sm:text-base leading-none">←</span>
              <span className="inline font-bold">Kembali</span>
            </button>
          )}

          <div className="min-w-0 flex items-center gap-2">
            {icon && <span className="text-lg sm:text-2xl shrink-0">{icon}</span>}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm sm:text-xl font-bold tracking-tight text-white truncate">
                  {title}
                </h1>
                {badge && (
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-semibold shrink-0">
                    {badge}
                  </span>
                )}
              </div>
              {subtitle && (
                <p className="text-[10px] sm:text-xs text-slate-400 truncate mt-0.5 font-normal">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Side */}
        {rightElement && (
          <div className="flex items-center gap-2 shrink-0">
            {rightElement}
          </div>
        )}
      </div>
    </header>
  );
}
`;

fs.writeFileSync(headerPath, updatedHeader, 'utf8');
console.log('✅ Updated PageHeader.tsx with high-visibility Back Button');

// ============================================================
// 2. PASTIIN PageHeader TERPASANG DI HALAMAN PLANT & INSPEKSI
// ============================================================
const pagesToEnsure = [
  { path: 'app/dashboard/plant/page.tsx', title: 'Plant Dashboard & Operations', backUrl: '/dashboard', badge: 'PLANT' },
  { path: 'app/dashboard/plant/inspeksi/page.tsx', title: 'Form Inspeksi P2H Lapangan', backUrl: '/dashboard/plant', badge: 'INSPEKSI' },
  { path: 'app/dashboard/plant/logistik/page.tsx', title: 'Plant Logistik & Permintaan Part', backUrl: '/dashboard/plant', badge: 'LOGISTIK' },
  { path: 'app/dashboard/logistik/page.tsx', title: 'Logistik Central Portal', backUrl: '/dashboard', badge: 'LOGISTIK' },
  { path: 'app/partbook/admin/page.tsx', title: 'Partbook Admin Console', backUrl: '/parts-catalog', badge: 'ADMIN' },
];

pagesToEnsure.forEach(item => {
  const fullPath = path.join(root, item.path);
  if (!fs.existsSync(fullPath)) return;

  let code = fs.readFileSync(fullPath, 'utf8');

  // Pastikan import PageHeader
  if (!code.includes('import PageHeader')) {
    code = code.replace(
      /^['"]use client['"];?\r?\n?/m,
      `'use client';\n\nimport PageHeader from "@/app/components/PageHeader";\n`
    );
  }

  // Jika belum ada <PageHeader di dalam JSX return, pasang paling atas
  if (!code.includes('<PageHeader')) {
    const pageHeaderJsx = `<PageHeader title="${item.title}" backUrl="${item.backUrl}" badge="${item.badge}" />\n`;
    
    if (code.includes('<main')) {
      code = code.replace(/<main([^>]*)>/, `<main$1>\n        ${pageHeaderJsx}`);
    } else if (code.includes('<div')) {
      code = code.replace(/<div([^>]*)>/, `<div$1>\n      ${pageHeaderJsx}`);
    }
  }

  fs.writeFileSync(fullPath, code, 'utf8');
  console.log(`✅ Verified & injected PageHeader in: ${item.path}`);
});

console.log('\n🎉 Selesai! Tombol Kembali [← Kembali] warna Kuning-Emas sekarang tampil mencolok di seluruh halaman.');
