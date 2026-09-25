const fs = require('fs');
const path = require('path');

console.log("=== PENCARIAN HALAMAN / ROUTE INSPEKSI UNIT ===");
function findFiles(dir) {
  if (!fs.existsSync(dir)) return;
  const items = fs.readdirSync(dir);
  items.forEach(item => {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      findFiles(full);
    } else {
      if (item.includes('inspeksi') || item.includes('p2h') || item.includes('check')) {
        console.log(`📄 Ditemukan: ${full}`);
      }
    }
  });
}
findFiles('./app');
