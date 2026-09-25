const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n=== MEMERIKSA ISI DARI PARTS-CATALOG DI GIT ===');

try {
  // Cek commit sebelumnya dari parts-catalog/page.tsx
  const gitLog = execSync('git log -n 5 --oneline app/parts-catalog/page.tsx', { encoding: 'utf-8' });
  console.log('Git Log:\n', gitLog);

  // Ambil isi versi working sebelumnya (sebelum commit master-part/inspeksi)
  const prevContent = execSync('git show 2ba8d9f:app/parts-catalog/page.tsx', { encoding: 'utf-8' });
  fs.writeFileSync('parts_catalog_backup.tsx', prevContent, 'utf-8');
  console.log('\nBerhasil mengambil backup working parts-catalog dari commit 2ba8d9f (Panjang: ' + prevContent.length + ' karakter)');
} catch (e) {
  console.log('Error git show:', e.message);
}
