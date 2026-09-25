const fs = require('fs');
const path = require('path');

console.log('\n=== 1. DAFTAR SEMUA HALAMAN (page.tsx) DI APP/ ===\n');

const foundPages = [];

function scanPages(dir, depth = 0) {
  if (!fs.existsSync(dir)) return;
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (!item.name.startsWith('.') && !item.name.startsWith('_') && item.name !== 'node_modules' && item.name !== 'api' && item.name !== 'lib') {
        scanPages(fullPath, depth + 1);
      }
    } else if (item.name === 'page.tsx') {
      const relPath = fullPath.replace(process.cwd(), '').replace(/\\/g, '/');
      const size = fs.statSync(fullPath).size;
      foundPages.push({ path: relPath, size });
    }
  }
}

scanPages(path.join(process.cwd(), 'app'));

foundPages.sort((a, b) => a.path.localeCompare(b.path));
foundPages.forEach(p => {
  console.log(`  ${p.path.padEnd(60)} ${(p.size/1024).toFixed(1)}KB`);
});

console.log(`\n TOTAL: ${foundPages.length} halaman page.tsx ditemukan\n`);

console.log('\n=== 2. CEK CONTOH KODINGAN HALAMAN REFERENSI (LAMA) ===');
console.log('Silahkan sebutkan halaman mana yang mau jadi acuan gaya seragam.\n');

// Preview 3 halaman random untuk lihat style pattern
const previewPages = [
  'app/dashboard/page.tsx',
  'app/dashboard/logistik/page.tsx',
  'app/dashboard/plant/logistik/page.tsx'
];

for (const p of previewPages) {
  const full = path.join(process.cwd(), p);
  if (fs.existsSync(full)) {
    const content = fs.readFileSync(full, 'utf-8');
    const first500 = content.substring(0, 800);
    console.log(`\n--- PREVIEW: ${p} ---`);
    console.log(first500);
    console.log('...\n');
  }
}
