const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'app', 'components');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const headerContent = `'use client';

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
    } else {
      if (window.history.length > 1) {
        router.back();
      } else {
        router.push('/dashboard');
      }
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-amber-500/30 text-white shadow-md transition-all">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between gap-3">
        {/* Left Side: Back Button & Titles */}
        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
          {showBack && (
            <button
              onClick={handleBack}
              type="button"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-amber-500 hover:text-slate-950 text-slate-200 border border-slate-700/80 text-xs sm:text-sm font-semibold transition-all shadow-sm active:scale-95 group shrink-0"
              title="Kembali ke halaman sebelumnya"
            >
              <span className="text-amber-400 group-hover:text-slate-950 transition-transform group-hover:-translate-x-0.5 text-sm sm:text-base font-bold">
                ←
              </span>
              <span className="hidden xs:inline">Kembali</span>
            </button>
          )}

          <div className="min-w-0 flex items-center gap-2">
            {icon && <span className="text-xl sm:text-2xl shrink-0">{icon}</span>}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-xl font-bold tracking-tight text-white truncate">
                  {title}
                </h1>
                {badge && (
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-medium shrink-0">
                    {badge}
                  </span>
                )}
              </div>
              {subtitle && (
                <p className="text-[11px] sm:text-xs text-slate-400 truncate mt-0.5 font-normal">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Custom Actions / User Info */}
        {rightElement && (
          <div className="flex items-center gap-2 shrink-0">
            {rightElement}
          </div>
        )}
      </div>
    </header>
  );
}
';

fs.writeFileSync(path.join(targetDir, 'PageHeader.tsx'), headerContent, 'utf8');
console.log('✅ Created app/components/PageHeader.tsx successfully!');
