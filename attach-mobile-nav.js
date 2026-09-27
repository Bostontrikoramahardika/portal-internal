const fs = require('fs');
const path = require('path');

console.log('=======================================================');
console.log('📱 MEMASANG MOBILE BOTTOM NAV PERMANEN KE DASHBOARD');
console.log('=======================================================\n');

const componentsDir = path.join(process.cwd(), 'app', 'components');
if (!fs.existsSync(componentsDir)) fs.mkdirSync(componentsDir, { recursive: true });

// 1. BUAT MOBILE BOTTOM NAV (100% NATIVE SVG - ZERO DEPENDENCY ERROR)
const mobileNavCode = `"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const menuParam = searchParams?.get('menu');
  const [showMore, setShowMore] = useState(false);

  const isActive = (path, menu) => {
    if (menu && menuParam) return menuParam === menu;
    if (pathname === path && !menuParam) return true;
    return false;
  };

  const moreMenus = [
    { label: 'Leader', link: '/dashboard?menu=crew-on-duty', svg: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>' },
    { label: 'HR', link: '/dashboard/hr-dashboard', svg: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>' },
    { label: 'Safety', link: '/dashboard/monitoring-apd', svg: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>' },
    { label: 'Admin', link: '/dashboard/kelola-akses', svg: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>' },
    { label: 'Plant', link: '/dashboard/plant', svg: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>' },
    { label: 'Site', link: '/dashboard/monitoring-mcu', svg: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>' },
    { label: 'HO', link: '/dashboard/rekrutmen', svg: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>' },
  ];

  return (
    <>
      {/* Space Guard Bottom */}
      <div className="h-20 sm:hidden block w-full"></div>

      {/* Floating Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 sm:hidden z-50 px-3 pb-3 pt-1">
        <div className="bg-white rounded-[22px] shadow-[0_8px_30px_rgba(0,0,0,0.15)] border border-[#e2e8f0] px-2 py-2 flex items-center justify-between relative">
          
          {/* 1. Absensi */}
          <Link href="/dashboard?menu=absensi_saya" className="flex flex-col items-center justify-center w-[20%]">
            <svg className={`w-5 h-5 ${isActive('/dashboard', 'absensi_saya') ? 'text-[#003d79]' : 'text-[#8896a7]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
            </svg>
            <span className={`text-[10px] mt-1 font-bold ${isActive('/dashboard', 'absensi_saya') ? 'text-[#003d79]' : 'text-[#8896a7]'}`}>Absensi</span>
          </Link>

          {/* 2. Pengajuan */}
          <Link href="/dashboard?menu=form_cuti" className="flex flex-col items-center justify-center w-[20%]">
            <svg className={`w-5 h-5 ${isActive('/dashboard', 'form_cuti') ? 'text-[#003d79]' : 'text-[#8896a7]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <span className={`text-[10px] mt-1 font-bold ${isActive('/dashboard', 'form_cuti') ? 'text-[#003d79]' : 'text-[#8896a7]'}`}>Pengajuan</span>
          </Link>

          {/* 3. Scan (Floating Center Button) */}
          <div className="w-[20%] flex justify-center relative">
            <Link href="/dashboard/scan-qr" 
                  className="absolute -top-8 bg-[#003d79] text-white p-3.5 rounded-full shadow-lg border-[3px] border-[#f4f7fa] hover:bg-[#002a57] transition-transform active:scale-95"
                  style={{ boxShadow: '0 6px 20px rgba(0, 61, 121, 0.45)' }}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/>
              </svg>
            </Link>
            <span className="text-[10px] mt-6 font-bold text-[#8896a7]">Scan</span>
          </div>

          {/* 4. Saya */}
          <Link href="/dashboard/mcu-saya" className="flex flex-col items-center justify-center w-[20%]">
            <svg className={`w-5 h-5 ${pathname.includes('saya') ? 'text-[#003d79]' : 'text-[#8896a7]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
            <span className={`text-[10px] mt-1 font-bold ${pathname.includes('saya') ? 'text-[#003d79]' : 'text-[#8896a7]'}`}>Saya</span>
          </Link>

          {/* 5. More */}
          <button onClick={() => setShowMore(true)} className="flex flex-col items-center justify-center w-[20%] text-[#8896a7] hover:text-[#003d79]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
            <span className="text-[10px] mt-1 font-bold">More</span>
          </button>
        </div>
      </div>

      {/* MORE POPUP MODAL */}
      {showMore && (
        <div className="fixed inset-0 z-[60] flex items-end sm:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setShowMore(false)}></div>
          <div className="bg-white w-full rounded-t-[28px] p-6 relative z-10 border-t border-[#e2e8f0]">
            <div className="w-12 h-1.5 bg-[#e2e8f0] rounded-full mx-auto mb-5"></div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[#1a2332] font-extrabold text-base">Menu Lainnya</h3>
              <span className="text-xs text-[#8896a7]">BTM V1.7.0</span>
            </div>
            
            <div className="grid grid-cols-4 gap-4">
              {moreMenus.map((item, idx) => (
                <Link key={idx} href={item.link} onClick={() => setShowMore(false)} className="flex flex-col items-center text-center gap-1.5">
                  <div className="w-12 h-12 rounded-2xl bg-[#f4f7fa] text-[#003d79] flex items-center justify-center border border-[#e2e8f0]">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: item.svg }} />
                  </div>
                  <span className="text-xs font-bold text-[#5a6a7e]">{item.label}</span>
                </Link>
              ))}
            </div>
            
            <button onClick={() => setShowMore(false)} className="w-full mt-6 py-3 bg-[#f8fafc] text-[#1a2332] rounded-xl font-extrabold border border-[#e2e8f0]">
              Tutup
            </button>
          </div>
        </div>
      )}
    </>
  );
}
`;
fs.writeFileSync(path.join(componentsDir, 'MobileBottomNav.tsx'), mobileNavCode, 'utf8');
console.log('✅ Created: app/components/MobileBottomNav.tsx');

// 2. INJECT KE APP/DASHBOARD/LAYOUT.TSX
const dashLayoutPath = path.join(process.cwd(), 'app', 'dashboard', 'layout.tsx');
let dashLayout = fs.readFileSync(dashLayoutPath, 'utf8');

if (!dashLayout.includes('MobileBottomNav')) {
  // Tambah import
  dashLayout = `import MobileBottomNav from '@/app/components/MobileBottomNav';\n` + dashLayout;
  
  // Tancapkan sebelum tag penutup div/main/return
  const lastIndex = dashLayout.lastIndexOf('</div>');
  if (lastIndex !== -1) {
    dashLayout = dashLayout.slice(0, lastIndex) + '\n      <MobileBottomNav />\n' + dashLayout.slice(lastIndex);
  }
  
  fs.writeFileSync(dashLayoutPath, dashLayout, 'utf8');
  console.log('✅ Attached: <MobileBottomNav /> into app/dashboard/layout.tsx');
} else {
  console.log('ℹ️ <MobileBottomNav /> already exists in layout.tsx');
}

console.log('\n=======================================================');
