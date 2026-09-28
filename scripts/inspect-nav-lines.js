const fs = require('fs');
const path = 'app/components/MobileBottomNav.tsx';

if (fs.existsSync(path)) {
  const lines = fs.readFileSync(path, 'utf8').split('\n');
  console.log('=== BARIS 110 - 180 MobileBottomNav.tsx ===');
  for (let i = 109; i < Math.min(lines.length, 180); i++) {
    console.log(`L${i + 1}: ${lines[i]}`);
  }
} else {
  console.log('❌ File tidak ditemukan');
}