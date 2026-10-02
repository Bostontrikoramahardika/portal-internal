const fs = require('fs');
const path = require('path');

console.log('=== SCAN SEMUA HALAMAN (page.tsx) DI DALAM PROJECT ===\n');

function scanPages(dir, base = '') {
  if (!fs.existsSync(dir)) return [];
  let results = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    if (item.name === 'node_modules' || item.name === '.next' || item.name === 'api') continue;
    const fullPath = path.join(dir, item.name);
    const relPath = base ? `${base}/${item.name}` : item.name;
    if (item.isDirectory()) {
      results = results.concat(scanPages(fullPath, relPath));
    } else if (item.name === 'page.tsx' || item.name === 'page.jsx' || item.name === 'page.js') {
      results.push('/' + base);
    }
  }
  return results;
}

const allPages = scanPages(path.join(process.cwd(), 'app'));
console.log('Daftar Rute Halaman yang benar-benar ADA di file project:');
allPages.sort().forEach(p => console.log('  🌐 ' + (p === '/' ? '/ (Login Page)' : p)));

console.log('\n=== CEK KONEKSI & STRUKTUR TABEL MENUS DI /api/menus/route.ts ===');
const apiMenuPath = path.join(process.cwd(), 'app/api/menus/route.ts');
if (fs.existsSync(apiMenuPath)) {
  const content = fs.readFileSync(apiMenuPath, 'utf8');
  const lines = content.split('\n');
  for (let i = 0; i < Math.min(25, lines.length); i++) {
    console.log(`  ${i+1}: ${lines[i]}`);
  }
}