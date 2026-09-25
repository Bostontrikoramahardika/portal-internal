const fs = require('fs');
const path = require('path');

const plantPath = path.join(process.cwd(), 'app', 'dashboard', 'plant', 'page.tsx');
const code = fs.readFileSync(plantPath, 'utf8');
const lines = code.split('\n');

console.log('=== TEMPAT NAMA DUMMY DITEMUKAN DI plant/page.tsx ===');
lines.forEach((line, index) => {
  if (line.includes('Rudi') || line.includes('Budi') || line.includes('Agus') || line.includes('Dedi')) {
    console.log(`Baris ${index + 1}: ${line.trim()}`);
  }
});
