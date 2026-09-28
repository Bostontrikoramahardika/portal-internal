const fs = require('fs');
const path = 'app/components/MobileBottomNav.tsx';

if (!fs.existsSync(path)) {
  console.log('❌ File app/components/MobileBottomNav.tsx tidak ditemukan!');
  process.exit(1);
}

let code = fs.readFileSync(path, 'utf8');

// 1. Tambahkan fungsi handleLogout jika belum ada
if (!code.includes('async function handleLogout') && !code.includes('const handleLogout')) {
  const logoutFunc = `
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
`;
  
  // Inject sebelum return
  code = code.replace(/return\s*\(/, `${logoutFunc}\n  return (`);
}

// 2. Tambahkan Tombol Keluar di Drawer Bottom Sheet
const logoutBtnJsx = `
            {/* Tombol Keluar Aplikasi khusus Tab Saya */}
            {(activeTab === 'saya' || activeTab === 'profile' || drawerTitle?.toLowerCase()?.includes('saya')) && (
              <button
                type="button"
                onClick={handleLogout}
                className="w-full mt-4 p-3.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200/80 text-rose-600 font-bold text-xs flex items-center justify-center gap-2.5 transition-all active:scale-95 shadow-xs"
              >
                <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Keluar Aplikasi</span>
              </button>
            )}
`;

if (!code.includes('Keluar Aplikasi')) {
  // Sisipkan di dalam container drawer sebelum penutup div grid/drawer
  code = code.replace(/(<\/div>\s*<\/div>\s*<\/div>\s*<\/div>)/, `${logoutBtnJsx}\n$1`);
  if (!code.includes('Keluar Aplikasi')) {
    // Fallback: sisipkan sebelum penutup drawer modal
    code = code.replace(/(<\/div>\s*<\/div>\s*\{\/\*\s*MODAL|\n\s*<\/div>\s*<\/div>\s*<\/nav>)/, `${logoutBtnJsx}\n$1`);
  }
}

fs.writeFileSync(path, code, 'utf8');
console.log('✅ SUKSES: Tombol Keluar Aplikasi berhasil dikembalikan di Menu Saya!');