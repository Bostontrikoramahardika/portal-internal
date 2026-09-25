const fs = require('fs');

console.log("=== 1. ISI APP/DASHBOARD/PLANT/PAGE.TSX (Baris 1 - 80) ===");
if (fs.existsSync('./app/dashboard/plant/page.tsx')) {
  const plantContent = fs.readFileSync('./app/dashboard/plant/page.tsx', 'utf8');
  const plantLines = plantContent.split('\n');
  console.log(`Total Baris: ${plantLines.length}`);
  plantLines.slice(0, 80).forEach((l, i) => console.log(`${i+1}: ${l}`));
} else {
  console.log("File tidak ditemukan!");
}

console.log("\n=== 2. ISI APP/DASHBOARD/LAYOUT.TSX (Baris 1 - 80) ===");
if (fs.existsSync('./app/dashboard/layout.tsx')) {
  const layoutContent = fs.readFileSync('./app/dashboard/layout.tsx', 'utf8');
  const layoutLines = layoutContent.split('\n');
  console.log(`Total Baris: ${layoutLines.length}`);
  layoutLines.slice(0, 80).forEach((l, i) => console.log(`${i+1}: ${l}`));
} else {
  console.log("File layout tidak ditemukan!");
}
