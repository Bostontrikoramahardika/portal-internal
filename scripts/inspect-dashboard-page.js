const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'app', 'dashboard', 'page.tsx');
if (fs.existsSync(filePath)) {
  const content = fs.readFileSync(filePath, 'utf8');
  console.log(`📄 Ukuran app/dashboard/page.tsx: ${content.length} karakter`);
  console.log('--- Potongan Awal File ---');
  console.log(content.slice(0, 1000));
} else {
  console.log('❌ File tidak ditemukan');
}