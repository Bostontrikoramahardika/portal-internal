const { execSync } = require('child_process');

try {
  console.log('=== 1. RIWAYAT COMMIT FILE LAYOUT.TSX ===');
  const log = execSync('git log -n 5 --oneline app/dashboard/layout.tsx', { encoding: 'utf8' });
  console.log(log);

  console.log('=== 2. ISI HEADER ASLI DARI GIT (SEBELUM DIUBAH HARI INI) ===');
  const gitLayout = execSync('git show HEAD:app/dashboard/layout.tsx', { encoding: 'utf8' });
  
  const headerMatch = gitLayout.match(/<header[\s\S]*?<\/header>/);
  if (headerMatch) {
    console.log(headerMatch[0]);
  } else {
    console.log('Tag header tidak ditemukan di version HEAD, mengecek commit 412d7a3...');
    try {
      const commitLayout = execSync('git show 412d7a3:app/dashboard/layout.tsx', { encoding: 'utf8' });
      const cMatch = commitLayout.match(/<header[\s\S]*?<\/header>/);
      if (cMatch) console.log(cMatch[0]);
    } catch (e2) {
      console.log('Commit 412d7a3 tidak ditemukan lokal.');
    }
  }
} catch (e) {
  console.error('Gagal membaca Git:', e.message);
}
