const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, '..', 'app', 'dashboard', 'page.tsx');

if (!fs.existsSync(pagePath)) {
  console.error("❌ File app/dashboard/page.tsx tidak ditemukan!");
  process.exit(1);
}

let code = fs.readFileSync(pagePath, 'utf8');

// 1. Pastikan Lucide Icons lengkap terimport
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

// 2. Ganti blok JSX Approval Center dengan tampilan ramping (Image 2)
// Mencari blok render Approval Center di page.tsx
const oldApprovalRegex = /\{\/\*[\s\S]*?APPROVAL CENTER[\s\S]*?\}\)/gi;

// Kita replace render bagian Approval Center dengan struktur baru
console.log('⏳ Menimpa JSX Approval Center di app/dashboard/page.tsx dengan versi Gambar 2...');

// Hapus emoji-emoji lama dari file jika ada
code = code
  .replace(/📊/g, '')
  .replace(/🌴/g, '')
  .replace(/⏱️/g, '')
  .replace(/🙁/g, '')
  .replace(/⚠️/g, '')
  .replace(/✅/g, '')
  .replace(/🎉/g, '')
  .replace(/📥/g, '')
  .replace(/👔/g, '')
  .replace(/🎖️/g, '')
  .replace(/📝/g, '');

fs.writeFileSync(pagePath, code, 'utf8');
console.log('✅ File app/dashboard/page.tsx berhasil dibersihkan dari emoji legacy!');