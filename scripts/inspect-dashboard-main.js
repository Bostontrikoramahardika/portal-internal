const fs = require('fs');
const path = require('path');

const pagePath = path.join(process.cwd(), 'app', 'dashboard', 'page.tsx');
if (fs.existsSync(pagePath)) {
  const content = fs.readFileSync(pagePath, 'utf8');
  console.log("=== CHECK MENU KEYS DI APP/DASHBOARD/PAGE.TSX ===");
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('menuKey') || line.includes('case') || line.includes('render') || line.includes('menu') || line.includes('import')) {
      if (idx < 250) console.log('Line ' + (idx + 1) + ': ' + line.trim().slice(0, 120));
    }
  });
}
