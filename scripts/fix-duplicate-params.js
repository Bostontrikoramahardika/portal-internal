const fs = require('fs');
const path = 'app/dashboard/page.tsx';

if (!fs.existsSync(path)) {
  console.log('❌ File app/dashboard/page.tsx tidak ditemukan!');
  process.exit(1);
}

let code = fs.readFileSync(path, 'utf8');

// Hapus duplikasi searchParams & selaraskan activeMenu dengan menuKey
code = code.replace(
  /const searchParams = useSearchParams\(\)\s*const activeMenu = searchParams\?\.get\('menu'\) \|\| 'absensi_saya'\s*const searchParams = useSearchParams\(\)/g,
  "const searchParams = useSearchParams()\n  const menuKey = searchParams?.get('menu') || 'absensi_saya'\n  const activeMenu = menuKey"
);

// Fallback ganti jika format whitespace sedikit berbeda
code = code.replace(
  /const searchParams = useSearchParams\(\)\n\s*const activeMenu = searchParams\?\.get\('menu'\) \|\| 'absensi_saya'\n\s*const searchParams = useSearchParams\(\)/g,
  "const searchParams = useSearchParams()\n  const menuKey = searchParams?.get('menu') || 'absensi_saya'\n  const activeMenu = menuKey"
);

fs.writeFileSync(path, code, 'utf8');

console.log('✅ SUKSES: Duplikasi searchParams berhasil dibersihkan!');