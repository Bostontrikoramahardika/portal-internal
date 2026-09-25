const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n=== MENCARI FILE & SUBFOLDER TENTANG PARTBOOK / LOGISTIK ===');

function searchDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const f of files) {
    const res = path.resolve(dir, f.name);
    if (f.isDirectory()) {
      searchDir(res);
    } else {
      if (res.toLowerCase().includes('partbook') || res.toLowerCase().includes('part')) {
        console.log('File ditemukan:', res.replace(process.cwd(), ''));
      }
    }
  }
}

searchDir(path.join(process.cwd(), 'app/dashboard/plant'));

console.log('\n=== MENCARI DI GIT COMMIT RIWAYAT FILE LOGISTIK / PARTBOOK ===');
try {
  const gitFiles = execSync('git log --all --name-only --oneline | grep -i "partbook"', { encoding: 'utf-8' });
  console.log('Git history partbook files:\n', gitFiles);
} catch (e) {
  console.log('Pencarian git selesai.');
}
