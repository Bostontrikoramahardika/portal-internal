const fs = require('fs');
const path = require('path');

// Scan semua page.tsx & layout.tsx
function scanDir(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      scanDir(filePath, fileList);
    } else if (file === 'page.tsx' || file === 'layout.tsx') {
      fileList.push(filePath);
    }
  });
  return fileList;
}

const allFiles = scanDir('./app');

console.log(`\n${'='.repeat(70)}`);
console.log(`🔍 AUDIT VISUAL KOMPREHENSIF — PORTAL INTERNAL BTM`);
console.log(`${'='.repeat(70)}`);
console.log(`Total file page.tsx + layout.tsx ditemukan: ${allFiles.length}\n`);

// Kategori analisis
const report = {
  noPageHeader: [],
  noUseClient: [],
  bgColors: {},
  paddings: {},
  hasBackButton: [],
  noBackButton: [],
  textSizes: {},
  buttonStyles: {},
  layoutWrappers: {},
  issues: []
};

allFiles.forEach(filePath => {
  const relPath = filePath.replace(/\\/g, '/');
  const content = fs.readFileSync(filePath, 'utf8');
  const isPage = filePath.endsWith('page.tsx');
  
  if (!isPage) return; // fokus page.tsx dulu

  // 1. Cek PageHeader
  const hasPageHeader = content.includes('<PageHeader');
  const hasImportPageHeader = content.includes('import PageHeader');
  if (!hasPageHeader) report.noPageHeader.push(relPath);

  // 2. Cek 'use client'
  const hasUseClient = content.includes("'use client'") || content.includes('"use client"');
  if (!hasUseClient) report.noUseClient.push(relPath);

  // 3. Cek Background Colors (inkonsistensi tema)
  const bgMatches = content.match(/bg-[a-z]+-\d+/g) || [];
  const uniqueBg = [...new Set(bgMatches)];
  uniqueBg.forEach(bg => {
    if (!report.bgColors[bg]) report.bgColors[bg] = [];
    report.bgColors[bg].push(relPath);
  });

  // 4. Cek Padding (inkonsistensi spacing)
  const padMatches = content.match(/\bp-[1-9]\b|\bp-\d{2}\b/g) || [];
  const uniquePad = [...new Set(padMatches)];
  uniquePad.forEach(p => {
    if (!report.paddings[p]) report.paddings[p] = [];
    report.paddings[p].push(relPath);
  });

  // 5. Cek Tombol Back
  const hasBack = content.includes('router.back()') || 
                  content.includes('router.push(') || 
                  content.includes('Kembali') ||
                  hasPageHeader;
  if (hasBack) {
    report.hasBackButton.push(relPath);
  } else {
    report.noBackButton.push(relPath);
  }

  // 6. Cek Text Size (inkonsistensi)
  const textMatches = content.match(/text-\[?\d+px\]?|text-xs|text-sm|text-base|text-lg|text-xl|text-2xl|text-3xl|text-4xl/g) || [];
  const uniqueText = [...new Set(textMatches)];
  uniqueText.forEach(t => {
    if (!report.textSizes[t]) report.textSizes[t] = 0;
    report.textSizes[t]++;
  });

  // 7. Cek Button Styles
  const btnMatches = content.match(/bg-amber-\d+|bg-blue-\d+|bg-green-\d+|bg-red-\d+|bg-slate-\d+|bg-gray-\d+|bg-indigo-\d+|bg-purple-\d+|bg-cyan-\d+/g) || [];
  const uniqueBtn = [...new Set(btnMatches)];
  uniqueBtn.forEach(b => {
    if (!report.buttonStyles[b]) report.buttonStyles[b] = 0;
    report.buttonStyles[b]++;
  });

  // 8. Cek Layout Wrapper
  const hasMinH = content.includes('min-h-screen');
  const hasMinH100 = content.includes('min-h-[100vh]') || content.includes('h-screen');
  const hasContainer = content.includes('max-w-') || content.includes('container');
  if (hasMinH) {
    report.layoutWrappers['min-h-screen'] = (report.layoutWrappers['min-h-screen'] || 0) + 1;
  }
  if (hasMinH100) {
    report.layoutWrappers['min-h-100vh'] = (report.layoutWrappers['min-h-100vh'] || 0) + 1;
  }

  // 9. Deteksi masalah spesifik
  if (content.includes('p-8') || content.includes('p-10') || content.includes('p-12')) {
    report.issues.push(`⚠️ PADDING TERLALU BESAR: ${relPath} (tidak mobile-friendly)`);
  }
  if (content.includes('bg-white') && content.includes('bg-slate-900')) {
    report.issues.push(`⚠️ TEMA CAMPUR (light+dark): ${relPath}`);
  }
  if (content.includes('bg-gray-') && content.includes('bg-slate-')) {
    report.issues.push(`⚠️ WARNA INKONSISTEN (gray vs slate): ${relPath}`);
  }
});

// === OUTPUT REPORT ===

console.log(`\n📌 1. PAGEHEADER COMPONENT`);
console.log(`   ✅ Terpasang    : ${allFiles.filter(f => f.endsWith('page.tsx')).length - report.noPageHeader.length} halaman`);
console.log(`   ❌ Belum terpasang: ${report.noPageHeader.length} halaman`);
if (report.noPageHeader.length > 0 && report.noPageHeader.length <= 30) {
  report.noPageHeader.forEach(p => console.log(`      • ${p}`));
} else if (report.noPageHeader.length > 30) {
  report.noPageHeader.slice(0, 15).forEach(p => console.log(`      • ${p}`));
  console.log(`      ... dan ${report.noPageHeader.length - 15} halaman lagi`);
}

console.log(`\n📌 2. TOMBOL KEMBALI / BACK`);
console.log(`   ✅ Ada navigasi back: ${report.hasBackButton.length} halaman`);
console.log(`   ❌ TIDAK ada back   : ${report.noBackButton.length} halaman`);
if (report.noBackButton.length > 0) {
  report.noBackButton.forEach(p => console.log(`      • ${p}`));
}

console.log(`\n📌 3. BACKGROUND COLORS (Inkonsistensi)`);
const bgSorted = Object.entries(report.bgColors).sort((a, b) => b[1].length - a[1].length);
bgSorted.slice(0, 15).forEach(([bg, pages]) => {
  console.log(`   ${bg.padEnd(20)} → ${pages.length} halaman`);
});

console.log(`\n📌 4. PADDING (Inkonsistensi Spacing)`);
const padSorted = Object.entries(report.paddings).sort((a, b) => b[1].length - a[1].length);
padSorted.forEach(([p, pages]) => {
  console.log(`   ${p.padEnd(10)} → ${pages.length} halaman`);
});

console.log(`\n📌 5. BUTTON COLORS (Inkonsistensi)`);
const btnSorted = Object.entries(report.buttonStyles).sort((a, b) => b[1] - a[1]);
btnSorted.slice(0, 15).forEach(([b, count]) => {
  console.log(`   ${b.padEnd(20)} → ${count}x dipakai`);
});

console.log(`\n📌 6. LAYOUT WRAPPER`);
Object.entries(report.layoutWrappers).forEach(([k, v]) => {
  console.log(`   ${k.padEnd(20)} → ${v} halaman`);
});

console.log(`\n📌 7. 'use client' DIRECTIVE`);
console.log(`   ❌ Missing: ${report.noUseClient.length} halaman`);
if (report.noUseClient.length > 0) {
  report.noUseClient.forEach(p => console.log(`      • ${p}`));
}

console.log(`\n📌 8. MASALAH SPESIFIK TERDETEKSI`);
if (report.issues.length === 0) {
  console.log(`   ✅ Tidak ada masalah kritis terdeteksi`);
} else {
  report.issues.forEach(i => console.log(`   ${i}`));
}

console.log(`\n${'='.repeat(70)}`);
console.log(`📊 RINGKASAN AKSI YANG DIPERLUKAN:`);
console.log(`${'='.repeat(70)}`);
console.log(`   1. Pasang PageHeader ke ${report.noPageHeader.length} halaman tersisa`);
console.log(`   2. Tambah tombol Back ke ${report.noBackButton.length} halaman`);
console.log(`   3. Standarisasi warna background (pilih 1 tema)`);
console.log(`   4. Standarisasi padding (mobile: p-2/p-3, desktop: p-4/p-6)`);
console.log(`   5. Standarisasi warna tombol (amber primary, slate secondary)`);
console.log(`   6. Fix ${report.noUseClient.length} halaman tanpa 'use client'`);
console.log(`${'='.repeat(70)}\n`);
