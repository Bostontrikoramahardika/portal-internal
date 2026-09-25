const fs = require('fs');
const path = './app/dashboard/page.tsx';

if (!fs.existsSync(path)) {
  console.log("File app/dashboard/page.tsx TIDAK DITEMUKAN!");
  process.exit(1);
}

const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

console.log("=== TOTAL BARIS ===", lines.length);

console.log("\n=== 1. PENCARIAN STATE / TABS TERKAIT PLANT ===");
lines.forEach((line, idx) => {
  if (
    line.includes("activeFilter") || 
    line.includes("selectedMenu") || 
    line.includes("activeTab") ||
    line.includes("activeSection") ||
    line.includes("PLANT") ||
    line.includes("Plant")
  ) {
    if (idx < 500 || line.includes("case 'PLANT'") || line.includes("=== 'PLANT'") || line.includes("=== 'plant'")) {
      console.log(`Line ${idx + 1}: ${line.trim().slice(0, 140)}`);
    }
  }
});

console.log("\n=== 2. BLOK RENDER / KONDISI UNTUK MENU PLANT ===");
lines.forEach((line, idx) => {
  if (
    line.includes("activeFilter === 'PLANT'") || 
    line.includes("activeFilter === 'plant'") || 
    line.includes("selectedMenu === 'PLANT'") ||
    line.includes("activeTab === 'PLANT'") ||
    line.includes("case 'PLANT':") ||
    line.includes("activeNav === 'PLANT'") ||
    line.includes("Katalog") ||
    line.includes("Crew Plant") ||
    line.includes("Workshop")
  ) {
    console.log(`\n>>> DITEMUKAN PADA BARIS ${idx + 1}:`);
    for (let i = Math.max(0, idx - 3); i <= Math.min(lines.length - 1, idx + 10); i++) {
      console.log(`  ${i + 1}: ${lines[i]}`);
    }
  }
});
