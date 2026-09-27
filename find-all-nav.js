const fs = require('fs');
const path = require('path');

console.log('=======================================================');
console.log('🔍 DIAGNOSTIK: MENCARI LOKASI SEMUA BOTTOM NAV');
console.log('=======================================================\n');

function getFiles(dir, list = []) {
  if (!fs.existsSync(dir)) return list;
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (f !== 'node_modules' && f !== '.next') getFiles(full, list);
    } else if (f.endsWith('.tsx') || f.endsWith('.jsx') || f.endsWith('.ts') || f.endsWith('.js')) {
      list.push(full);
    }
  }
  return list;
}

const allFiles = [
  ...getFiles(path.join(process.cwd(), 'app')),
  ...getFiles(path.join(process.cwd(), 'components'))
];

console.log('📌 LIST FILE YANG MEMILIKI NAVIGATION / BOTTOM NAV:');
let found = 0;

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const rel = path.relative(process.cwd(), file);

  const hasBottomNavKeywords = 
    (content.includes('ABSENSI') || content.includes('Absensi')) &&
    (content.includes('PENGAJUAN') || content.includes('Pengajuan')) &&
    (content.includes('LEADER') || content.includes('Leader')) &&
    (content.includes('SAFETY') || content.includes('Safety'));

  const hasBottomClass = content.includes('fixed bottom-0') || content.includes('MobileBottomNav');

  if (hasBottomNavKeywords || hasBottomClass) {
    console.log(`\n📁 File: ${rel}`);
    if (content.includes('MobileBottomNav')) console.log('   - Menggunakan MobileBottomNav');
    if (hasBottomNavKeywords) console.log('   - Mengandung kata kunci menu lama (LEADER, SAFETY, dll)');
    if (content.includes('fixed bottom-0')) console.log('   - Mengandung CSS "fixed bottom-0"');
    found++;
  }
}

console.log('\n-------------------------------------------------------');
console.log(`Total file terdeteksi: ${found}`);
console.log('=======================================================');
