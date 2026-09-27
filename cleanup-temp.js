const fs = require('fs');
const path = require('path');

console.log('=======================================================');
console.log('🧹 PEMBERSIHAN FILE TEMPORER & TEST BUILD');
console.log('=======================================================\n');

// Hapus file backup .bak yang sempat dibuat
function removeBakFiles(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next') {
        removeBakFiles(fullPath);
      }
    } else if (file.includes('.bak-')) {
      fs.unlinkSync(fullPath);
      console.log(`  🗑️ Dihapus: ${path.relative(process.cwd(), fullPath)}`);
    }
  }
}

removeBakFiles(path.join(process.cwd(), 'app'));
console.log('\n✅ File temporer berhasil dibersihkan.');
console.log('=======================================================');
