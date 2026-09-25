const fs = require('fs');
const path = require('path');

const pagePath = path.join(process.cwd(), 'app', 'dashboard', 'page.tsx');
if (fs.existsSync(pagePath)) {
  const content = fs.readFileSync(pagePath, 'utf8');
  const lines = content.split('\n');
  console.log('=== SEKITAR BARIS 5013 (PLANT FILTER) ===');
  const start = Math.max(0, 5000);
  const end = Math.min(lines.length, 5050);
  for (let i = start; i < end; i++) {
    console.log(`[${i + 1}]: ${lines[i]}`);
  }
}
