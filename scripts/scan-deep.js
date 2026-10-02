const fs = require('fs');
const path = require('path');

// === 1. SCAN DASHBOARD PAGE - Bagaimana menu di-render ===
console.log('=== 1. DASHBOARD PAGE - Menu Grid & Sub-views ===');
const dashPath = path.join(process.cwd(), 'app/dashboard/page.tsx');
const dash = fs.readFileSync(dashPath, 'utf8');

// Cari pattern routing menu (berbagai kemungkinan)
const patterns = [
  /menu_key\s*===\s*['"]([^'"]+)['"]/g,
  /activeTab\s*===\s*['"]([^'"]+)['"]/g,
  /activeMenu\s*===\s*['"]([^'"]+)['"]/g,
  /view\s*===\s*['"]([^'"]+)['"]/g,
  /case\s+['"]([^'"]+)['"]/g,
  /['"]([^'"]+)['"]\s*:\s*\(/g,
  /menuKey\s*===\s*['"]([^'"]+)['"]/g,
  /selectedMenu\s*===\s*['"]([^'"]+)['"]/g,
];

let allKeys = new Set();
patterns.forEach(p => {
  let m;
  while ((m = p.exec(dash)) !== null) {
    if (m[1] && m[1].length > 2 && !['div','span','true','false','null','undefined','return','const','let','var'].includes(m[1])) {
      allKeys.add(m[1]);
    }
  }
});
console.log('Menu keys / view keys yang ditemukan di dashboard/page.tsx:');
[...allKeys].sort().forEach(k => console.log('  -> ' + k));

// Cari grid menu items (biasanya array of objects dengan label/title)
console.log('\n--- Grid Menu Items (tombol-tombol di halaman utama) ---');
const gridPatterns = [
  /label\s*:\s*['"]([^'"]+)['"]/g,
  /title\s*:\s*['"]([^'"]+)['"]/g,
  /name\s*:\s*['"]([^'"]+)['"]/g,
];
let gridItems = new Set();
gridPatterns.forEach(p => {
  let m;
  while ((m = p.exec(dash)) !== null) {
    if (m[1] && m[1].length > 2 && m[1].length < 50) {
      gridItems.add(m[1]);
    }
  }
});
[...gridItems].sort().forEach(g => console.log('  -> ' + g));

// === 2. SCAN MOBILE BOTTOM NAV ===
console.log('\n=== 2. MOBILE BOTTOM NAV ===');
const navPath = path.join(process.cwd(), 'app/components/MobileBottomNav.tsx');
if (fs.existsSync(navPath)) {
  const nav = fs.readFileSync(navPath, 'utf8');
  console.log('Ukuran file: ' + nav.length + ' chars');
  
  // Cari menu items
  const navLabels = [];
  const labelRe = /label\s*:\s*['"]([^'"]+)['"]/g;
  let lm;
  while ((lm = labelRe.exec(nav)) !== null) navLabels.push(lm[1]);
  
  const titleRe = /title\s*:\s*['"]([^'"]+)['"]/g;
  while ((lm = titleRe.exec(nav)) !== null) navLabels.push(lm[1]);
  
  console.log('Menu labels di MobileBottomNav:');
  [...new Set(navLabels)].forEach(l => console.log('  -> ' + l));
  
  // Cari drawer items
  console.log('\nDrawer / Sheet items:');
  const drawerRe = /['"]([^'"]{3,40})['"]/g;
  const drawerKeywords = ['saya','keluar','logout','setting','profil','notifikasi','bantuan','tentang'];
  let drawerItems = new Set();
  while ((lm = drawerRe.exec(nav)) !== null) {
    const lower = lm[1].toLowerCase();
    if (drawerKeywords.some(k => lower.includes(k))) {
      drawerItems.add(lm[1]);
    }
  }
  [...drawerItems].forEach(d => console.log('  -> ' + d));
} else {
  console.log('  File tidak ditemukan!');
}

// === 3. SCAN DASHBOARD LAYOUT (Desktop Sidebar) ===
console.log('\n=== 3. DASHBOARD LAYOUT (Sidebar Desktop) ===');
const layoutPath = path.join(process.cwd(), 'app/dashboard/layout.tsx');
if (fs.existsSync(layoutPath)) {
  const layout = fs.readFileSync(layoutPath, 'utf8');
  console.log('Ukuran file: ' + layout.length + ' chars');
  
  // Apakah menus dari API atau hardcoded?
  if (layout.includes('/api/menus')) {
    console.log('  -> Menu dari API /api/menus (DB-driven) ✅');
  } else {
    console.log('  -> Menu HARDCODED di layout ⚠️');
  }
  
  // Cari menu items hardcoded jika ada
  const menuItems = [];
  const miRe = /(?:label|title|name)\s*:\s*['"]([^'"]+)['"]/g;
  let mm;
  while ((mm = miRe.exec(layout)) !== null) {
    if (mm[1].length > 2 && mm[1].length < 50) menuItems.push(mm[1]);
  }
  if (menuItems.length > 0) {
    console.log('  Menu items di layout:');
    [...new Set(menuItems)].forEach(m => console.log('    -> ' + m));
  }
}

// === 4. CEK APAKAH ADA FILE LAIN YANG RENDER MENU ===
console.log('\n=== 4. FILE LAIN YANG MUNGKIN RENDER MENU ===');
const compDir = path.join(process.cwd(), 'app/components');
if (fs.existsSync(compDir)) {
  const files = fs.readdirSync(compDir);
  files.forEach(f => {
    if (f.endsWith('.tsx') || f.endsWith('.ts')) {
      const content = fs.readFileSync(path.join(compDir, f), 'utf8');
      if (content.includes('menu') || content.includes('Menu') || content.includes('grid') || content.includes('Grid')) {
        console.log('  -> ' + f + ' (mengandung keyword menu/grid)');
      }
    }
  });
}

const dashCompDir = path.join(process.cwd(), 'app/dashboard/components');
if (fs.existsSync(dashCompDir)) {
  const files = fs.readdirSync(dashCompDir);
  files.forEach(f => {
    console.log('  -> dashboard/components/' + f);
  });
}