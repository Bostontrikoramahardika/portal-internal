const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

console.log('=======================================================');
console.log('🚑 RESTORING DYNAMIC TABS & FIXING UI SPACING');
console.log('=======================================================');

// 1. Tarik file layout original sebelum terhapus logikanya (commit 7607872)
try {
    execSync('git checkout 7607872 app/dashboard/layout.tsx');
    console.log('✅ File original berhasil ditarik dari Git history.');
} catch (e) {
    console.log('⚠️ Gagal checkout dari 7607872, mencoba HEAD~1...');
    execSync('git checkout HEAD~1 app/dashboard/layout.tsx');
}

let content = fs.readFileSync('app/dashboard/layout.tsx', 'utf8');

// 2. Pastikan import komponen benar
content = content.replace(/@\/app\/components\/SyncIndicator/g, '@/app/dashboard/components/SyncIndicator');
content = content.replace(/@\/app\/components\/ClockOutReminder/g, '@/app/dashboard/components/ClockOutReminder');
content = content.replace(/@\/app\/components\/VerificationModal/g, '@/app/dashboard/components/VerificationModal');
content = content.replace(/@\/app\/context\/AuthContext/g, '@/app/lib/AuthContext');

// 3. Hapus hardcoded MobileBottomNav karena kita pakai TAB_CONFIG bawaan
content = content.replace(/import MobileBottomNav from '[^']+';\r?\n?/g, '');
content = content.replace(/<MobileBottomNav \/>/g, '');

// 4. Pisah area konten untuk diperbaiki UI-nya tanpa sentuh fungsi
const partsMain = content.split('{/* HEADER MOBILE */}');
const partsNav = partsMain[1].split('{/* BOTTOM NAVIGATION MOBILE */}');

// PERBAIKAN 1: Header jadi tipis (py-2), compact, dan tidak makan layar
const headerBlock = `
        <div className="lg:hidden bg-[#003d79] px-3 py-2 flex items-center justify-between fixed top-0 left-0 right-0 z-[60] shadow-md border-b border-[#002a57]">
          {/* Kiri: Logo + Nama App + Versi (Kompak) */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center p-0.5 shadow-sm">
              <Image src="/btm-fix.png" alt="BTM" width={16} height={16} className="object-contain" />
            </div>
            <div className="leading-[1.1]">
              <h1 className="text-[11px] font-black uppercase text-white tracking-tight">BTM Mobile</h1>
              <p className="text-[8px] font-bold text-blue-200">V1.7.0</p>
            </div>
          </div>

          {/* Kanan: Info Karyawan + Lonceng (Baris Rapat) */}
          <div className="flex items-center gap-2">
            <div className="text-right leading-[1.1] shrink-0 max-w-[140px]">
              <div className="text-[10px] font-black text-white uppercase truncate">{user.nama}</div>
              <div className="text-[8px] text-blue-200 font-bold">NRP: {user.nrp_login || user.nrp}</div>
            </div>
            <button 
              type="button"
              onClick={() => setIsNotifOpen(true)} 
              className="relative flex items-center justify-center active:scale-90 transition-all cursor-pointer z-[70] shrink-0 bg-white/10 p-1.5 rounded-lg"
            >
              <span className="text-lg">🔔</span>
              {notifCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black h-3.5 w-3.5 flex items-center justify-center rounded-full border border-[#003d79] shadow-lg pointer-events-none">
                  {notifCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Kurangi padding top supaya konten naik ke atas (pt-14) */}
        <div className="p-3 lg:p-6 pt-14 lg:pt-6">
          <AuthProvider user={{ ...user, is_super_admin: isSuperAdmin }} permissions={userPermissions}>
            {children}
          </AuthProvider>
        </div>
      </main>

`;

// PERBAIKAN 2: Bottom Nav Solid Putih, Tidak Mengambang, Tidak Blur
let bottomNavBlock = partsNav[1].split('{/* BOTTOM SHEET MENU */}')[0];
bottomNavBlock = bottomNavBlock.replace(
  /className="lg:hidden fixed bottom-3 left-3 right-3 z-50 bg-white\/70 backdrop-blur-2xl border border-white\/50 flex overflow-x-auto px-2 py-2 rounded-\[1\.8rem\] shadow-\[0_10px_40px_rgba\(0,61,121,0\.15\)\] no-scrollbar"/g,
  'className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 flex overflow-x-auto px-1 py-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] no-scrollbar justify-between items-center"'
);
bottomNavBlock = bottomNavBlock.replace(/w-11 h-11/g, 'w-10 h-10'); // Kecilkan tombol scan sedikit

// PERBAIKAN 3: Bottom Sheet (Laci) berfungsi kembali untuk render sub-menu secara dinamis!
const partsSheet = partsNav[1].split('{/* BOTTOM SHEET MENU */}')[1].split('{/* MODAL NOTIFICATION */}');
const cleanBottomSheetBlock = `
      {bottomSheetOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/50 z-[100] lg:hidden transition-opacity" onClick={() => setBottomSheetOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[28px] z-[101] lg:hidden p-5 shadow-2xl animate-in slide-in-from-bottom-full duration-200">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-5"></div>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-slate-800 font-extrabold text-sm uppercase tracking-tight">{bottomSheetTitle}</h3>
              <button onClick={() => setBottomSheetOpen(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-1.5 rounded-full">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            {/* Loping render menu original bawaan kamu */}
            <div className="grid grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto no-scrollbar pb-4">
              {bottomSheetMenus.map(m => (
                <button 
                  key={m.menu_key}
                  onClick={() => navigateMenu(m.menu_key)}
                  className="flex flex-col items-center text-center gap-1.5 group active:scale-95 transition-transform"
                >
                  <div className="w-12 h-12 rounded-[16px] bg-[#f4f7fa] text-[#003d79] flex items-center justify-center border border-[#e2e8f0] group-hover:bg-[#003d79] group-hover:text-white transition-colors shadow-sm">
                    <span className="text-xl font-bold">{m.menu_icon || m.menu_label.charAt(0)}</span>
                  </div>
                  <span className="text-[9px] font-bold text-slate-600 leading-tight line-clamp-2 px-1">{m.menu_label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
`;

content = partsMain[0] + 
          '{/* HEADER MOBILE */}\n' + headerBlock + 
          '{/* BOTTOM NAVIGATION MOBILE */}\n' + bottomNavBlock + 
          '{/* BOTTOM SHEET MENU */}\n' + cleanBottomSheetBlock + 
          '\n      {/* MODAL NOTIFICATION */}' + partsSheet[1];

fs.writeFileSync('app/dashboard/layout.tsx', content, 'utf8');

console.log('✅ UI Header dirapikan (Tipis & Compact).');
console.log('✅ Bottom Sheet dinamis (Laci Sub-menu) BERHASIL DIKEMBALIKAN!');
console.log('=======================================================');
