const fs = require('fs');
const path = require('path');

const navPath = path.join(process.cwd(), 'app/components/MobileBottomNav.tsx');
const lines = fs.readFileSync(navPath, 'utf8').split('\n');

console.log('=== CEK rawItems & DAFTAR MENU DI MobileBottomNav.tsx (Line 20 - 120) ===');
for (let i = 20; i < 125; i++) {
  if (lines[i] !== undefined) {
    console.log(`${i+1}: ${lines[i]}`);
  }
}