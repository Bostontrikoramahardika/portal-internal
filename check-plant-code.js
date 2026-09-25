const fs = require('fs');
const path = require('path');

const plantPath = path.join(process.cwd(), 'app', 'dashboard', 'plant', 'page.tsx');
if (!fs.existsSync(plantPath)) {
  console.log('❌ File tidak ditemukan');
  process.exit(1);
}

const code = fs.readFileSync(plantPath, 'utf8');

console.log('=== MEMERIKSA TERSISANYA DATA STAM/DUMMY DI plant/page.tsx ===');
console.log('Rudi Hermawan ditemukan?:', code.includes('Rudi Hermawan'));
console.log('Budi Santoso ditemukan?:', code.includes('Budi Santoso'));
console.log('fetchKruReal ditemukan?:', code.includes('fetchKruReal'));
console.log('api/plant/kru ditemukan?:', code.includes('/api/plant/kru'));

// Cari bagian JSX tempat Kru Plant di-render
const kruRenderMatch = code.match(/activeTab === ['"]KRU_WORKSHOP['"][\s\S]*?<\/div>\s*<\/div>/);
if (kruRenderMatch) {
  console.log('\n=== RENDERING KRU_WORKSHOP TAB SAAT INI ===');
  console.log(kruRenderMatch[0].slice(0, 1000));
} else {
  console.log('\n⚠️ Block activeTab KRU_WORKSHOP tidak ditemukan secara spesifik, mencetak baris 100-200...');
  console.log(code.split('\n').slice(99, 200).join('\n'));
}
