const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, '..', 'app', 'dashboard', 'page.tsx');
if (fs.existsSync(pagePath)) {
  const lines = fs.readFileSync(pagePath, 'utf8').split('\n');
  console.log('=== ROUTING CUTI DI PAGE.TSX ===');
  lines.forEach((line, i) => {
    if (line.includes('form_cuti') || line.includes('cuti_saya')) {
      console.log((i + 1) + ': ' + line.trim());
    }
  });
}