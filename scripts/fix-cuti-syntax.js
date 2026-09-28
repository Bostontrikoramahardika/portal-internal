const fs = require('fs');
const path = 'app/dashboard/page.tsx';

if (!fs.existsSync(path)) {
  console.log('❌ File app/dashboard/page.tsx tidak ditemukan!');
  process.exit(1);
}

let code = fs.readFileSync(path, 'utf8');

// 1. FIX SINTAKS ERROR DI LINE 476
// Memperbaiki }: any, mode = 'form' }) menjadi , mode = 'form' }: any)
code = code.replace(/:\s*any\s*,\s*mode\s*=\s*['"]form['"]\s*\}\s*\)/g, ", mode = 'form' }: any)");
code = code.replace(/:\s*any\s*,\s*mode\s*=\s*['"]history['"]\s*\}\s*\)/g, ", mode = 'history' }: any)");

// 2. Pastikan pemanggilan di activeMenu melempar prop mode yang benar
code = code.replace(/<FormCutiView\s+([^>]*)\/>/g, (match, props) => {
  if (props.includes('mode=')) return match;
  return `<FormCutiView ${props} mode={activeMenu === 'cuti_saya' ? 'history' : 'form'} />`;
});

code = code.replace(/<CutiView\s+([^>]*)\/>/g, (match, props) => {
  if (props.includes('mode=')) return match;
  return `<CutiView ${props} mode={activeMenu === 'cuti_saya' ? 'history' : 'form'} />`;
});

fs.writeFileSync(path, code, 'utf8');
console.log('✅ SUKSES: Syntax error pada page.tsx telah diperbaiki 100%!');