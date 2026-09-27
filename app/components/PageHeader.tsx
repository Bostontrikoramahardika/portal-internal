'use client';

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
      try { router.back(); } catch { router.push('/dashboard'); }
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-[#003d79] text-white border-b-2 border-[#002a57]">
      <div className="flex items-center justify-between px-3 sm:px-4 py-3">
        {/* Left: Back + Title */}
        <div className="flex items-center gap-3 min-w-0">
          {showBack && (
            <button
              onClick={handleBack}
              className="flex-shrink-0 w-9 h-9 bg-white/15 hover:bg-white/25 rounded-[10px] flex items-center justify-center transition-colors"
              aria-label="Kembali"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {icon && <span className="flex-shrink-0">{icon}</span>}
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight truncate">{title}</h1>
              {badge && (
                <span className="flex-shrink-0 bg-white/20 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {badge}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-[11px] text-white/70 font-medium mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Right */}
        {rightElement && (
          <div className="flex-shrink-0 ml-2">{rightElement}</div>
        )}
      </div>
    </header>
  );
}
