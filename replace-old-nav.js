const fs = require('fs');
const path = require('path');

console.log('=======================================================');
console.log('🛠️ PERBAIKAN BOTTOM NAV HP (REPLACE NAVIGATION LAMA)');
console.log('=======================================================\n');

// 1. CARI SEMUA FILE YANG PUNYA BOTTOM NAV LAMA ("SAFETY", "LEADER", "PENGAJUAN")
function getFiles(dir, list = []) {
  if (!fs.existsSync(dir)) return list;
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (f !== 'node_modules' && f !== '.next') getFiles(full, list);
    } else if (f.endsWith('.tsx') || f.endsWith('.jsx')) {
      list.push(full);
    }
  }
  return list;
}

const allFiles = [
  ...getFiles(path.join(process.cwd(), 'app')),
  ...getFiles(path.join(process.cwd(), 'components'))
];

// Definisi Bottom Nav Baru (5 Menu + Scan Melayang + More Modal)
const newBottomNavJSX = `
{/* ===== BOTTOM NAVIGATION 5 MENU (PAMA STYLE V1.7.0) ===== */}
<div className="fixed bottom-0 left-0 right-0 sm:hidden z-50 px-3 pb-3 pt-1">
  <div className="bg-white rounded-[22px] shadow-[0_8px_30px_rgba(0,0,0,0.15)] border border-[#e2e8f0] px-2 py-2 flex items-center justify-between relative">
    
    {/* 1. Absensi */}
    <a href="/dashboard?menu=absensi_saya" className="flex flex-col items-center justify-center w-[20%] text-[#003d79]">
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="text-[10px] mt-1 font-bold text-[#003d79]">Absensi</span>
    </a>

    {/* 2. Pengajuan */}
    <a href="/dashboard?menu=form_cuti" className="flex flex-col items-center justify-center w-[20%] text-[#8896a7]">
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <span className="text-[10px] mt-1 font-bold text-[#8896a7]">Pengajuan</span>
    </a>

    {/* 3. Scan Floating Center */}
    <div className="w-[20%] flex justify-center relative">
      <a href="/dashboard/scan-qr" className="absolute -top-8 bg-[#003d79] text-white p-3.5 rounded-full border-[3px] border-[#f4f7fa] shadow-lg active:scale-95">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
        </svg>
      </a>
      <span className="text-[10px] mt-6 font-bold text-[#8896a7]">Scan</span>
    </div>

    {/* 4. Saya */}
    <a href="/dashboard/mcu-saya" className="flex flex-col items-center justify-center w-[20%] text-[#8896a7]">
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
      <span className="text-[10px] mt-1 font-bold text-[#8896a7]">Saya</span>
    </a>

    {/* 5. More */}
    <button type="button" onClick={() => {
      const modal = document.getElementById('more-menu-modal');
      if (modal) modal.classList.remove('hidden');
    }} className="flex flex-col items-center justify-center w-[20%] text-[#8896a7]">
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
      <span className="text-[10px] mt-1 font-bold">More</span>
    </button>
  </div>
</div>

{/* MORE POPUP MODAL */}
<div id="more-menu-modal" className="hidden fixed inset-0 z-[60] flex items-end sm:hidden">
  <div className="absolute inset-0 bg-black/50" onClick={() => {
    const modal = document.getElementById('more-menu-modal');
    if (modal) modal.classList.add('hidden');
  }}></div>
  <div className="bg-white w-full rounded-t-[28px] p-6 relative z-10 border-t border-[#e2e8f0]">
    <div className="w-12 h-1.5 bg-[#e2e8f0] rounded-full mx-auto mb-5"></div>
    <div className="flex items-center justify-between mb-6">
      <h3 className="text-[#1a2332] font-extrabold text-base">Menu Lainnya</h3>
      <span className="text-xs text-[#8896a7]">BTM V1.7.0</span>
    </div>
    <div className="grid grid-cols-4 gap-4">
      {[
        { label: 'Leader', href: '/dashboard?menu=crew-on-duty' },
        { label: 'HR', href: '/dashboard/hr-dashboard' },
        { label: 'Safety', href: '/dashboard/monitoring-apd' },
        { label: 'Admin', href: '/dashboard/kelola-akses' },
        { label: 'Plant', href: '/dashboard/plant' },
        { label: 'Site', href: '/dashboard/monitoring-mcu' },
        { label: 'HO', href: '/dashboard/rekrutmen' }
      ].map((item) => (
        <a key={item.label} href={item.href} className="flex flex-col items-center text-center gap-1.5">
          <div className="w-12 h-12 rounded-2xl bg-[#f4f7fa] text-[#003d79] flex items-center justify-center border border-[#e2e8f0] text-sm font-black">
            {item.label.charAt(0)}
          </div>
          <span className="text-xs font-bold text-[#5a6a7e]">{item.label}</span>
        </a>
      ))}
    </div>
    <button type="button" onClick={() => {
      const modal = document.getElementById('more-menu-modal');
      if (modal) modal.classList.add('hidden');
    }} className="w-full mt-6 py-3 bg-[#f8fafc] text-[#1a2332] rounded-xl font-extrabold border border-[#e2e8f0]">
      Tutup
    </button>
  </div>
</div>
`;

let replacedCount = 0;

for (const filePath of allFiles) {
  let content = fs.readFileSync(filePath, 'utf8');
  const rel = path.relative(process.cwd(), filePath);

  // Cek apakah file ini merender bottom nav lama (mempunyai LEADER, SAFETY, HR di dalam elemen nav/fixed bottom)
  const isOldBottomNav = content.includes('SAFETY') && content.includes('LEADER') && (content.includes('fixed bottom-0') || content.includes('border-t'));

  if (isOldBottomNav) {
    console.log(`📌 Ditemukan Bottom Nav Lama di: ${rel}`);

    // Ganti container nav lama dengan newBottomNavJSX
    content = content.replace(/<div className="fixed bottom-0[\s\S]*?<\/div>\s*<\/div>/gi, newBottomNavJSX);
    content = content.replace(/<nav className="fixed bottom-0[\s\S]*?<\/nav>/gi, newBottomNavJSX);

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✅ Berhasil diganti ke 5-Menu Nav Baru!`);
    replacedCount++;
  }
}

console.log('\n=======================================================');
console.log(`🎉 PERBAIKAN SELESAI: ${replacedCount} file bottom nav lama telah diganti!`);
console.log('=======================================================');
