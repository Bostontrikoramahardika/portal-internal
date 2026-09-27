const fs = require('fs');
const path = require('path');

function scanDir(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      scanDir(filePath, fileList);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

const allFiles = scanDir('./app');
const blueCount = {};
const hexColors = {};

allFiles.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  
  // Cek Tailwind blue classes
  const blueMatches = content.match(/(?:bg|text|border|from|to|via)-blue-\d+/g) || [];
  blueMatches.forEach(m => {
    blueCount[m] = (blueCount[m] || 0) + 1;
  });
  
  // Cek Tailwind sky/cyan/indigo classes
  const otherBlue = content.match(/(?:bg|text|border|from|to|via)-(?:sky|cyan|indigo|slate)-\d+/g) || [];
  otherBlue.forEach(m => {
    blueCount[m] = (blueCount[m] || 0) + 1;
  });
  
  // Cek HEX colors
  const hexMatches = content.match(/#[0-9a-fA-F]{6}/g) || [];
  hexMatches.forEach(h => {
    const lower = h.toLowerCase();
    hexColors[lower] = (hexColors[lower] || 0) + 1;
  });
});

console.log(`\n${'='.repeat(60)}`);
console.log(`🔵 SEMUA WARNA BIRU YANG DIPAKAI DI APLIKASI`);
console.log(`${'='.repeat(60)}\n`);

console.log(`📌 TAILWIND CLASSES (Top 20):`);
const sorted = Object.entries(blueCount).sort((a,b) => b[1]-a[1]);
sorted.slice(0, 20).forEach(([cls, count]) => {
  const bar = '█'.repeat(Math.min(count, 40));
  console.log(`   ${cls.padEnd(25)} ${count.toString().padStart(4)}x  ${bar}`);
});

console.log(`\n📌 HEX COLORS (Top 15):`);
const sortedHex = Object.entries(hexColors).sort((a,b) => b[1]-a[1]);
sortedHex.slice(0, 15).forEach(([hex, count]) => {
  console.log(`   ${hex.padEnd(10)} ${count.toString().padStart(4)}x`);
});

// Cari warna biru paling dominan
console.log(`\n${'='.repeat(60)}`);
console.log(`🎯 KESIMPULAN — WARNA BIRU UTAMA APLIKASI:`);
console.log(`${'='.repeat(60)}`);
const bgBlue = sorted.filter(([k]) => k.startsWith('bg-') && !k.includes('slate'));
if (bgBlue.length > 0) {
  console.log(`   Background biru terpopuler: ${bgBlue[0][0]} (${bgBlue[0][1]}x)`);
}
const textBlue = sorted.filter(([k]) => k.startsWith('text-') && !k.includes('slate'));
if (textBlue.length > 0) {
  console.log(`   Text biru terpopuler       : ${textBlue[0][0]} (${textBlue[0][1]}x)`);
}
console.log(`${'='.repeat(60)}\n`);
