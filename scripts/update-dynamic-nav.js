const fs = require('fs');
const path = require('path');

const fileContent = \'use client';

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

export default function MobileBottomNav({ menus = [], userRole = 'KARYAWAN' }: MobileBottomNavProps) {
  const rawPathname = usePathname();
  const pathname = rawPathname || '';
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const closeDrawer = () => setActiveTab(null);
  const toggleTab = (tab: string) => setActiveTab(activeTab === tab ? null : tab);

  // ==========================================
  // DYNAMIC GROUPING DARI DATABASE (TIDAK ADA MENU YG HILANG)
  // ==========================================
  const groupedMenus: Record<string, MenuItem[]> = {
    absensi: [],
    pengajuan: [],
    saya: [],
    more: []
  };

  menus.forEach(item => {
    const key = (item.menu_key || '').toLowerCase();
    const href = (item.href || '').toLowerCase();
    const label = (item.title || item.menu_label || item.name || '').toLowerCase();

    // Abaikan scan-qr jika ada di database, karena sudah jadi tombol melayang (FAB)
    if (href.includes('/scan-qr')) return;

    // 1. KELOMPOK ABSENSI
    if (key === 'dashboard' || href === '/dashboard' || key.includes('absensi') || key === 'crew_on_duty' || key === 'monitor_absensi') {
      groupedMenus.absensi.push(item);
    } 
    // 2. KELOMPOK SAYA (Self Service)
    else if (key.endsWith('_saya') || label.includes('saya') || key.includes('password')) {
      groupedMenus.saya.push(item);
    } 
    // 3. KELOMPOK PENGAJUAN
    else if (key.includes('cuti') || key.includes('lembur') || key.includes('sakit') || key.includes('approval') || href.includes('cuti') || href.includes('lembur') || label.includes('pengajuan')) {
      groupedMenus.pengajuan.push(item);
    } 
    // 4. KELOMPOK MORE (Sisanya: Plant, Logistik, HR, Event, Unit, dll)
    else {
      groupedMenus.more.push(item);
    }
  });

  const currentItems = activeTab && activeTab !== 'scan' ? groupedMenus[activeTab] || [] : [];

  const tabs = [
    { id: 'absensi', label: 'Absensi', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'pengajuan', label: 'Pengajuan', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { id: 'scan', label: 'Scan QR', isScanner: true },
    { id: 'saya', label: 'Saya', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { id: 'more', label: 'More', icon: 'M4 6h16M4 12h16M4 18h16' },
  ];

  const sheetTitles: Record<string, string> = {
    absensi: 'Menu Absensi',
    pengajuan: 'Menu Pengajuan',
    saya: 'Menu Saya',
    more: 'Menu Lainnya'
  };

  return (
    <>
      {/* ===== DRAWER (BOTTOM SHEET) ===== */}
      {activeTab && activeTab !== 'scan' && (
        <div className="fixed inset-0 z-[100000] flex flex-col justify-end sm:hidden">
          <div className="fixed inset-0 bg-slate-900/60 transition-opacity" onClick={closeDrawer} />
          <div className="relative bg-white rounded-t-[24px] max-h-[80vh] overflow-y-auto p-4 z-10 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-[#003d79] uppercase tracking-wider">
                {sheetTitles[activeTab]}
              </h3>
              <button
                type="button"
                onClick={closeDrawer}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* GRID 2 KOLOM */}
            <div className="grid grid-cols-2 gap-3 pb-6">
              {currentItems.length > 0 ? (
                currentItems.map((item, idx) => {
                  const href = item.href || '#';
                  const title = item.title || item.menu_label || item.name || 'Menu';
                  const isCurrent = pathname === href;
                  // Render icon dari database (emoji) atau icon bawaan jika tidak ada
                  const iconNode = item.icon || '📌';

                  return (
                    <Link
                      key={idx}
                      href={href}
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
                          'w-10 h-10 rounded-xl flex items-center justify-center mb-2 border text-lg ' +
                          (isCurrent
                            ? 'bg-white/20 border-white/30 text-white'
                            : 'bg-white border-slate-200 text-[#003d79]')
                        }
                      >
                        {iconNode}
                      </div>
                      <span className="text-[11px] font-bold leading-tight line-clamp-2">{title}</span>
                      {item.badge && (
                        <span className="mt-1 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-amber-400 text-slate-900">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })
              ) : (
                <div className="col-span-2 text-center py-8 text-sm text-slate-400 font-medium">
                  Belum ada menu di kategori ini.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== FIXED 5-TAB BOTTOM BAR ===== */}
      <nav className="fixed bottom-0 inset-x-0 z-[99999] bg-white border-t border-[#e2e8f0] sm:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
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
\;

const filePath = path.join(process.cwd(), 'app', 'components', 'MobileBottomNav.tsx');
fs.writeFileSync(filePath, fileContent, 'utf8');
console.log('BERHASIL: MobileBottomNav dikembalikan ke sistem dinamis!');
