const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n=== MEMERIKSA RIWAYAT / GIT KHUSUS APP/DASHBOARD/PLANT/PAGE.TSX ===');

try {
  const gitLog = execSync('git log -n 5 --oneline app/dashboard/plant/page.tsx', { encoding: 'utf-8' });
  console.log('Git Log:\n', gitLog);

  // Cek commit sebelumnya dari file tersebut
  const prevFile = execSync('git show HEAD~1:app/dashboard/plant/page.tsx', { encoding: 'utf-8' });
  console.log('\n--- ISI LAMA DARI GIT (HEAD~1) FOUND! ---');
  fs.writeFileSync('prev_plant_page.tsx', prevFile, 'utf-8');
  console.log('Berhasil menyimpan cadangan lama ke "prev_plant_page.tsx"');
} catch (e) {
  console.log('Tidak ada riwayat git commit sebelumnya atau git belum di-commit.');
}
