const fs = require('fs');
const path = require('path');

const plantPath = path.join(process.cwd(), 'app', 'dashboard', 'plant', 'page.tsx');
const code = fs.readFileSync(plantPath, 'utf8');
const lines = code.split('\n');

console.log('=== BARIS 25 - 60 DI plant/page.tsx ===');
console.log(lines.slice(24, 60).join('\n'));

console.log('\n=== MENCARI SETIAP VARIABEL / TAMPILAN KRU ===');
lines.forEach((line, idx) => {
  if (line.includes('Rudi') || line.includes('kruList') || line.includes('mechanics') || line.includes('PLT-001')) {
    console.log(`Baris ${idx + 1}: ${line}`);
  }
});
