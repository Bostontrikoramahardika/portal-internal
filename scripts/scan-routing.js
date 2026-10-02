const fs = require('fs');
const path = require('path');

const dashPath = path.join(process.cwd(), 'app/dashboard/page.tsx');
const dash = fs.readFileSync(dashPath, 'utf8');

console.log('=== ANALISIS MENU GRID & ROUTING ===\n');

// 1. Cari bagaimana menu grid didefinisikan
console.log('--- 1. Array/Objek Menu Grid ---');
// Cari pattern seperti: const menuItems = [...], const menus = [...], const gridMenu = [...]
const arrayPatterns = [
  /(?:const|let|var)\s+(menu\w*|grid\w*|nav\w*|item\w*)\s*=\s*\[/gi,
  /(?:const|let|var)\s+(menu\w*|grid\w*|nav\w*|item\w*)\s*:\s*\w+\[\]\s*=\s*\[/gi,
];
arrayPatterns.forEach(p => {
  let m;
  while ((m = p.exec(dash)) !== null) {
    const start = Math.max(0, m.index - 20);
    const end = Math.min(dash.length, m.index + 200);
    console.log('\nDitemukan di posisi ' + m.index + ':');
    console.log(dash.substring(start, end).replace(/\n/g, ' ').substring(0, 250));
    console.log('---');
  }
});

// 2. Cari bagaimana sub-view di-switch
console.log('\n--- 2. Sub-view Switching Logic ---');
const switchPatterns = [
  /searchParams\.get\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /useSearchParams/g,
  /activeMenu|activeTab|activeView|currentView|selectedMenu/g,
  /setActiveMenu|setActiveTab|setActiveView|setCurrentView/g,
];
switchPatterns.forEach(p => {
  let m;
  const matches = [];
  while ((m = p.exec(dash)) !== null) {
    matches.push(m[0]);
  }
  if (matches.length > 0) {
    console.log(p.source + ': ' + matches.length + ' occurrences');
    // Tampilkan 3 contoh pertama
    matches.slice(0, 3).forEach(m => console.log('  contoh: ' + m));
  }
});

// 3. Cari menu_key mapping ke view
console.log('\n--- 3. Menu Key -> View Mapping ---');
// Cari pattern: menu === 'xxx' || menu_key === 'xxx'
const keyPatterns = [
  /(?:menu|menuKey|menu_key|tab|view)\s*===\s*['"]([^'"]+)['"]/g,
  /['"]([^'"]{5,30})['"]\s*=>\s*\(/g,
];
let viewKeys = new Set();
keyPatterns.forEach(p => {
  let m;
  while ((m = p.exec(dash)) !== null) {
    if (m[1] && !['div','span','true','false','null','undefined','string','number'].includes(m[1])) {
      viewKeys.add(m[1]);
    }
  }
});
console.log('View keys yang bisa di-render:');
[...viewKeys].sort().forEach(k => console.log('  -> ' + k));

// 4. Cari komponen yang di-import dari luar
console.log('\n--- 4. Import Komponen Eksternal ---');
const importRe = /import\s+(?:\{[^}]+\}|\w+)\s+from\s+['"]([^'"]+)['"]/g;
let imports = [];
let im;
while ((im = importRe.exec(dash)) !== null) {
  if (!im[1].startsWith('react') && !im[1].startsWith('next') && !im[1].startsWith('@') && !im[1].startsWith('lucide')) {
    imports.push(im[1]);
  }
}
[...new Set(imports)].forEach(i => console.log('  -> ' + i));

// 5. Ukuran file & struktur
console.log('\n--- 5. Statistik File ---');
console.log('Total chars: ' + dash.length);
console.log('Total lines: ' + dash.split('\n').length);

// Cari function/komponen declarations
const funcRe = /(?:function|const)\s+([A-Z]\w+)\s*=\s*(?:\(|React|<)/g;
let components = [];
let fm;
while ((fm = funcRe.exec(dash)) !== null) {
  components.push(fm[1]);
}
console.log('Komponen yang dideklarasikan di file ini:');
[...new Set(components)].forEach(c => console.log('  -> ' + c));

// 6. Cari apakah ada render conditional berdasarkan menu
console.log('\n--- 6. Conditional Render Blocks ---');
const condRe = /(?:menu|activeTab|activeMenu|view|tab)\s*(?:===|!==|==|!=)\s*['"]([^'"]+)['"]/g;
let condKeys = new Set();
let cm;
while ((cm = condRe.exec(dash)) !== null) {
  condKeys.add(cm[1]);
}
console.log('Menu keys dalam conditional render:');
[...condKeys].sort().forEach(k => console.log('  -> ' + k));