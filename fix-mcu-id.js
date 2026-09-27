const fs = require('fs');
const path = require('path');

console.log('=======================================================');
console.log('🔬 INSPEKSI & FIX DENGAN AKURAT: monitoring-mcu/[id]');
console.log('=======================================================\n');

const filePath = path.join(process.cwd(), 'app', 'dashboard', 'monitoring-mcu', '[id]', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Tampilkan semua baris yang mengandung 'back' atau 'Kembali' atau 'PageHeader'
const lines = content.split('\n');
console.log('--- BARIS YANG DITEMUKAN ---');
lines.forEach((line, idx) => {
  if (line.includes('back') || line.includes('Kembali') || line.includes('PageHeader')) {
    console.log(`L${idx + 1}: ${line.trim()}`);
  }
});

// Jika ada PageHeader dan tombol back manual lainnya, kita buang tombol manualnya
// Hapus tombol kembali berbentuk Link atau button dengan router.back()
content = content.replace(/<Link[^>]*href="\/dashboard\/monitoring-mcu"[^>]*>[\s\S]*?Kembali[\s\S]*?<\/Link>/gi, '');
content = content.replace(/<button[^>]*onClick=\{[^}]*router\.back[^}]*\}[^>]*>[\s\S]*?<\/button>/gi, '');

fs.writeFileSync(filePath, content, 'utf8');
console.log('\n✅ Perbaikan tombol ganda pada monitoring-mcu/[id] selesai!');
console.log('=======================================================');
