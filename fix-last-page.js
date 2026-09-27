const fs = require('fs');
const path = require('path');

console.log('=======================================================');
console.log('🧹 MEMBERSIHKAN HALAMAN TERAKHIR: monitoring-mcu/[id]');
console.log('=======================================================\n');

const targetPath = path.join(process.cwd(), 'app', 'dashboard', 'monitoring-mcu', '[id]', 'page.tsx');

if (fs.existsSync(targetPath)) {
  let content = fs.readFileSync(targetPath, 'utf8');

  // Hapus button Kembali mandiri jika PageHeader sudah ada
  content = content.replace(
    /<button[^>]*onClick=\{\(\) => (?:router\.back|history\.back)\(\)\}[^>]*>[\s\S]*?Kembali[\s\S]*?<\/button>/gi,
    ''
  );

  fs.writeFileSync(targetPath, content, 'utf8');
  console.log('✅ Berhasil dibersihkan: monitoring-mcu/[id]/page.tsx');
} else {
  console.log('⚠️ File tidak ditemukan, lanjut verifikasi...');
}

console.log('\n=======================================================');
