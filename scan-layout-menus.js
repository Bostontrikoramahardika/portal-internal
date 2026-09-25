const fs = require('fs');
const content = fs.readFileSync('./app/dashboard/layout.tsx', 'utf8');
const lines = content.split('\n');

console.log("=== PENCARIAN MENU LIST DI LAYOUT.TSX ===");
lines.forEach((l, i) => {
  if (l.includes('DEFAULT_MENUS') || l.includes('FALLBACK_MENUS') || l.includes('plant_logistik') || l.includes('logistik') || l.includes('plant_') || l.includes('kelola_unit')) {
    console.log(`L${i+1}: ${l.trim().slice(0, 130)}`);
  }
});
