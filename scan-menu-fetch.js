const fs = require('fs');
const content = fs.readFileSync('./app/dashboard/layout.tsx', 'utf8');
const lines = content.split('\n');

console.log("=== PENCARIAN FETCH MENUS DI LAYOUT.TSX ===");
lines.forEach((l, i) => {
  if (l.includes('fetchMenus') || l.includes('/api/menus') || l.includes('setMenus') || l.includes('DEFAULT') || l.includes('FALLBACK')) {
    console.log(`L${i+1}: ${l.trim().slice(0, 130)}`);
  }
});
