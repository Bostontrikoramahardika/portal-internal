const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
        results = results.concat(walk(fullPath));
      }
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(fullPath);
      }
    }
  });
  return results;
}

console.log('Scanning files...');
const files = walk(process.cwd());

console.log('=== FILE DENGAN NAMA "plant" ATAU "logistik" ===');
files.forEach(f => {
  const lower = f.toLowerCase();
  if (lower.includes('plant') || lower.includes('logistik')) {
    console.log(path.relative(process.cwd(), f));
  }
});

console.log('=== MENCARI KATA "Plant" DI DALAM FILE UTAMA ===');
const dashboardPage = path.join(process.cwd(), 'app', 'dashboard', 'page.tsx');
if (fs.existsSync(dashboardPage)) {
  const content = fs.readFileSync(dashboardPage, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    if (line.includes('menu ===') || line.includes('activeMenu') || line.includes('activeTab') || line.includes('"plant"') || line.includes("'plant'")) {
      console.log(`[page.tsx:${index + 1}] ${line.trim()}`);
    }
  });
}
