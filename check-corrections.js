const fs = require('fs');

console.log("=== 1. CEK CUSTOM MATCH TAB PLANT DI LAYOUT.TSX ===");
const layoutContent = fs.readFileSync('./app/dashboard/layout.tsx', 'utf8');
const layoutLines = layoutContent.split('\n');

let plantBlockStart = -1;
layoutLines.forEach((l, i) => {
  if (l.includes("key: 'plant'")) {
    plantBlockStart = i;
  }
});

if (plantBlockStart !== -1) {
  layoutLines.slice(plantBlockStart, plantBlockStart + 18).forEach((l, i) => {
    console.log(`${plantBlockStart + i + 1}: ${l}`);
  });
}

console.log("\n=== 2. CEK NAVIGATEMENU UNTUK PLANT DI LAYOUT.TSX ===");
layoutLines.forEach((l, i) => {
  if (l.includes("menuKey === 'plant_") || l.includes("menuKey === 'admin_part")) {
    console.log(`L${i+1}: ${l.trim()}`);
  }
});

console.log("\n=== 3. CEK FILTER DEPARTEMEN DI APP/DASHBOARD/PLANT/PAGE.TSX ===");
const plantPageContent = fs.readFileSync('./app/dashboard/plant/page.tsx', 'utf8');
const plantPageLines = plantPageContent.split('\n');
plantPageLines.slice(35, 52).forEach((l, i) => {
  console.log(`${i+36}: ${l}`);
});
