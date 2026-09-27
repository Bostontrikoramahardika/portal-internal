const fs = require('fs');
const path = require('path');

console.log('=======================================================');
console.log('🔬 INSPEKSI LAYOUT MOBILE & BOTTOM NAV');
console.log('=======================================================\n');

const dashLayoutPath = path.join(process.cwd(), 'app', 'dashboard', 'layout.tsx');
const rootLayoutPath = path.join(process.cwd(), 'app', 'layout.tsx');

if (fs.existsSync(dashLayoutPath)) {
  const dashContent = fs.readFileSync(dashLayoutPath, 'utf8');
  console.log('📌 Dashboard Layout Checklist:');
  console.log('  - Impor MobileBottomNav:', dashContent.includes('MobileBottomNav') ? '✅ YA' : '❌ TIDAK');
  console.log('  - Component MobileBottomNav Terpasang:', dashContent.includes('<MobileBottomNav') ? '✅ YA' : '❌ TIDAK');
}

if (fs.existsSync(rootLayoutPath)) {
  const rootContent = fs.readFileSync(rootLayoutPath, 'utf8');
  console.log('\n📌 Root Layout Checklist:');
  console.log('  - Impor globals.css:', rootContent.includes('globals.css') ? '✅ YA' : '❌ TIDAK');
}

console.log('\n=======================================================');
