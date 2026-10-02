const fs = require('fs');
const path = require('path');

function searchApproval(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchApproval(fullPath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('approval_center') || content.includes('FILTER JENIS PENGAJUAN') || content.includes('Semua Sudah Diproses')) {
        console.log('📍 Ditemukan file Approval Center di:', path.relative(path.join(__dirname, '..'), fullPath));
      }
    }
  }
}

console.log('\n🔎 Mencari lokasi file Approval Center asli...\n');
searchApproval(path.join(__dirname, '..', 'app'));
console.log('\n================================================================\n');