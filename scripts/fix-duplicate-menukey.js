const fs = require('fs');
const path = 'app/dashboard/page.tsx';

if (!fs.existsSync(path)) {
  console.log('❌ File app/dashboard/page.tsx tidak ditemukan!');
  process.exit(1);
}

let code = fs.readFileSync(path, 'utf8');

// Bersihkan duplikasi menuKey & searchParams
code = code.replace(
  /const searchParams = useSearchParams\(\)[\s\S]*?const activeMenu = menuKey[\s\S]*?const menuKey = searchParams\.get\('menu'\) \|\| 'absensi_saya'/g,
  "const searchParams = useSearchParams()\n  const menuKey = searchParams?.get('menu') || 'absensi_saya'\n  const activeMenu = menuKey"
);

fs.writeFileSync(path, code, 'utf8');

// Verifikasi baris 105 - 120
const lines = fs.readFileSync(path, 'utf8').split('\n');
console.log('=== VERIFIKASI BARIS 105 - 120 ===');
for (let i = 104; i < Math.min(lines.length, 120); i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
console.log('===================================');
console.log('✅ SUKSES: Duplikasi menuKey berhasil dibersihkan!');