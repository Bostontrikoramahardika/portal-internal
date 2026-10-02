const fs = require('fs');
const path = require('path');

const dashPath = path.join(process.cwd(), 'app/dashboard/page.tsx');
const lines = fs.readFileSync(dashPath, 'utf8').split('\n');

console.log('=== CEK LANJUTAN DashboardView (Line 85 - 150) ===');
for (let i = 84; i < 150; i++) {
  if (lines[i] !== undefined) {
    console.log(`  ${i+1}: ${lines[i].substring(0, 200)}`);
  }
}

console.log('\n=== CEK LAYOUT UTAMA (app/dashboard/layout.tsx) ===');
const layoutPath = path.join(process.cwd(), 'app/dashboard/layout.tsx');
if (fs.existsSync(layoutPath)) {
  const layoutLines = fs.readFileSync(layoutPath, 'utf8').split('\n');
  console.log('Mencari pemanggilan MobileBottomNav dan pengiriman data menu:');
  layoutLines.forEach((line, i) => {
    if (line.includes('MobileBottomNav') || line.includes('menus=') || line.includes('sidebar')) {
      console.log(`  Line ${i+1}: ${line.trim().substring(0, 180)}`);
    }
  });
}