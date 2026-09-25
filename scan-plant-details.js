const fs = require('fs');

console.log("=== 1. LANJUTAN APP/DASHBOARD/PLANT/PAGE.TSX (Baris 80 - 253) ===");
const plantContent = fs.readFileSync('./app/dashboard/plant/page.tsx', 'utf8');
const plantLines = plantContent.split('\n');
plantLines.slice(80, 253).forEach((l, i) => console.log(`${i+81}: ${l}`));

console.log("\n=== 2. MENU PLANT DI LAYOUT.TSX ===");
const layoutContent = fs.readFileSync('./app/dashboard/layout.tsx', 'utf8');
const layoutLines = layoutContent.split('\n');
layoutLines.forEach((l, i) => {
  if (l.toLowerCase().includes('plant') || l.toLowerCase().includes('logistik')) {
    console.log(`Layout L${i+1}: ${l.trim().slice(0, 140)}`);
  }
});

console.log("\n=== 3. CARD / LINK PLANT DI DASHBOARD PAGE.TSX ===");
const dashContent = fs.readFileSync('./app/dashboard/page.tsx', 'utf8');
const dashLines = dashContent.split('\n');
dashLines.forEach((l, i) => {
  if (l.includes('/dashboard/plant') || l.includes('Plant') || l.includes('plant')) {
    if (l.includes('href=') || l.includes('router.push') || l.includes('Link')) {
      console.log(`Dashboard L${i+1}: ${l.trim().slice(0, 140)}`);
    }
  }
});
