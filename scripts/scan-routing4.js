const fs = require('fs');
const path = require('path');

const dashPath = path.join(process.cwd(), 'app/dashboard/page.tsx');
const lines = fs.readFileSync(dashPath, 'utf8').split('\n');

console.log('=== 1. STANDALONE_MENUS & AUTO_REDIRECT_MAP ===');
for (let i = 100; i < 175; i++) {
  if (lines[i]) {
    console.log(`  ${i+1}: ${lines[i].substring(0, 200)}`);
  }
}

console.log('\n=== 2. DashboardView COMPONENT (grid menu cards) ===');
let inDashView = false;
let braceCount = 0;
let dashViewStart = 0;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('function DashboardView') || lines[i].includes('const DashboardView')) {
    inDashView = true;
    dashViewStart = i;
    braceCount = 0;
    console.log(`\n  DashboardView ditemukan di Line ${i+1}`);
  }
  if (inDashView) {
    braceCount += (lines[i].match(/{/g) || []).length;
    braceCount -= (lines[i].match(/}/g) || []).length;
    // Print first 80 lines of DashboardView
    if (i - dashViewStart < 80) {
      console.log(`  ${i+1}: ${lines[i].substring(0, 200)}`);
    }
    if (braceCount <= 0 && i > dashViewStart + 5) {
      console.log(`  ... (end of DashboardView at line ${i+1})`);
      inDashView = false;
      break;
    }
  }
}

console.log('\n=== 3. /api/data/route.ts ===');
const dataApiPath = path.join(process.cwd(), 'app/api/data/route.ts');
if (fs.existsSync(dataApiPath)) {
  const apiLines = fs.readFileSync(dataApiPath, 'utf8').split('\n');
  console.log(`  Total lines: ${apiLines.length}`);
  
  // Cari menu mapping
  let inMenuMap = false;
  apiLines.forEach((line, i) => {
    if (line.includes('menu') && (line.includes('switch') || line.includes('case') || 
        line.includes('if') || line.includes('===') || line.includes('menuMap') ||
        line.includes('menuConfig') || line.includes('type'))) {
      const start = Math.max(0, i - 1);
      const end = Math.min(apiLines.length, i + 3);
      for (let j = start; j < end; j++) {
        console.log(`  ${j+1}: ${apiLines[j].substring(0, 200)}`);
      }
      console.log('  ---');
    }
  });
} else {
  console.log('  File tidak ditemukan! Cek path lain...');
  // Cek kemungkinan path lain
  const altPaths = ['app/api/data/route.js', 'app/api/data.ts'];
  altPaths.forEach(p => {
    if (fs.existsSync(path.join(process.cwd(), p))) {
      console.log(`  Ditemukan di: ${p}`);
    }
  });
}