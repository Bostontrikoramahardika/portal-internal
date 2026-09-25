const fs = require('fs');
const path = require('path');

console.log('\n=== CEK KODINGAN APP/PARTS-CATALOG/PAGE.TSX ===\n');

const pcPagePath = path.join(process.cwd(), 'app/parts-catalog/page.tsx');
if (fs.existsSync(pcPagePath)) {
  const content = fs.readFileSync(pcPagePath, 'utf-8');
  console.log('Panjang file:', content.length);

  // Cari fetch url di dalam parts-catalog/page.tsx
  const fetches = content.match(/fetch\s*\(\s*[`'"].*?[`'"]/g);
  console.log('Fetch URLs di parts-catalog:', fetches);
} else {
  console.log('File parts-catalog page tidak ditemukan.');
}
