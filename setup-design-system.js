const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const log = (msg) => console.log(`  ${msg}`);

// ═══ 1. BACKUP FILE YANG SUDAH ADA ═══
console.log('\n🔒 STEP 1: Backup file existing...');
const backupFiles = [
  'app/components/PageHeader.tsx',
  'app/globals.css'
];
backupFiles.forEach(f => {
  const fp = path.join(ROOT, f);
  if (fs.existsSync(fp)) {
    const bak = fp + '.bak-' + Date.now();
    fs.copyFileSync(fp, bak);
    log(`✅ Backed up: ${f} → ${path.basename(bak)}`);
  }
});

// ═══ 2. BUAT FOLDER ═══
console.log('\n📁 STEP 2: Create directories...');
const dirs = [
  'public/fonts',
  'app/components',
  'app/lib'
];
dirs.forEach(d => {
  const dp = path.join(ROOT, d);
  if (!fs.existsSync(dp)) {
    fs.mkdirSync(dp, { recursive: true });
    log(`✅ Created: ${d}`);
  } else {
    log(`⏭️ Exists: ${d}`);
  }
});

// ═══ 3. UPDATE globals.css (APPEND, bukan overwrite) ═══
console.log('\n🎨 STEP 3: Update globals.css...');
const cssPath = path.join(ROOT, 'app/globals.css');
let existingCss = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';

const btmCss = `

/* ═══════════════════════════════════════════════════════ */
/* BTM DESIGN SYSTEM — NAVY CORPORATE (Auto-generated)   */
/* ═══════════════════════════════════════════════════════ */

/* Font: Plus Jakarta Sans (Local, Offline-ready) */
@font-face {
  font-family: 'Plus Jakarta Sans';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/PlusJakartaSans-Regular.woff2') format('woff2');
}
@font-face {
  font-family: 'Plus Jakarta Sans';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('/fonts/PlusJakartaSans-Medium.woff2') format('woff2');
}
@font-face {
  font-family: 'Plus Jakarta Sans';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url('/fonts/PlusJakartaSans-SemiBold.woff2') format('woff2');
}
@font-face {
  font-family: 'Plus Jakarta Sans';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('/fonts/PlusJakartaSans-Bold.woff2') format('woff2');
}
@font-face {
  font-family: 'Plus Jakarta Sans';
  font-style: normal;
  font-weight: 800;
  font-display: swap;
  src: url('/fonts/PlusJakartaSans-ExtraBold.woff2') format('woff2');
}
@font-face {
  font-family: 'Plus Jakarta Sans';
  font-style: italic;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/PlusJakartaSans-Italic.woff2') format('woff2');
}
@font-face {
  font-family: 'Plus Jakarta Sans';
  font-style: italic;
  font-weight: 500;
  font-display: swap;
  src: url('/fonts/PlusJakartaSans-MediumItalic.woff2') format('woff2');
}

/* Design Tokens */
:root {
  --btm-navy: #003d79;
  --btm-navy-dark: #002a57;
  --btm-navy-deep: #001f3f;
  --btm-navy-light: #0056b3;
  --btm-navy-50: #e8f0f8;
  --btm-navy-100: #d1e1f1;
  --btm-bg: #f4f7fa;
  --btm-card: #ffffff;
  --btm-text: #1a2332;
  --btm-text-sub: #5a6a7e;
  --btm-text-muted: #8896a7;
  --btm-border: #e2e8f0;
  --btm-success: #0d7a3e;
  --btm-success-bg: #e6f5ed;
  --btm-warning: #b45309;
  --btm-warning-bg: #fef3c7;
  --btm-danger: #b91c1c;
  --btm-danger-bg: #fee2e2;
  --btm-info: #0369a1;
  --btm-info-bg: #e0f2fe;
  --btm-radius-sm: 10px;
  --btm-radius-md: 14px;
  --btm-radius-lg: 20px;
  --btm-radius-xl: 24px;
  --btm-shadow-sm: 0 1px 3px rgba(0,61,121,0.06);
  --btm-shadow-md: 0 4px 16px rgba(0,61,121,0.08);
  --btm-shadow-lg: 0 8px 32px rgba(0,61,121,0.12);
  --btm-font: 'Plus Jakarta Sans', 'Segoe UI', system-ui, -apple-system, sans-serif;
}

/* Global Reset */
body {
  font-family: var(--btm-font) !important;
  background: var(--btm-bg);
  color: var(--btm-text);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  letter-spacing: -0.2px;
}

/* Scrollbar halus */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
`;

if (!existingCss.includes('BTM DESIGN SYSTEM')) {
  fs.writeFileSync(cssPath, existingCss + btmCss, 'utf8');
  log('✅ Appended BTM Design System to globals.css');
} else {
  log('⏭️ BTM Design System sudah ada di globals.css');
}

// ═══ 4. DESIGN TOKENS ═══
console.log('\n🎯 STEP 4: Create design-system.ts...');
const designSystem = `'use client';

/**
 * BTM Design System — Navy Corporate
 * Warna utama: #003d79 (sama dengan aplikasi existing)
 * Font: Plus Jakarta Sans (local, offline-ready)
 * Style: Rounded, Elegant, Professional (PAMA-inspired)
 */

export const BTM_COLORS = {
  navy: '#003d79',
  navyDark: '#002a57',
  navyDeep: '#001f3f',
  navyLight: '#0056b3',
  navy50: '#e8f0f8',
  navy100: '#d1e1f1',
  bg: '#f4f7fa',
  card: '#ffffff',
  text: '#1a2332',
  textSub: '#5a6a7e',
  textMuted: '#8896a7',
  border: '#e2e8f0',
  success: '#0d7a3e',
  successBg: '#e6f5ed',
  warning: '#b45309',
  warningBg: '#fef3c7',
  danger: '#b91c1c',
  dangerBg: '#fee2e2',
  info: '#0369a1',
  infoBg: '#e0f2fe',
} as const;

export const BTM_SPACING = {
  xs: '8px',
  sm: '12px',
  md: '16px',
  lg: '20px',
  xl: '24px',
} as const;

export const BTM_RADIUS = {
  sm: '10px',
  md: '14px',
  lg: '20px',
  xl: '24px',
} as const;

export const BTM_SHADOW = {
  sm: '0 1px 3px rgba(0,61,121,0.06)',
  md: '0 4px 16px rgba(0,61,121,0.08)',
  lg: '0 8px 32px rgba(0,61,121,0.12)',
} as const;

export const BTM_FONT = {
  family: "'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif",
  weights: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
} as const;

export const BTM_VERSION = 'V1.7.0';
export const BTM_POWERED = 'rck_Production';

// Tailwind class shortcuts
export const BTM_CLASSES = {
  pageBg: 'bg-[#f4f7fa]',
  card: 'bg-white rounded-[14px] border border-[#e2e8f0] shadow-[0_1px_3px_rgba(0,61,121,0.06)]',
  cardHover: 'hover:shadow-[0_4px_16px_rgba(0,61,121,0.08)] hover:-translate-y-0.5 transition-all duration-200',
  headerBg: 'bg-[#003d79]',
  textPrimary: 'text-[#1a2332]',
  textSecondary: 'text-[#5a6a7e]',
  textMuted: 'text-[#8896a7]',
  btnPrimary: 'bg-[#003d79] hover:bg-[#002a57] text-white font-bold rounded-[20px] px-4 py-2 text-sm transition-colors',
  btnSecondary: 'bg-[#e8f0f8] hover:bg-[#d1e1f1] text-[#003d79] font-semibold rounded-[20px] px-4 py-2 text-sm transition-colors',
  btnDanger: 'bg-[#b91c1c] hover:bg-[#991b1b] text-white font-semibold rounded-[20px] px-4 py-2 text-sm transition-colors',
  btnGhost: 'bg-transparent hover:bg-[#e8f0f8] text-[#5a6a7e] font-medium rounded-[20px] px-3 py-2 text-sm transition-colors',
  badgePending: 'bg-[#fef3c7] text-[#b45309] text-[10px] font-bold px-2.5 py-1 rounded-full',
  badgeDone: 'bg-[#e6f5ed] text-[#0d7a3e] text-[10px] font-bold px-2.5 py-1 rounded-full',
  badgeUrgent: 'bg-[#fee2e2] text-[#b91c1c] text-[10px] font-bold px-2.5 py-1 rounded-full',
  badgeInfo: 'bg-[#e0f2fe] text-[#0369a1] text-[10px] font-bold px-2.5 py-1 rounded-full',
  input: 'w-full px-3 py-2.5 bg-white border border-[#e2e8f0] rounded-[10px] text-sm text-[#1a2332] placeholder-[#8896a7] focus:outline-none focus:ring-2 focus:ring-[#003d79]/20 focus:border-[#003d79] transition-all',
} as const;
`;

fs.writeFileSync(path.join(ROOT, 'app/lib/design-system.ts'), designSystem, 'utf8');
log('✅ Created: app/lib/design-system.ts');

// ═══ 5. KOMPONEN: PageHeader ═══
console.log('\n🧩 STEP 5: Create components...');

const pageHeader = `'use client';

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
`;
fs.writeFileSync(path.join(ROOT, 'app/components/PageHeader.tsx'), pageHeader, 'utf8');
log('✅ Created: app/components/PageHeader.tsx (upgraded)');

// ═══ 6. KOMPONEN: PageWrapper ═══
const pageWrapper = `'use client';

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export default function PageWrapper({ children, className = '', noPadding = false }: PageWrapperProps) {
  return (
    <div className={\`min-h-screen bg-[#f4f7fa] \${noPadding ? '' : 'p-2 sm:p-3 lg:p-4'} \${className}\`}>
      <div className="max-w-7xl mx-auto space-y-3">
        {children}
      </div>
    </div>
  );
}
`;
fs.writeFileSync(path.join(ROOT, 'app/components/PageWrapper.tsx'), pageWrapper, 'utf8');
log('✅ Created: app/components/PageWrapper.tsx');

// ═══ 7. KOMPONEN: Card ═══
const card = `'use client';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  hover?: boolean;
  onClick?: () => void;
}

const paddingMap = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5 sm:p-6',
};

export default function Card({ children, className = '', padding = 'md', hover = false, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={\`
        bg-white rounded-[14px] border border-[#e2e8f0]
        shadow-[0_1px_3px_rgba(0,61,121,0.06)]
        \${paddingMap[padding]}
        \${hover ? 'hover:shadow-[0_4px_16px_rgba(0,61,121,0.08)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer' : ''}
        \${onClick ? 'cursor-pointer' : ''}
        \${className}
      \`}
    >
      {children}
    </div>
  );
}
`;
fs.writeFileSync(path.join(ROOT, 'app/components/Card.tsx'), card, 'utf8');
log('✅ Created: app/components/Card.tsx');

// ═══ 8. KOMPONEN: Button ═══
const button = `'use client';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

const variantClasses = {
  primary: 'bg-[#003d79] hover:bg-[#002a57] text-white font-bold shadow-[0_4px_12px_rgba(0,61,121,0.2)]',
  secondary: 'bg-[#e8f0f8] hover:bg-[#d1e1f1] text-[#003d79] font-semibold',
  danger: 'bg-[#b91c1c] hover:bg-[#991b1b] text-white font-semibold shadow-[0_4px_12px_rgba(185,28,28,0.2)]',
  ghost: 'bg-transparent hover:bg-[#e8f0f8] text-[#5a6a7e] font-medium',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-xs rounded-[16px]',
  md: 'px-4 py-2.5 text-sm rounded-[20px]',
  lg: 'px-6 py-3 text-base rounded-[24px]',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  className = '',
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={\`
        inline-flex items-center justify-center gap-2
        transition-all duration-200
        \${variantClasses[variant]}
        \${sizeClasses[size]}
        \${fullWidth ? 'w-full' : ''}
        \${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.97]'}
        \${className}
      \`}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
`;
fs.writeFileSync(path.join(ROOT, 'app/components/Button.tsx'), button, 'utf8');
log('✅ Created: app/components/Button.tsx');

// ═══ 9. KOMPONEN: Badge ═══
const badge = `'use client';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'pending' | 'done' | 'urgent' | 'info' | 'navy';
  className?: string;
}

const variantClasses = {
  pending: 'bg-[#fef3c7] text-[#b45309] border-[#fde68a]',
  done: 'bg-[#e6f5ed] text-[#0d7a3e] border-[#bbf7d0]',
  urgent: 'bg-[#fee2e2] text-[#b91c1c] border-[#fecaca]',
  info: 'bg-[#e0f2fe] text-[#0369a1] border-[#bae6fd]',
  navy: 'bg-[#e8f0f8] text-[#003d79] border-[#d1e1f1]',
};

export default function Badge({ children, variant = 'info', className = '' }: BadgeProps) {
  return (
    <span
      className={\`
        inline-flex items-center gap-1
        text-[10px] font-bold tracking-tight
        px-2.5 py-1 rounded-full border
        \${variantClasses[variant]}
        \${className}
      \`}
    >
      {children}
    </span>
  );
}
`;
fs.writeFileSync(path.join(ROOT, 'app/components/Badge.tsx'), badge, 'utf8');
log('✅ Created: app/components/Badge.tsx');

// ═══ 10. KOMPONEN: Icon ═══
const icon = `'use client';

interface IconProps {
  children: React.ReactNode;
  size?: number;
  color?: string;
  bg?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
  className?: string;
}

const roundedMap = {
  sm: 'rounded-[8px]',
  md: 'rounded-[12px]',
  lg: 'rounded-[16px]',
  full: 'rounded-full',
};

export default function Icon({
  children,
  size = 40,
  color = '#003d79',
  bg = '#e8f0f8',
  rounded = 'md',
  className = '',
}: IconProps) {
  return (
    <div
      className={\`
        flex items-center justify-center flex-shrink-0
        \${roundedMap[rounded]}
        \${className}
      \`}
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
        color: color,
      }}
    >
      {children}
    </div>
  );
}

// SVG Line Icon helper
export function SvgIcon({ d, size = 20, className = '' }: { d: string; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d={d} />
    </svg>
  );
}
`;
fs.writeFileSync(path.join(ROOT, 'app/components/Icon.tsx'), icon, 'utf8');
log('✅ Created: app/components/Icon.tsx');

// ═══ 11. KOMPONEN: AppFooter ═══
const appFooter = `'use client';

export default function AppFooter() {
  return (
    <footer className="text-center py-4 px-3 mt-6 border-t border-[#e2e8f0]">
      <p
        className="text-[10px] font-medium tracking-wide"
        style={{
          fontStyle: 'italic',
          color: '#8896a7',
          opacity: 0.55,
        }}
      >
        BTM Mobile APP V1.7.0
      </p>
      <p
        className="text-[9px] font-medium tracking-wide mt-0.5"
        style={{
          fontStyle: 'italic',
          color: '#8896a7',
          opacity: 0.40,
        }}
      >
        Powered By rck_Production
      </p>
    </footer>
  );
}
`;
fs.writeFileSync(path.join(ROOT, 'app/components/AppFooter.tsx'), appFooter, 'utf8');
log('✅ Created: app/components/AppFooter.tsx');

// ═══ 12. KOMPONEN: AppLayout ═══
const appLayout = `'use client';

import PageHeader from './PageHeader';
import PageWrapper from './PageWrapper';
import AppFooter from './AppFooter';

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  backUrl?: string;
  showBack?: boolean;
  badge?: string;
  rightElement?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

/**
 * AppLayout — Wrapper utama untuk SEMUA halaman.
 * Otomatis include: Header navy + Back button + Footer + Padding konsisten.
 *
 * Usage:
 *   <AppLayout title="Absensi" badge="HR" backUrl="/dashboard">
 *     <Card>Konten di sini</Card>
 *   </AppLayout>
 */
export default function AppLayout({
  children,
  title,
  subtitle,
  backUrl,
  showBack = true,
  badge,
  rightElement,
  icon,
  className = '',
}: AppLayoutProps) {
  return (
    <>
      <PageHeader
        title={title}
        subtitle={subtitle}
        backUrl={backUrl}
        showBack={showBack}
        badge={badge}
        rightElement={rightElement}
        icon={icon}
      />
      <PageWrapper className={className}>
        {children}
        <AppFooter />
      </PageWrapper>
    </>
  );
}
`;
fs.writeFileSync(path.join(ROOT, 'app/components/AppLayout.tsx'), appLayout, 'utf8');
log('✅ Created: app/components/AppLayout.tsx');

// ═══ DONE ═══
console.log('\n' + '='.repeat(55));
console.log('✅ SCRIPT 1 SELESAI — Fondasi + 8 Komponen Created!');
console.log('='.repeat(55));
console.log('\nFile yang dibuat:');
console.log('  📄 app/globals.css (updated)');
console.log('  📄 app/lib/design-system.ts');
console.log('  📄 app/components/PageHeader.tsx (upgraded)');
console.log('  📄 app/components/PageWrapper.tsx');
console.log('  📄 app/components/Card.tsx');
console.log('  📄 app/components/Button.tsx');
console.log('  📄 app/components/Badge.tsx');
console.log('  📄 app/components/Icon.tsx');
console.log('  📄 app/components/AppFooter.tsx');
console.log('  📄 app/components/AppLayout.tsx');
console.log('\n⏭️  Sekarang jalankan SCRIPT 2 untuk dokumentasi + font.');
console.log('='.repeat(55) + '\n');
