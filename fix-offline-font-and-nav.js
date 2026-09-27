const fs = require('fs');
const path = require('path');

console.log('=======================================================');
console.log('🛠️ PERBAIKAN OFFLINE FONT & SINGLE BOTTOM NAV MOBILE');
console.log('=======================================================\n');

// 1. FIX APP/LAYOUT.TSX: HAPUS GOOGLE FONTS CDN (GANTI KE LOCAL FONT)
const rootLayoutPath = path.join(process.cwd(), 'app', 'layout.tsx');
if (fs.existsSync(rootLayoutPath)) {
  let layout = fs.readFileSync(rootLayoutPath, 'utf8');
  
  // Hapus import Google Font
  layout = layout.replace(/import\s+\{\s*Plus_Jakarta_Sans\s*\}\s+from\s+['"]next\/font\/google['"];?\r?\n?/g, '');
  layout = layout.replace(/const\s+plusJakartaSans\s*=\s*Plus_Jakarta_Sans\([^)]*\);?\r?\n?/g, '');
  layout = layout.replace(/\$\{plusJakartaSans\.className\}/g, '');
  layout = layout.replace(/plusJakartaSans\.className/g, '');

  fs.writeFileSync(rootLayoutPath, layout, 'utf8');
  console.log('✅ FIXED: app/layout.tsx (Impor Google Fonts dihapus -> 100% Font Lokal)');
}

// 2. BUAT COMPONENT MOBILEBOTTOMNAV.TSX DENGAN METODE AMAN
const componentsDir = path.join(process.cwd(), 'app', 'components');
if (!fs.existsSync(componentsDir)) fs.mkdirSync(componentsDir, { recursive: true });

const navLines = [
  '"use client";',
  '',
  'import React, { useState, Suspense } from "react";',
  'import Link from "next/link";',
  'import { usePathname, useSearchParams } from "next/navigation";',
  '',
  'function MobileBottomNavContent() {',
  '  const pathname = usePathname() || "";',
  '  const searchParams = useSearchParams();',
  '  const menuParam = searchParams ? searchParams.get("menu") : null;',
  '  const [showMore, setShowMore] = useState(false);',
  '',
  '  const isAbsensi = menuParam === "absensi_saya" || (pathname === "/dashboard" && !menuParam);',
  '  const isPengajuan = menuParam === "form_cuti";',
  '  const isSaya = pathname.includes("saya") || pathname.includes("mcu-saya");',
  '',
  '  const moreMenus = [',
  '    { label: "Leader", href: "/dashboard?menu=crew-on-duty" },',
  '    { label: "HR", href: "/dashboard/hr-dashboard" },',
  '    { label: "Safety", href: "/dashboard/monitoring-apd" },',
  '    { label: "Admin", href: "/dashboard/kelola-akses" },',
  '    { label: "Plant", href: "/dashboard/plant" },',
  '    { label: "Site", href: "/dashboard/monitoring-mcu" },',
  '    { label: "HO", href: "/dashboard/rekrutmen" },',
  '  ];',
  '',
  '  return (',
  '    <>',
  '      <div className="h-20 sm:hidden block w-full" />',
  '',
  '      <div className="fixed bottom-0 left-0 right-0 sm:hidden z-50 px-3 pb-3 pt-1">',
  '        <div className="bg-white rounded-[22px] shadow-[0_8px_30px_rgba(0,0,0,0.15)] border border-[#e2e8f0] px-2 py-2 flex items-center justify-between relative">',
  '          ',
  '          {/* 1. Absensi */}',
  '          <Link href="/dashboard?menu=absensi_saya" className="flex flex-col items-center justify-center w-[20%]">',
  '            <svg className={isAbsensi ? "w-5 h-5 text-[#003d79]" : "w-5 h-5 text-[#8896a7]"} fill="none" stroke="currentColor" viewBox="0 0 24 24">',
  '              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />',
  '            </svg>',
  '            <span className={isAbsensi ? "text-[10px] mt-1 font-bold text-[#003d79]" : "text-[10px] mt-1 font-bold text-[#8896a7]"}>Absensi</span>',
  '          </Link>',
  '',
  '          {/* 2. Pengajuan */}',
  '          <Link href="/dashboard?menu=form_cuti" className="flex flex-col items-center justify-center w-[20%]">',
  '            <svg className={isPengajuan ? "w-5 h-5 text-[#003d79]" : "w-5 h-5 text-[#8896a7]"} fill="none" stroke="currentColor" viewBox="0 0 24 24">',
  '              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />',
  '            </svg>',
  '            <span className={isPengajuan ? "text-[10px] mt-1 font-bold text-[#003d79]" : "text-[10px] mt-1 font-bold text-[#8896a7]"}>Pengajuan</span>',
  '          </Link>',
  '',
  '          {/* 3. Scan Floating Center */}',
  '          <div className="w-[20%] flex justify-center relative">',
  '            <Link',
  '              href="/dashboard/scan-qr"',
  '              className="absolute -top-8 bg-[#003d79] text-white p-3.5 rounded-full border-[3px] border-[#f4f7fa] shadow-lg active:scale-95 flex items-center justify-center"',
  '              style={{ boxShadow: "0 6px 20px rgba(0, 61, 121, 0.45)" }}',
  '            >',
  '              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">',
  '                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />',
  '              </svg>',
  '            </Link>',
  '            <span className="text-[10px] mt-6 font-bold text-[#8896a7]">Scan</span>',
  '          </div>',
  '',
  '          {/* 4. Saya */}',
  '          <Link href="/dashboard/mcu-saya" className="flex flex-col items-center justify-center w-[20%]">',
  '            <svg className={isSaya ? "w-5 h-5 text-[#003d79]" : "w-5 h-5 text-[#8896a7]"} fill="none" stroke="currentColor" viewBox="0 0 24 24">',
  '              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />',
  '            </svg>',
  '            <span className={isSaya ? "text-[10px] mt-1 font-bold text-[#003d79]" : "text-[10px] mt-1 font-bold text-[#8896a7]"}>Saya</span>',
  '          </Link>',
  '',
  '          {/* 5. More */}',
  '          <button',
  '            type="button"',
  '            onClick={() => setShowMore(true)}',
  '            className="flex flex-col items-center justify-center w-[20%] text-[#8896a7] hover:text-[#003d79]"',
  '          >',
  '            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">',
  '              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />',
  '            </svg>',
  '            <span className="text-[10px] mt-1 font-bold">More</span>',
  '          </button>',
  '        </div>',
  '      </div>',
  '',
  '      {/* MORE POPUP MODAL */}',
  '      {showMore && (',
  '        <div className="fixed inset-0 z-[60] flex items-end sm:hidden">',
  '          <div className="absolute inset-0 bg-black/50" onClick={() => setShowMore(false)} />',
  '          <div className="bg-white w-full rounded-t-[28px] p-6 relative z-10 border-t border-[#e2e8f0]">',
  '            <div className="w-12 h-1.5 bg-[#e2e8f0] rounded-full mx-auto mb-5" />',
  '            <div className="flex items-center justify-between mb-6">',
  '              <h3 className="text-[#1a2332] font-extrabold text-base">Menu Lainnya</h3>',
  '              <span className="text-xs text-[#8896a7]">BTM V1.7.0</span>',
  '            </div>',
  '            ',
  '            <div className="grid grid-cols-4 gap-4">',
  '              {moreMenus.map((item) => (',
  '                <Link',
  '                  key={item.label}',
  '                  href={item.href}',
  '                  onClick={() => setShowMore(false)}',
  '                  className="flex flex-col items-center text-center gap-1.5"',
  '                >',
  '                  <div className="w-12 h-12 rounded-2xl bg-[#f4f7fa] text-[#003d79] flex items-center justify-center border border-[#e2e8f0] text-sm font-black">',
  '                    {item.label.charAt(0)}',
  '                  </div>',
  '                  <span className="text-xs font-bold text-[#5a6a7e]">{item.label}</span>',
  '                </Link>',
  '              ))}',
  '            </div>',
  '            ',
  '            <button',
  '              type="button"',
  '              onClick={() => setShowMore(false)}',
  '              className="w-full mt-6 py-3 bg-[#f8fafc] text-[#1a2332] rounded-xl font-extrabold border border-[#e2e8f0]"',
  '            >',
  '              Tutup',
  '            </button>',
  '          </div>',
  '        </div>',
  '      )}',
  '    <>',
  '  );',
  '}',
  '',
  'export default function MobileBottomNav() {',
  '  return (',
  '    <Suspense fallback={null}>',
  '      <MobileBottomNavContent />',
  '    </Suspense>',
  '  );',
  '}',
].join('\n');

fs.writeFileSync(path.join(componentsDir, 'MobileBottomNav.tsx'), navLines, 'utf8');
console.log('✅ Created: app/components/MobileBottomNav.tsx');

// 3. TANCAPKAN KE DASHBOARD LAYOUT SECARA CLEAN
const dashLayoutPath = path.join(process.cwd(), 'app', 'dashboard', 'layout.tsx');
let dashContent = fs.readFileSync(dashLayoutPath, 'utf8');

// Hapus sisa-sisa import / tag lama
dashContent = dashContent.replace(/import\s+MobileBottomNav\s+from\s+["']@\/app\/components\/MobileBottomNav["'];?\r?\n?/g, '');
dashContent = dashContent.replace(/['"]use client['"];?\r?\n?/g, '');
dashContent = dashContent.replace(/<MobileBottomNav\s*\/>/g, '');

// Susun ulang: 'use client' di paling atas
let cleanLayout = `'use client';\nimport MobileBottomNav from '@/app/components/MobileBottomNav';\n` + dashContent.trim();

if (cleanLayout.includes('</AuthProvider>')) {
  cleanLayout = cleanLayout.replace('</AuthProvider>', '  <MobileBottomNav />\n        </AuthProvider>');
} else if (cleanLayout.includes('</main>')) {
  cleanLayout = cleanLayout.replace('</main>', '  <MobileBottomNav />\n      </main>');
} else {
  const lastIdx = cleanLayout.lastIndexOf('</div>');
  if (lastIdx !== -1) {
    cleanLayout = cleanLayout.slice(0, lastIdx) + '  <MobileBottomNav />\n' + cleanLayout.slice(lastIdx);
  }
}

fs.writeFileSync(dashLayoutPath, cleanLayout, 'utf8');
console.log('✅ Fixed: app/dashboard/layout.tsx');

console.log('\n=======================================================');
console.log('🚀 PERBAIKAN SELESAI!');
console.log('=======================================================');
