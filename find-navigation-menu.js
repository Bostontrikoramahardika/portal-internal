const fs = require('fs');
const path = require('path');

const pagePath = path.join(process.cwd(), 'app', 'dashboard', 'page.tsx');
if (fs.existsSync(pagePath)) {
  const content = fs.readFileSync(pagePath, 'utf8');
  const lines = content.split('\n');
  console.log('=== MENCARI DEFINISI MENU UTAMA / SIDEBAR ===');
  lines.forEach((line, index) => {
    if (line.includes('activeMenu') || line.includes('menu ===') || line.includes('renderMenu') || line.includes('case \'plant\'') || line.includes('case "plant"')) {
      console.log(`[Baris ${index + 1}]: ${line.trim()}`);
    }
  });
}
