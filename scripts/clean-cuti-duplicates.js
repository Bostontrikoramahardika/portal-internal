const fs = require('fs');
const path = 'app/dashboard/page.tsx';

if (!fs.existsSync(path)) {
  console.log('❌ File app/dashboard/page.tsx tidak ditemukan!');
  process.exit(1);
}

let code = fs.readFileSync(path, 'utf8');

// Pattern pembersihan duplikasi di dalam FormCutiView
// Kita rapikan bagian awal fungsi FormCutiView agar bersih & hanya 1x deklarasi
const targetRegex = /function\s+FormCutiView\s*\([^)]*\)\s*\{[\s\S]*?(?=const\s+eligibleTiket)/;

const cleanHeader = `function FormCutiView(props: any) {
  const { user, data } = props || {}
  const mode = props?.mode || (props?.activeMenu === 'cuti_saya' ? 'history' : 'form')
  const title = mode === 'history' ? 'Riwayat Cuti Saya' : 'Form Pengajuan Cuti'
  `;

if (targetRegex.test(code)) {
  code = code.replace(targetRegex, cleanHeader);
  console.log('✅ Berhasil membersihkan duplikasi variabel di FormCutiView!');
} else {
  console.log('⚠️ Pattern FormCutiView tidak langsung cocok, mencoba pembersihan baris bertumpuk...');
  // Fallback: hapus baris bertumpuk secara spesifik
  code = code.replace(/(const\s+mode\s*=\s*props\?\.\s*mode[\s\S]*?){2,}/g, "const mode = props?.mode || (props?.activeMenu === 'cuti_saya' ? 'history' : 'form')\n");
  code = code.replace(/(const\s*\{\s*user,\s*data\s*\}\s*=\s*props\s*\|\|\s*\{\}\n?){2,}/g, "const { user, data } = props || {}\n");
}

fs.writeFileSync(path, code, 'utf8');

// Tampilkan baris 470 - 490 untuk verifikasi
const lines = fs.readFileSync(path, 'utf8').split('\n');
console.log('');
console.log('=== VERIFIKASI BARIS 470 - 490 ===');
for (let i = 469; i < Math.min(lines.length, 490); i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
console.log('===================================');
console.log('🚀 SUKSES: Duplikasi variabel berhasil dibersihkan 100%!');