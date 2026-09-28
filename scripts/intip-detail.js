const fs = require('fs');
const path = require('path');

const layoutPath = path.join(__dirname, '..', 'app', 'dashboard', 'layout.tsx');
const pagePath = path.join(__dirname, '..', 'app', 'dashboard', 'page.tsx');

console.log('=== ISI DARI BARIS 50 - 78 LAYOUT.TSX ===');
if (fs.existsSync(layoutPath)) {
  const lines = fs.readFileSync(layoutPath, 'utf8').split('\n');
  lines.slice(49, 78).forEach((line, i) => console.log((i + 50) + ': ' + line));
}

console.log('\n=== DETAIL HANDLING MENU CUTI & ABSENSI DI PAGE.TSX ===');
if (fs.existsSync(pagePath)) {
  const content = fs.readFileSync(pagePath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, i) => {
    if (line.includes('FormCutiView') || line.includes('cuti_saya') || line.includes('RiwayatAbsensiCustom')) {
      console.log((i + 1) + ': ' + line.trim());
    }
  });
}