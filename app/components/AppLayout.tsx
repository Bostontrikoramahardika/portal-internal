'use client';

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
