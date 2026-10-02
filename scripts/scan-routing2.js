const fs = require('fs');
const path = require('path');

const dashPath = path.join(process.cwd(), 'app/dashboard/page.tsx');
const lines = fs.readFileSync(dashPath, 'utf8').split('\n');

console.log('=== 1. BAGAIMANA activeMenu DIDAPATKAN ===');
lines.forEach((line, i) => {
  if (line.includes('activeMenu') || line.includes('searchParams')) {
    console.log(`  Line ${i+1}: ${line.trim().substring(0, 150)}`);
  }
});

console.log('\n=== 2. DEFAULT VIEW (Saat activeMenu kosong) ===');
// Cari pattern: !activeMenu, activeMenu === null, activeMenu === '', default
lines.forEach((line, i) => {
  if (line.includes('!activeMenu') || 
      line.includes("activeMenu === ''") || 
      line.includes('activeMenu === null') ||
      line.includes("activeMenu === 'home'") ||
      line.includes("activeMenu === 'dashboard'") ||
      (line.includes('default') && line.includes('activeMenu'))) {
    const start = Math.max(0, i - 2);
    const end = Math.min(lines.length, i + 5);
    console.log(`\n  --- Sekitar Line ${i+1} ---`);
    for (let j = start; j < end; j++) {
      console.log(`  ${j+1}: ${lines[j].substring(0, 150)}`);
    }
  }
});

console.log('\n=== 3. MENU GRID CARDS (Tombol utama dashboard) ===');
// Cari pattern grid menu: biasanya ada array map atau grid layout
let inGridSection = false;
let gridStart = 0;
lines.forEach((line, i) => {
  const lower = line.toLowerCase();
  if ((lower.includes('grid') && lower.includes('menu')) ||
      (lower.includes('menu') && lower.includes('card')) ||
      (lower.includes('menu') && lower.includes('grid')) ||
      (lower.includes('dashboard') && lower.includes('grid')) ||
      (lower.includes('menuitems') || lower.includes('menu_items') || lower.includes('griditems') || lower.includes('grid_items') || lower.includes('menulist') || lower.includes('menu_list'))) {
    const start = Math.max(0, i - 1);
    const end = Math.min(lines.length, i + 3);
    console.log(`\n  --- Line ${i+1} ---`);
    for (let j = start; j < end; j++) {
      console.log(`  ${j+1}: ${lines[j].substring(0, 180)}`);
    }
  }
});

console.log('\n=== 4. SEMUA CONDITIONAL RENDER (if/switch menu) ===');
let condCount = 0;
lines.forEach((line, i) => {
  if (line.includes('activeMenu') && (line.includes('===') || line.includes('!==') || line.includes('?') || line.includes('case'))) {
    condCount++;
    const start = Math.max(0, i - 1);
    const end = Math.min(lines.length, i + 8);
    console.log(`\n  --- Conditional #${condCount} di Line ${i+1} ---`);
    for (let j = start; j < end; j++) {
      console.log(`  ${j+1}: ${lines[j].substring(0, 180)}`);
    }
  }
});

console.log('\n=== 5. APAKAH ADA FETCH KE /api/menus DI PAGE.TSX? ===');
lines.forEach((line, i) => {
  if (line.includes('/api/menus') || line.includes('fetchMenus') || line.includes('menus') && line.includes('fetch')) {
    console.log(`  Line ${i+1}: ${line.trim().substring(0, 150)}`);
  }
});

console.log('\n=== 6. RENDER UTAMA (return statement utama) ===');
// Cari return utama komponen (biasanya di bagian akhir file)
let returnFound = false;
for (let i = lines.length - 1; i >= Math.max(0, lines.length - 200); i--) {
  if (lines[i].trim().startsWith('return (') || lines[i].trim() === 'return (') {
    if (!returnFound) {
      console.log(`\n  Return utama ditemukan di Line ${i+1}:`);
      const end = Math.min(lines.length, i + 30);
      for (let j = i; j < end; j++) {
        console.log(`  ${j+1}: ${lines[j].substring(0, 180)}`);
      }
      returnFound = true;
      break;
    }
  }
}