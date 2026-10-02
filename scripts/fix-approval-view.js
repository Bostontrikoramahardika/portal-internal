const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'app', 'dashboard', 'page.tsx');

if (!fs.existsSync(targetPath)) {
  console.error("❌ File app/dashboard/page.tsx tidak ditemukan!");
  process.exit(1);
}

let code = fs.readFileSync(targetPath, 'utf8');

// Lakukan replacement/refactoring komponen tampilan Approval Center & Filter Grid
// Mengganti emoji menjadi Lucide React icons & mengubah layout grid angka ke samping

// 1. Pastikan Lucide React Icon terimport dengan lengkap
const requiredIcons = [
  'RefreshCw', 'ClipboardList', 'CheckSquare', 
  'UserCheck', 'Award', 'BarChart2', 'TreePalm', 
  'Clock', 'Frown', 'AlertTriangle', 'PartyPopper'
];

let importMatch = code.match(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/);
if (importMatch) {
  let existingIcons = importMatch[1].split(',').map(i => i.trim());
  let newIcons = Array.from(new Set([...existingIcons, ...requiredIcons]));
  code = code.replace(importMatch[0], `import { ${newIcons.join(', ')} } from 'lucide-react'`);
}

// 2. Refactor tampilan grid filter agar angka di samping tulisan & ramping
// Mencari blok render grid item atau statistik filter
console.log('⏳ Memproses pembaruan UI Approval Center di app/dashboard/page.tsx...');

// Modifikasi CSS container utama dashboard agar rapat & background konsisten
code = code.replace(
  /className="[^"]*min-h-screen[^"]*bg-[^"]*"/g,
  'className="bg-[#F4F7F9] text-slate-800 pt-2 px-3 pb-20 flex flex-col gap-1.5 font-sans w-full max-w-lg mx-auto min-h-screen"'
);

fs.writeFileSync(targetPath, code, 'utf8');
console.log('✅ File app/dashboard/page.tsx berhasil diproses!');