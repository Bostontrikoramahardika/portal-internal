const fs = require('fs');
const path = require('path');

console.log('=======================================================');
console.log('🛠️ FINAL POLISH: BOTTOM NAV, MOBILE UX, & ERROR HANDLING');
console.log('=======================================================\n');

const componentsDir = path.join(process.cwd(), 'app', 'components');
if (!fs.existsSync(componentsDir)) fs.mkdirSync(componentsDir, { recursive: true });

// 1. BUAT KOMPONEN MOBILE BOTTOM NAV (PAMA STYLE)
const bottomNavContent = `
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
            <span className={\`text-[10px] mt-1 font-medium \${isActive('/dashboard', 'absensi_saya') ? "text-[#003d79]" : ""}\`}>Absensi</span>
          </Link>

          {/* 2. Pengajuan */}
          <Link href="/dashboard?menu=form_cuti" className="flex flex-col items-center justify-center w-[20%] text-[#5a6a7e] hover:text-[#003d79]">
            <FileText size={22} className={isActive('/dashboard', 'form_cuti') ? "text-[#003d79]" : ""} />
            <span className={\`text-[10px] mt-1 font-medium \${isActive('/dashboard', 'form_cuti') ? "text-[#003d79]" : ""}\`}>Pengajuan</span>
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
            <span className={\`text-[10px] mt-1 font-medium \${pathname.includes('saya') ? "text-[#003d79]" : ""}\`}>Saya</span>
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
`;
fs.writeFileSync(path.join(componentsDir, 'MobileBottomNav.tsx'), bottomNavContent, 'utf8');
console.log('  ✅ Dibuat: MobileBottomNav.tsx (5 Menu + Scan Melayang)');

// 2. INJECT KE DASHBOARD LAYOUT
const layoutPath = path.join(process.cwd(), 'app', 'dashboard', 'layout.tsx');
if (fs.existsSync(layoutPath)) {
  let layout = fs.readFileSync(layoutPath, 'utf8');
  if (!layout.includes('MobileBottomNav')) {
    layout = layout.replace('import', `import MobileBottomNav from '@/app/components/MobileBottomNav';\nimport`);
    layout = layout.replace('</body>', `  <MobileBottomNav />\n      </body>`);
    fs.writeFileSync(layoutPath, layout, 'utf8');
    console.log('  ✅ MobileBottomNav dipasang ke dashboard layout');
  }
}

// 3. BUAT ERROR BOUNDARY (Agar app tidak nge-blank kalau ada error data)
const errorContent = `
"use client";
import { useEffect } from "react";

export default function Error({ error, reset }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <div className="min-h-screen bg-[#f4f7fa] flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-white p-8 rounded-[24px] shadow-sm border border-[#e2e8f0] max-w-sm w-full">
        <div className="w-16 h-16 bg-[#b91c1c]/10 text-[#b91c1c] rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        </div>
        <h2 className="text-xl font-bold text-[#1a2332] mb-2">Terjadi Kesalahan</h2>
        <p className="text-sm text-[#5a6a7e] mb-6">Gagal memuat data. Periksa koneksi internet Anda atau coba lagi.</p>
        <button onClick={() => reset()} className="w-full bg-[#003d79] text-white py-3 rounded-xl font-bold">
          Muat Ulang
        </button>
      </div>
    </div>
  );
}
`;
fs.writeFileSync(path.join(process.cwd(), 'app', 'dashboard', 'error.tsx'), errorContent, 'utf8');
console.log('  ✅ Dibuat: Error Boundary (Anti White Screen)');

// 4. AMANKAN SEMUA TABEL AGAR BISA DI-SWIPE DI HP (Tidak Terpotong)
function fixTables(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory() && file !== 'node_modules' && file !== '.next') {
      fixTables(fullPath);
    } else if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      // Jika ada tabel tapi belum dibungkus div overflow
      if (content.includes('<table') && !content.includes('overflow-x-auto') && !content.includes('MobileBottomNav')) {
        // Beri div overflow pada kontainer terdekat yang masuk akal, atau setidaknya di className table
        content = content.replace(/<table([^>]*)className="([^"]*)"/g, '<table$1className="$2 block w-full overflow-x-auto whitespace-nowrap md:table md:whitespace-normal"');
        content = content.replace(/<table(?!.*className)([^>]*)>/g, '<table className="block w-full overflow-x-auto whitespace-nowrap md:table md:whitespace-normal"$1>');
        fs.writeFileSync(fullPath, content, 'utf8');
      }
    }
  }
}
fixTables(path.join(process.cwd(), 'app'));
console.log('  ✅ Mengamankan tabel (Responsive Mobile View)');

console.log('\n=======================================================');
console.log('✅ SEMUA PENYEMPURNAAN MOBILE & UX SELESAI!');
console.log('1. Cek HP/Browser: Bottom Nav sudah persis seperti request (Scan di tengah).');
console.log('2. Tabel tidak akan memotong layar HP.');
console.log('3. Error Boundary menjaga app tetap stabil.');
console.log('=======================================================');
