const fs = require('fs');
const path = require('path');

const layoutPath = path.join(__dirname, '..', 'app', 'dashboard', 'layout.tsx');
const pagePath = path.join(__dirname, '..', 'app', 'dashboard', 'page.tsx');

console.log('=== 1. ISI HEADER DI LAYOUT.TSX ===');
if (fs.existsSync(layoutPath)) {
  const content = fs.readFileSync(layoutPath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    if (line.includes('header') || line.includes('BTM PORTAL') || line.includes('BTM Portal') || line.includes('NotificationBell') || line.includes('sticky')) {
      console.log('Baris ' + (index + 1) + ': ' + line.trim());
    }
  });
}

console.log('\n=== 2. MENUS CUTI & ABSENSI DI PAGE.TSX ===');
if (fs.existsSync(pagePath)) {
  const content = fs.readFileSync(pagePath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    if (line.includes('form_cuti') || line.includes('cuti_saya') || line.includes('riwayat_absensi') || line.includes('absensi_saya')) {
      console.log('Baris ' + (index + 1) + ': ' + line.trim());
    }
  });
}