const fs = require('fs');
const path = require('path');

console.log('=======================================================');
console.log('🕵️ AUDIT STRUKTUR HALAMAN (READ-ONLY / HANYA CEK)');
console.log('=======================================================\n');

function getPageFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next') {
        getPageFiles(fullPath, fileList);
      }
    } else if (file === 'page.tsx' || file === 'page.jsx') {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const pageFiles = getPageFiles(path.join(process.cwd(), 'app', 'dashboard'));

let heroPages = [];
let cleanPages = [];
let doubleBackPages = [];

for (const filePath of pageFiles) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relPath = path.relative(process.cwd(), filePath);
  
  // 1. Cek gaya "Hero" yang bikin balok biru raksasa (mencari div dengan padding tebal & warna solid)
  // Biasanya ditandai dengan negative margin pada child (-mt-) atau pb- besar
  const hasNegativeMargin = /-mt-\d+/.test(content);
  const hasGiantPadding = /p[by]-\d+.*bg-\[#003d79\]/.test(content) || /bg-\[#003d79\].*p[by]-\d+/.test(content);
  
  // 2. Cek apakah ada tombol "Kembali" lebih dari satu
  const backCount = (content.match(/kembali/gi) || []).length + (content.match(/router\.back/g) || []).length;
  
  if (hasNegativeMargin || hasGiantPadding) {
    heroPages.push(relPath);
  } else {
    cleanPages.push(relPath);
  }

  if (backCount > 1) {
    doubleBackPages.push(relPath);
  }
}

console.log('📊 HASIL AUDIT STRUKTUR LAYOUT KOTAK-KOTAK HTML:\n');

console.log(`❌ 1. HALAMAN BERANTAKAN (Punya Balok Biru Raksasa & Card Menabrak / -mt): ${heroPages.length} halaman`);
heroPages.forEach(p => console.log(`      - ${p}`));

console.log(`\n⚠️ 2. HALAMAN DENGAN DOUBLE TOMBOL KEMBALI: ${doubleBackPages.length} halaman`);
doubleBackPages.forEach(p => console.log(`      - ${p}`));

console.log(`\n✅ 3. HALAMAN FLAT/BERSIH (Seperti Plant Logistik): ${cleanPages.length} halaman`);

console.log('\n=======================================================');
console.log('KESIMPULAN:');
console.log('Halaman di grup 1 & 2 adalah sumber masalah kenapa UI tidak seragam.');
console.log('Untuk menyeragamkan, kita harus membuang div balok raksasa dan -mt di file-file tersebut.');
console.log('=======================================================');
