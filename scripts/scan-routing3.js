const fs = require('fs');
const path = require('path');

const dashPath = path.join(process.cwd(), 'app/dashboard/page.tsx');
const lines = fs.readFileSync(dashPath, 'utf8').split('\n');

console.log('=== 1. SEMUA FETCH / API CALL DI PAGE.TSX ===');
lines.forEach((line, i) => {
  if ((line.includes('fetch(') || line.includes('axios') || line.includes('/api/')) && 
      !line.trim().startsWith('//') && !line.trim().startsWith('*')) {
    console.log(`  Line ${i+1}: ${line.trim().substring(0, 180)}`);
  }
});

console.log('\n=== 2. FUNGSI loadData / loadMenu / fetchData ===');
let inFunc = false;
let funcName = '';
let funcStart = 0;
let braceCount = 0;

lines.forEach((line, i) => {
  if (!inFunc) {
    if (line.includes('loadData') || line.includes('loadMenu') || line.includes('fetchData') || 
        line.includes('loadMenus') || line.includes('fetchMenu')) {
      if (line.includes('const ') || line.includes('async ') || line.includes('function ') || line.includes('useCallback')) {
        inFunc = true;
        funcName = line.trim().substring(0, 80);
        funcStart = i;
        braceCount = 0;
        console.log(`\n  --- ${funcName} (Line ${i+1}) ---`);
      }
    }
  }
  if (inFunc) {
    braceCount += (line.match(/{/g) || []).length;
    braceCount -= (line.match(/}/g) || []).length;
    if (i - funcStart < 25) {
      console.log(`  ${i+1}: ${line.substring(0, 180)}`);
    }
    if (braceCount <= 0 && i > funcStart) {
      inFunc = false;
    }
  }
});

console.log('\n=== 3. DATA TYPE HANDLING (data.type === ...) ===');
lines.forEach((line, i) => {
  if (line.includes('data.type') || line.includes('.type ===')) {
    const start = Math.max(0, i - 1);
    const end = Math.min(lines.length, i + 2);
    for (let j = start; j < end; j++) {
      console.log(`  ${j+1}: ${lines[j].substring(0, 180)}`);
    }
    console.log('  ---');
  }
});

console.log('\n=== 4. STATE & DATA STRUCTURE ===');
lines.forEach((line, i) => {
  if (i < 150 && (line.includes('useState') || line.includes('useEffect') || line.includes('useRef'))) {
    console.log(`  Line ${i+1}: ${line.trim().substring(0, 180)}`);
  }
});

console.log('\n=== 5. RENDER MENU GRID (bagian awal return) ===');
// Cari bagian yang render menu cards / grid di awal komponen utama
for (let i = 200; i < 400; i++) {
  if (lines[i] && (lines[i].includes('grid') || lines[i].includes('card') || 
      lines[i].includes('menu') || lines[i].includes('onClick') || 
      lines[i].includes('router.push') || lines[i].includes('setMenu'))) {
    console.log(`  Line ${i+1}: ${lines[i].substring(0, 180)}`);
  }
}

console.log('\n=== 6. BAGIAN RENDER BERDASARKAN menuKey ===');
for (let i = 100; i < 300; i++) {
  if (lines[i] && (lines[i].includes('menuKey') || lines[i].includes('activeMenu'))) {
    const start = Math.max(0, i - 2);
    const end = Math.min(lines.length, i + 5);
    console.log(`\n  --- Line ${i+1} ---`);
    for (let j = start; j < end; j++) {
      console.log(`  ${j+1}: ${lines[j].substring(0, 180)}`);
    }
  }
}