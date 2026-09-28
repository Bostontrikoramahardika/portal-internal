'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface MenuItem {
  id?: string;
  title?: string;
  menu_label?: string;
  name?: string;
  menu_key?: string;
  href?: string;
  icon?: string | React.ReactNode;
  badge?: string;
}

interface MobileBottomNavProps {
  menus?: MenuItem[];
  userRole?: string;
}

const DEFAULT_GROUPS: Record<string, { name: string; href: string; icon: string; badge?: string }[]> = {
  absensi: [
    { name: 'Absensi Hari Ini', href: '/dashboard?menu=absensi_saya', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 v4a1 1 0 001 1m-6 0h6' },
    { name: 'Riwayat Absensi', href: '/dashboard?menu=riwayat_absensi', icon: 'M9 19v-6a2 2 0 00-2 2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { name: 'Crew On Duty', href: '/dashboard/crew-on-duty', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
    { name: 'Revisi Jam Absensi', href: '/dashboard/koreksi-absensi', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
    { name: 'Approval Koreksi', href: '/dashboard/approval-koreksi', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', badge: 'Leader' },
    { name: 'Manajemen Absensi', href: '/dashboard/manajemen-absensi', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', badge: 'HR' },
    { name: 'Rekap Absensi', href: '/dashboard/rekap-absensi', icon: 'M9 19v-6a2 2 0 00-2 2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { name: 'HR Override Absensi', href: '/dashboard/hr-override-absensi', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', badge: 'HR' },
  ],
  pengajuan: [
    { name: 'Ajukan Cuti', href: '/dashboard?menu=form_cuti', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { name: 'Riwayat Cuti', href: '/dashboard?menu=cuti_saya', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { name: 'Eviden Sakit / Izin', href: '/dashboard?menu=evident_sakit', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { name: 'Ajukan Lembur', href: '/dashboard?menu=form_lembur', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { name: 'Riwayat Lembur', href: '/dashboard?menu=riwayat_lembur', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { name: 'Approval Center', href: '/dashboard?menu=approval_center', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', badge: 'Leader' },
  ],
  saya: [
    { name: 'Data Saya', href: '/dashboard?menu=data_saya', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { name: 'APD Saya', href: '/dashboard/apd-saya', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
    { name: 'MCU Saya', href: '/dashboard/mcu-saya', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
    { name: 'Roster Bulanan', href: '/dashboard?menu=roster_saya', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { name: 'KPI Saya', href: '/dashboard?menu=kpi_saya', icon: 'M9 19v-6a2 2 0 00-2 2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { name: 'PKWT Saya', href: '/dashboard?menu=pkwt_saya', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { name: 'SP Saya', href: '/dashboard?menu=sp_saya', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
    { name: 'SIMPER Saya', href: '/dashboard?menu=simper_saya', icon: 'M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 012-2h2a2 2 0 012 2v1m-6 0h6' },
    { name: 'BPJS Karyawan', href: '/dashboard?menu=bpjs_saya', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  ],
  more: [
    { name: 'HR Dashboard', href: '/dashboard/hr-dashboard', icon: 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z', badge: 'HR' },
    { name: 'Kru & Workshop', href: '/dashboard/plant', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 v5m-4 0h4' },
    { name: 'Inspeksi P2H', href: '/dashboard/plant/inspeksi', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { name: 'Plant Logistik', href: '/dashboard/plant/logistik', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { name: 'Logistik Master', href: '/dashboard/logistik', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { name: 'Kelola Unit', href: '/dashboard/kelola-unit', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066' },
    { name: 'Setting Unit', href: '/dashboard/setting-unit', icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4' },
    { name: 'Kelola APD', href: '/dashboard/kelola-apd', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
    { name: 'Monitoring APD', href: '/dashboard/monitoring-apd', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
    { name: 'Monitoring MCU', href: '/dashboard/monitoring-mcu', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
    { name: 'Import MCU', href: '/dashboard/import-mcu', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12' },
    { name: 'Import Roster', href: '/dashboard/import-roster', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { name: 'Kelola Akses', href: '/dashboard/kelola-akses', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', badge: 'Admin' },
    { name: 'Rekrutmen', href: '/dashboard/rekrutmen', icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z', badge: 'HR' },
    { name: 'Kelola Event', href: '/dashboard/kelola-event', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  ],
};

const SHEET_TITLES: Record<string, string> = {
  absensi: 'Menu Absensi',
  pengajuan: 'Menu Pengajuan',
  saya: 'Menu Saya / Self Service',
  more: 'Menu Sistem Lainnya',
};

export default function MobileBottomNav({ menus = [], userRole = 'KARYAWAN' }: MobileBottomNavProps) {
  const rawPathname = usePathname();
  const pathname = rawPathname || '';
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const closeDrawer = () => setActiveTab(null);
  const toggleTab = (tab: string) => setActiveTab(activeTab === tab ? null : tab);

  const tabs = [
    { id: 'absensi', label: 'Absensi', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'pengajuan', label: 'Pengajuan', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { id: 'scan', label: 'Scan QR', isScanner: true },
    { id: 'saya', label: 'Saya', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { id: 'more', label: 'More', icon: 'M4 6h16M4 12h16M4 18h16' },
  ];

  const currentItems = activeTab && activeTab !== 'scan' ? (DEFAULT_GROUPS[activeTab] || []) : [];

  
  async function handleLogout() {
    try {
      const { clearAuthCache } = await import('@/app/lib/auth-cache')
      clearAuthCache()
    } catch {}
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('btm_session_token_v1')
        localStorage.removeItem('btm_user_cache_v1')
        localStorage.removeItem('btm_user_v1')
        localStorage.removeItem('btm_menus_v1')
        localStorage.removeItem('btm_menus_time_v1')
      }
    } catch {}
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {}
    window.location.href = '/'
  }

  return (
    <>
      {/* ===== BOTTOM SHEET DRAWER DENGAN GRID KARTU KOTAK ===== */}
      {activeTab && activeTab !== 'scan' && (
        <div className="fixed inset-0 z-[100000] flex flex-col justify-end sm:hidden">
          <div className="fixed inset-0 bg-slate-900/60 transition-opacity" onClick={closeDrawer} />
          <div className="relative bg-white rounded-t-[24px] max-h-[80vh] overflow-y-auto p-4 z-10 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-[#003d79] uppercase tracking-wider">
                {SHEET_TITLES[activeTab] || 'Menu'}
              </h3>
              <button
                type="button"
                onClick={closeDrawer}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* GRID 2 KOLOM KARTU KOTAK */}
            <div className="grid grid-cols-2 gap-3 pb-6">
              {currentItems.map((item, idx) => {
                const isCurrent = pathname === item.href;
                return (
                  <Link
                    key={idx + item.href + item.name}
                    href={item.href}
                    onClick={closeDrawer}
                    className={
                      'flex flex-col items-center justify-center p-3.5 rounded-2xl border text-center transition-all active:scale-95 ' +
                      (isCurrent
                        ? 'bg-[#003d79] border-[#003d79] text-white'
                        : 'bg-[#f4f7fa] border-slate-200 text-slate-700 hover:bg-blue-50')
                    }
                  >
                    <div
                      className={
                        'w-10 h-10 rounded-xl flex items-center justify-center mb-2 border ' +
                        (isCurrent
                          ? 'bg-white/20 border-white/30 text-white'
                          : 'bg-white border-slate-200 text-[#003d79]')
                      }
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d={item.icon} />
                      </svg>
                    </div>
                    <span className="text-[11px] font-bold leading-tight line-clamp-2">{item.name}</span>
                    {item.badge && (
                      <span className="mt-1 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-amber-400 text-slate-900">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* TOMBOL KELUAR APLIKASI (KHUSUS TAB SAYA) */}
            {activeTab === 'saya' && (
              <div className="pt-2 pb-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-600 font-bold text-sm active:scale-95 transition-all"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Keluar Aplikasi
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== FIXED 5-TAB BOTTOM BAR ===== */}
      <nav className="fixed bottom-2.5 left-2.5 right-2.5 z-50 bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-[0_8px_30px_rgba(0,61,121,0.12)] rounded-2xl px-2 py-1.5 lg:hidden">
        <div className="flex items-center justify-around h-[60px] px-1 relative">
          {tabs.map((tab) => {
            if (tab.isScanner) {
              return (
                <div key="scan" className="flex-1 flex justify-center -mt-6">
                  <Link
                    href="/dashboard/scan-qr"
                    onClick={closeDrawer}
                    className="w-14 h-14 rounded-full bg-[#003d79] text-white flex items-center justify-center shadow-lg border-4 border-white active:scale-95 transition-transform"
                  >
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7" />
                      <rect x="14" y="3" width="7" height="7" />
                      <rect x="14" y="14" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" />
                    </svg>
                  </Link>
                </div>
              );
            }

            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => toggleTab(tab.id)}
                className={
                  'flex flex-col items-center justify-center flex-1 py-1 transition-colors ' +
                  (isActive ? 'text-[#003d79] font-bold' : 'text-slate-500 font-medium')
                }
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-0.5">
                  <path d={tab.icon} />
                </svg>
                <span className="text-[10px] leading-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}