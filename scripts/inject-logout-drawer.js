const fs = require('fs');
const path = 'app/components/MobileBottomNav.tsx';

if (!fs.existsSync(path)) {
  console.log('❌ File MobileBottomNav.tsx tidak ditemukan!');
  process.exit(1);
}

let code = fs.readFileSync(path, 'utf8');

// Fungsi Logout aman
const logoutFunction = `
  async function handleLogout() {
    try {
      const { clearAuthCache } = await import('@/app/lib/auth-cache');
      clearAuthCache();
    } catch {}
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('btm_session_token_v1');
        localStorage.removeItem('btm_user_cache_v1');
        localStorage.removeItem('btm_user_v1');
        localStorage.removeItem('btm_menus_v1');
        localStorage.removeItem('btm_menus_time_v1');
      }
    } catch {}
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    window.location.href = '/';
  }
`;

// Inject handleLogout
if (!code.includes('handleLogout')) {
  code = code.replace(/const\s+closeDrawer\s*=/, `${logoutFunction}\n  const closeDrawer =`);
}

// Tombol Logout JSX di dalam Bottom Sheet
const logoutButtonJsx = `
            {/* Tombol Keluar khusus Drawer Saya */}
            {activeTab === 'saya' && (
              <div className="mt-4 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full py-3 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200/80 text-rose-600 font-bold text-xs flex items-center justify-center gap-2.5 transition-all active:scale-95 shadow-xs"
                >
                  <svg className="w-4 h-4 text-rose-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Keluar Aplikasi</span>
                </button>
              </div>
            )}`;

// Inject sebelum penutup elemen container drawer modal
if (!code.includes('Tombol Keluar khusus Drawer Saya')) {
  // Cari tempat render items di drawer (setelah grid currentItems atau sebelum penutup sheet container)
  const drawerEndRegex = /(\s*<\/div>\s*<\/div>\s*<\/div>\s*\{\/\*\s*Fixed Bottom Nav)/;
  if (drawerEndRegex.test(code)) {
    code = code.replace(drawerEndRegex, `${logoutButtonJsx}\n$1`);
    console.log('✅ Tombol Keluar disuntikkan sebelum penutup Drawer Sheet');
  } else {
    // Fallback: cari penutup currentItems map
    code = code.replace(/(currentItems\.map[\s\S]*?<\/Link>\s*\}\)\s*<\/div>)/, `$1\n${logoutButtonJsx}`);
    console.log('✅ Tombol Keluar disuntikkan di bawah grid currentItems');
  }
}

fs.writeFileSync(path, code, 'utf8');
console.log('🚀 SUKSES: Tombol Keluar Aplikasi telah berhasil ditambahkan di Drawer Saya!');