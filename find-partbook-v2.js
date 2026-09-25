const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n=== MENCARI FILE TERKAIT "PARTBOOK" DI SELURUH PROJECT ===\n');

function searchFiles(dir) {
  if (!fs.existsSync(dir)) return;
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (!item.name.startsWith('.') && item.name !== 'node_modules' && item.name !== '.next') {
        searchFiles(fullPath);
      }
    } else {
      const relPath = fullPath.replace(process.cwd(), '');
      if (relPath.toLowerCase().includes('partbook') || relPath.toLowerCase().includes('logistik')) {
        console.log('[FILE ROUTE]:', relPath);
      } else {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          if (content.toLowerCase().includes('partbook')) {
            console.log('[FILE BERISI KATA PARTBOOK]:', relPath);
          }
        } catch (e) {}
      }
    }
  }
}

searchFiles(path.join(process.cwd(), 'app'));

console.log('\n=== MENCARI DARI GIT LOG ALL COMMIT ===');
try {
  const gitLog = execSync('git log --all --name-only --oneline', { encoding: 'utf-8' });
  const lines = gitLog.split('\n');
  const matched = lines.filter(line => line.toLowerCase().includes('partbook') || line.toLowerCase().includes('logistik'));
  if (matched.length > 0) {
    console.log('Ditemukan di Git:\n', matched.join('\n'));
  } else {
    console.log('Tidak ada kata "partbook" di riwayat commit nama file.');
  }
} catch (e) {
  console.log('Error git:', e.message);
}
