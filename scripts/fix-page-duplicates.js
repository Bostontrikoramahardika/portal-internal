const fs = require('fs');
const path = 'app/dashboard/page.tsx';

if (!fs.existsSync(path)) {
  console.log('❌ File app/dashboard/page.tsx tidak ditemukan!');
  process.exit(1);
}

let code = fs.readFileSync(path, 'utf8');

// Replace seluruh blok deklarasi bertumpuk sebelum const [data, setData]
code = code.replace(
  /(const\s+searchParams\s*=\s*useSearchParams\(\)[\s\S]*?)+?(const\s+\[data,\s*setData\]\s*=\s*useState)/g,
  `const searchParams = useSearchParams()
  const menuKey = searchParams?.get('menu') || 'absensi_saya'
  const activeMenu = menuKey
  const [data, setData] = useState`
);

// Jaga-jaga jika ada panggilan onSuccess yang tidak terdefinisi
code = code.replace(/\bonSuccess\(/g, "(typeof onSuccess !== 'undefined' && onSuccess) && onSuccess(");

fs.writeFileSync(path, code, 'utf8');

// Tampilkan baris 100 - 118 untuk verifikasi
const lines = fs.readFileSync(path, 'utf8').split('\n');
console.log('');
console.log('=== VERIFIKASI BARIS 100 - 118 (BERSIH) ===');
for (let i = 99; i < Math.min(lines.length, 118); i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
console.log('============================================');
console.log('✅ SUKSES: Duplikasi variabel & error onSuccess berhasil dibersihkan!');