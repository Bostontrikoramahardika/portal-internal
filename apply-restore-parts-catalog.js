const fs = require('fs');
const path = require('path');

const backupPath = path.join(process.cwd(), 'parts_catalog_backup.tsx');
const targetPath = path.join(process.cwd(), 'app/parts-catalog/page.tsx');

if (fs.existsSync(backupPath)) {
  const content = fs.readFileSync(backupPath, 'utf-8');
  fs.writeFileSync(targetPath, content, 'utf-8');
  console.log('\nBERHASIL: File app/parts-catalog/page.tsx telah dikembalikan 100% ke versi commit 2ba8d9f!');
} else {
  console.log('\nERROR: Backup file parts_catalog_backup.tsx tidak ditemukan.');
}
