const fs = require('fs');
const path = 'app/components/MobileBottomNav.tsx';

if (!fs.existsSync(path)) {
  console.log('❌ File app/components/MobileBottomNav.tsx tidak ditemukan!');
  process.exit(1);
}

let code = fs.readFileSync(path, 'utf8');

// Replace container nav utama agar ber-style floating rounded-2xl
// Mencari elemen <nav ...> atau <div ... className="fixed bottom-...">
const navRegex = /<(nav|div)\s+className="[^"]*fixed\s+bottom-[^"]*"/g;

if (navRegex.test(code)) {
  // Update class container utama bottom nav
  code = code.replace(
    /className="[^"]*fixed\s+bottom-[^"]*"/g,
    'className="fixed bottom-2.5 left-2.5 right-2.5 z-50 bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-[0_8px_30px_rgba(0,61,121,0.12)] rounded-2xl px-2 py-1.5 lg:hidden"'
  );
  console.log('✅ Class bottom nav berhasil diperbarui ke Floating Rounded-2xl!');
} else {
  console.log('⚠️ Pattern container nav tidak langsung cocok, mencoba update style rounded...');
  // Fallback replace rounded-[...] / rounded-full jika ada
  code = code.replace(/rounded-\[[^\]]+\]/g, 'rounded-2xl');
  code = code.replace(/rounded-t-[^\s"]+/g, 'rounded-2xl');
}

fs.writeFileSync(path, code, 'utf8');
console.log('🚀 SUKSES: Mobile Bottom Nav sekarang serasi dengan Header Atas!');