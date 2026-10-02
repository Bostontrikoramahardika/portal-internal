const fs = require('fs');
const path = require('path');

console.log('=== 1. SCAN API ENDPOINTS (Indikator Fitur di Sistem) ===');
function getApis(dir, prefix = '') {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let apis = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      apis = apis.concat(getApis(fullPath, `${prefix}/${entry.name}`));
    } else if (entry.name === 'route.ts' || entry.name === 'route.js') {
      apis.push(prefix || '/');
    }
  }
  return apis;
}
const apiList = getApis(path.join(process.cwd(), 'app/api'));
apiList.forEach(a => console.log('  -> /api' + a));

console.log('\n=== 2. SCAN SUB-VIEWS DI DASHBOARD (app/dashboard/page.tsx) ===');
const dashPagePath = path.join(process.cwd(), 'app/dashboard/page.tsx');
if (fs.existsSync(dashPagePath)) {
  const content = fs.readFileSync(dashPagePath, 'utf8');
  
  // Cari deklarasi activeTab / menu_key / render views
  const matches = content.match(/activeTab\s*===\s*['"][a-zA-Z0-9_-]+['"]/g) || [];
  const uniqueTabs = [...new Set(matches.map(m => m.replace(/activeTab\s*===\s*['"]/, '').replace(/['"]/, '')))];
  console.log('Daftar activeTab / View Keys yang terpasang di dashboard:');
  uniqueTabs.forEach(tab => console.log('  -> ' + tab));

  // Cari komponen / section yang di-render
  console.log('\nKeyword fitur yang ada di file:');
  const keywords = ['mcu', 'partbook', 'part', 'catalog', 'mom', 'meeting', 'apd', 'pkwt', 'pelatihan', 'training', 'slip', 'gaji', 'lembur', 'overtime', 'resign', 'koreksi', 'tim', 'inventaris', 'kendaraan', 'reimburse', 'klaim', 'peminjaman'];
  keywords.forEach(kw => {
    const reg = new RegExp(kw, 'i');
    if (reg.test(content)) {
      console.log(`  [DITEMUKAN KODE] Terkait: "${kw}"`);
    }
  });
}