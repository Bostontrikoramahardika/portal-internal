'use client';

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
