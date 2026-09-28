const fs = require('fs');
const path = 'app/components/MobileBottomNav.tsx';

if (fs.existsSync(path)) {
  const code = fs.readFileSync(path, 'utf8');
  console.log('=== ISI CONTAINER DRAWER MOBILE BOTTOM NAV ===');
  const lines = code.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('drawer') || line.includes('sheet') || line.includes('activeTab') || line.includes('Saya') || line.includes('onClick')) {
      console.log(`L${idx + 1}: ${line}`);
    }
  });
} else {
  console.log('❌ File MobileBottomNav.tsx tidak ditemukan!');
}