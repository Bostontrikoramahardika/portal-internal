
"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Home, FileText, QrCode, User, Grid, Shield, Users, Building, HardHat, Factory, LayoutDashboard } from 'lucide-react';

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
    { label: 'Leader', icon: <Users size={20} />, link: '/dashboard?menu=crew-on-duty' },
    { label: 'HR', icon: <Users size={20} />, link: '/dashboard/hr-dashboard' },
    { label: 'Safety', icon: <Shield size={20} />, link: '/dashboard/monitoring-apd' },
    { label: 'Admin', icon: <LayoutDashboard size={20} />, link: '/dashboard/kelola-akses' },
    { label: 'Plant', icon: <HardHat size={20} />, link: '/dashboard/plant' },
    { label: 'Site', icon: <Factory size={20} />, link: '/dashboard/monitoring-mcu' },
    { label: 'HO', icon: <Building size={20} />, link: '/dashboard/rekrutmen' },
  ];

  return (
    <>
      {/* Spacer agar konten tidak tertutup nav */}
      <div className="h-24 sm:hidden block w-full"></div>

      {/* Floating Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 sm:hidden z-50 px-4 pb-4 pt-2">
        <div className="bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-[#e2e8f0] px-2 py-2 flex items-center justify-between relative">
          
          {/* 1. Absensi */}
          <Link href="/dashboard?menu=absensi_saya" className="flex flex-col items-center justify-center w-[20%] text-[#5a6a7e] hover:text-[#003d79]">
            <Home size={22} className={isActive('/dashboard', 'absensi_saya') ? "text-[#003d79]" : ""} />
            <span className={`text-[10px] mt-1 font-medium ${isActive('/dashboard', 'absensi_saya') ? "text-[#003d79]" : ""}`}>Absensi</span>
          </Link>

          {/* 2. Pengajuan */}
          <Link href="/dashboard?menu=form_cuti" className="flex flex-col items-center justify-center w-[20%] text-[#5a6a7e] hover:text-[#003d79]">
            <FileText size={22} className={isActive('/dashboard', 'form_cuti') ? "text-[#003d79]" : ""} />
            <span className={`text-[10px] mt-1 font-medium ${isActive('/dashboard', 'form_cuti') ? "text-[#003d79]" : ""}`}>Pengajuan</span>
          </Link>

          {/* 3. Scan (Center Floating Action Button) */}
          <div className="w-[20%] flex justify-center relative">
            <Link href="/dashboard/scan-qr" 
                  className="absolute -top-10 bg-[#003d79] text-white p-4 rounded-full shadow-lg border-[4px] border-[#f4f7fa] hover:bg-[#002a57] hover:scale-105 transition-transform"
                  style={{ boxShadow: '0 4px 15px rgba(0, 61, 121, 0.4)' }}>
              <QrCode size={26} />
            </Link>
            <span className="text-[10px] mt-6 font-medium text-[#5a6a7e]">Scan</span>
          </div>

          {/* 4. Saya */}
          <Link href="/dashboard/mcu-saya" className="flex flex-col items-center justify-center w-[20%] text-[#5a6a7e] hover:text-[#003d79]">
            <User size={22} className={pathname.includes('saya') ? "text-[#003d79]" : ""} />
            <span className={`text-[10px] mt-1 font-medium ${pathname.includes('saya') ? "text-[#003d79]" : ""}`}>Saya</span>
          </Link>

          {/* 5. More */}
          <button onClick={() => setShowMore(true)} className="flex flex-col items-center justify-center w-[20%] text-[#5a6a7e] hover:text-[#003d79]">
            <Grid size={22} />
            <span className="text-[10px] mt-1 font-medium">More</span>
          </button>
        </div>
      </div>

      {/* MORE MODAL (Popup dari bawah) */}
      {showMore && (
        <div className="fixed inset-0 z-[60] flex items-end sm:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowMore(false)}></div>
          <div className="bg-white w-full rounded-t-[24px] p-6 relative z-10 animate-in slide-in-from-bottom-full duration-300">
            <div className="w-12 h-1.5 bg-[#e2e8f0] rounded-full mx-auto mb-6"></div>
            <h3 className="text-[#1a2332] font-bold text-lg mb-6">Menu Lainnya</h3>
            
            <div className="grid grid-cols-4 gap-4">
              {moreMenus.map((item, idx) => (
                <Link key={idx} href={item.link} onClick={() => setShowMore(false)} className="flex flex-col items-center text-center gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-[#f4f7fa] text-[#003d79] flex items-center justify-center border border-[#e2e8f0]">
                    {item.icon}
                  </div>
                  <span className="text-xs font-semibold text-[#5a6a7e]">{item.label}</span>
                </Link>
              ))}
            </div>
            
            <button onClick={() => setShowMore(false)} className="w-full mt-8 py-3 bg-[#f8fafc] text-[#1a2332] rounded-xl font-bold border border-[#e2e8f0]">
              Tutup
            </button>
          </div>
        </div>
      )}
    </>
  );
}
