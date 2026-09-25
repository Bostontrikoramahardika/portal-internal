const fs = require('fs');
const path = require('path');

// 1. Cek file-file di dalam app/dashboard
console.log("=== FILE DI DALAM APP/DASHBOARD ===");
function listFiles(dir, prefix = '') {
  if (!fs.existsSync(dir)) return;
  const items = fs.readdirSync(dir);
  items.forEach(item => {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      console.log(`${prefix}📁 ${item}/`);
      listFiles(full, prefix + '  ');
    } else {
      console.log(`${prefix}📄 ${item}`);
    }
  });
}
listFiles('./app/dashboard');

// 2. Scan useState di app/dashboard/page.tsx (baris 1 - 300)
console.log("\n=== SEMUA STATE DI APP/DASHBOARD/PAGE.TSX (Baris 1 - 250) ===");
const content = fs.readFileSync('./app/dashboard/page.tsx', 'utf8');
const lines = content.split('\n');
lines.slice(0, 250).forEach((line, idx) => {
  if (line.includes('useState')) {
    console.log(`L${idx + 1}: ${line.trim()}`);
  }
});

// 3. Scan sidebar atau navigation buttons
console.log("\n=== CONTOH BUTTON NAVIGASI / MENU DI HALAMAN ===");
let count = 0;
lines.forEach((line, idx) => {
  if (count < 25 && (line.includes('setActiveTab') || line.includes('setSelectedTab') || line.includes('setView') || line.includes('activeTab') || line.includes('setCurrentTab') || line.includes('activeMenu'))) {
    console.log(`L${idx + 1}: ${line.trim().slice(0, 120)}`);
    count++;
  }
});
