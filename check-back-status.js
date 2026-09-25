const fs = require('fs');
const path = require('path');

const root = process.cwd();

const targetPages = [
  'app/dashboard/plant/page.tsx',
  'app/dashboard/plant/inspeksi/page.tsx',
  'app/dashboard/plant/logistik/page.tsx',
  'app/dashboard/logistik/page.tsx',
  'app/parts-catalog/page.tsx',
  'app/dashboard/page.tsx',
  'app/partbook/admin/page.tsx'
];

console.log('=== STATUS TOMBOL BACK DI HALAMAN UTAMA ===');

targetPages.forEach(p => {
  const fullPath = path.join(root, p);
  if (fs.existsSync(fullPath)) {
    const code = fs.readFileSync(fullPath, 'utf8');
    const hasPageHeader = code.includes('PageHeader');
    const hasKembali = code.includes('Kembali') || code.includes('←');
    const hasUseClient = code.includes("'use client'") || code.includes('"use client"');
    console.log(`📄 ${p}:`);
    console.log(`   - 'use client': ${hasUseClient}`);
    console.log(`   - PageHeader component: ${hasPageHeader}`);
    console.log(`   - Teks 'Kembali' / '←': ${hasKembali}`);
  } else {
    console.log(`❌ ${p}: File tidak ditemukan`);
  }
});
