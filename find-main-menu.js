const fs = require('fs');
const content = fs.readFileSync('./app/dashboard/page.tsx', 'utf8');
const lines = content.split('\n');

console.log("=== PENCARIAN STATE NAVIGASI UTAMA ===");
lines.forEach((line, idx) => {
  if (idx < 500 && (
    line.includes("useState") && (
      line.includes("menu") || 
      line.includes("tab") || 
      line.includes("nav") || 
      line.includes("view") ||
      line.includes("page") ||
      line.includes("section")
    )
  )) {
    console.log(`State Line ${idx + 1}: ${line.trim()}`);
  }
});

console.log("\n=== PENCARIAN ITEM MENU UTAMA (SIDEBAR / NAVBAR) ===");
lines.forEach((line, idx) => {
  if (
    line.includes("Plant") || 
    line.includes("Workshop") || 
    line.includes("Logistik") || 
    line.includes("Equipment") || 
    line.includes("Fleet") || 
    line.includes("Alat Berat") ||
    line.includes("Breakdown")
  ) {
    if (line.includes("<button") || line.includes("label:") || line.includes("title:") || line.includes("name:") || line.includes("setActive") || line.includes("setMenu") || line.includes("setTab")) {
      console.log(`Menu Line ${idx + 1}: ${line.trim().slice(0, 140)}`);
    }
  }
});
