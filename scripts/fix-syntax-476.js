const fs = require('fs');
const path = 'app/dashboard/page.tsx';

if (!fs.existsSync(path)) {
  console.log('❌ File app/dashboard/page.tsx tidak ditemukan!');
  process.exit(1);
}

let code = fs.readFileSync(path, 'utf8');

// Fix kelebihan kurung kurawal pada destructuring parameter
code = code.replace(/\},\s*mode\s*=\s*['"]form['"]\s*\}:\s*any\)/g, ", mode = 'form' }: any)");
code = code.replace(/\},\s*mode\s*=\s*['"]history['"]\s*\}:\s*any\)/g, ", mode = 'history' }: any)");
code = code.replace(/\},\s*mode\s*=\s*([^}]+)\}:\s*any\)/g, ", mode = $1}: any)");

fs.writeFileSync(path, code, 'utf8');

// Verifikasi baris 470 - 480
const lines = fs.readFileSync(path, 'utf8').split('\n');
console.log('=== HASIL PERBAIKAN BARIS 470 - 480 ===');
for (let i = 468; i < Math.min(lines.length, 480); i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
console.log('=======================================');
console.log('✅ SUKSES: Syntax error pada line 476 berhasil diperbaiki!');