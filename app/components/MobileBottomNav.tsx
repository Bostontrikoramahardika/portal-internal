'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const FALLBACK_MENUS = {
  Absensi: [
    { name: 'Dashboard Absensi', href: '/dashboard', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { name: 'Koreksi Absensi', href: '/dashboard/koreksi-absensi', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
    { name: 'Crew On Duty', href: '/dashboard/crew-on-duty', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { name: 'Manajemen Absensi', href: '/dashboard/manajemen-absensi', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  ],
  Pengajuan: [
    { name: 'Cuti / Izin', href: '/dashboard/dashboard-cuti', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { name: 'APD Saya', href: '/dashboard/apd-saya', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
    { name: 'MCU Saya', href: '/dashboard/mcu-saya', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
  ],
  'HR & Admin': [
    { name: 'HR Dashboard', href: '/dashboard/hr-dashboard', icon: 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { name: 'Kelola Akses', href: '/dashboard/kelola-akses', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
    { name: 'Rekrutmen', href: '/dashboard/rekrutmen', icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z' },
  ]
};

export default function MobileBottomNav() {
  const rawPathname = usePathname();
  const pathname = rawPathname || '';
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { label: 'Absensi', href: '/dashboard', iconPath: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
    { label: 'Pengajuan', href: '/dashboard/dashboard-cuti', iconPath: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { label: 'Scan', href: '/dashboard/scan-qr', isScanner: true },
    { label: 'Saya', href: '/dashboard/apd-saya', iconPath: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { label: 'Lainnya', onClick: () => setIsOpen(true), iconPath: 'M4 6h16M4 12h16M4 18h16' },
  ];

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-3 py-1.5 z-[99999] shadow-[0_-2px-10px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-between max-w-md mx-auto relative">
          {navItems.map((item, idx) => {
            const isActive = pathname === item.href;

            if (item.isScanner) {
              return (
                <Link 
                  key={idx} 
                  href={item.href || '#'} 
                  className="flex flex-col items-center -mt-6 z-10"
                >
                  <div className="w-13 h-13 p-3 bg-[#003d79] rounded-full flex items-center justify-center shadow-lg border-4 border-white transform transition-transform active:scale-95">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7"></rect>
                      <rect x="14" y="3" width="7" height="7"></rect>
                      <rect x="14" y="14" width="7" height="7"></rect>
                      <rect x="3" y="14" width="7" height="7"></rect>
                    </svg>
                  </div>
                  <span className="text-[10px] font-bold text-[#003d79] mt-0.5 tracking-tight uppercase">Scan QR</span>
                </Link>
              );
            }

            const Content = (
              <div className={`flex flex-col items-center py-1 transition-colors ${isActive ? 'text-[#003d79] font-bold' : 'text-gray-500 font-normal'}`}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.iconPath}></path>
                </svg>
                <span className="text-[10px] mt-0.5 leading-none">{item.label}</span>
              </div>
            );

            return item.onClick ? (
              <button key={idx} onClick={item.onClick} className="flex-1 flex justify-center focus:outline-none">
                {Content}
              </button>
            ) : (
              <Link key={idx} href={item.href || '#'} className="flex-1 flex justify-center">
                {Content}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Pure Tailwind Bottom Sheet Drawer */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-[100000] flex flex-col justify-end">
          <div 
            className="fixed inset-0 bg-black/60 transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          <div className="relative bg-white rounded-t-[24px] max-h-[80vh] min-h-[350px] overflow-y-auto p-5 z-10 shadow-2xl">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4" />
            
            <div className="flex justify-between items-center mb-5 pb-2 border-b border-gray-100">
              <h3 className="text-base font-bold text-[#003d79]">Menu Portal Internal</h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold hover:bg-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6 pb-6">
              {Object.entries(FALLBACK_MENUS).map(([group, items]) => (
                <div key={group}>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5 px-1">{group}</p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {items.map((m) => (
                      <Link 
                        key={m.href} 
                        href={m.href} 
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 p-3 bg-[#f4f7fa] hover:bg-[#e2e8f0] rounded-xl border border-gray-200/60 active:scale-98 transition-all"
                      >
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-gray-200 shadow-sm flex-shrink-0">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#003d79" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d={m.icon}></path>
                          </svg>
                        </div>
                        <span className="text-xs font-semibold text-gray-800 line-clamp-2">{m.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
