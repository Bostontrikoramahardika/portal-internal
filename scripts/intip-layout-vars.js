const fs = require('fs');
const path = require('path');

const layoutPath = path.join(__dirname, '..', 'app', 'dashboard', 'layout.tsx');
if (fs.existsSync(layoutPath)) {
  const lines = fs.readFileSync(layoutPath, 'utf8').split('\n');
  console.log('=== IMPORTS & VARIABLES IN LAYOUT.TSX (Baris 1-50) ===');
  lines.slice(0, 50).forEach((line, i) => console.log((i + 1) + ': ' + line));
}