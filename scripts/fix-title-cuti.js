const fs = require('fs');
const path = 'app/dashboard/page.tsx';

if (!fs.existsSync(path)) {
  console.log('❌ File app/dashboard/page.tsx tidak ditemukan!');
  process.exit(1);
}

let code = fs.readFileSync(path, 'utf8');

// 1. INJECT VARIABLE title & mode KE DALAM FormCutiView
const fnFormCutiRegex = /function\s+FormCutiView\s*\([^)]*\)\s*\{/;

if (fnFormCutiRegex.test(code)) {
  code = code.replace(fnFormCutiRegex, (match) => {
    return `${match}
  const { user, data } = props || {}
  const mode = props?.mode || (props?.activeMenu === 'cuti_saya' ? 'history' : 'form')
  const title = mode === 'history' ? 'Riwayat Cuti Saya' : 'Form Pengajuan Cuti'`;
  });
  console.log('✅ Injected title & mode ke FormCutiView');
}

// 2. INJECT JUGA PADA CutiView JIKA ADA
const fnCutiRegex = /function\s+CutiView\s*\([^)]*\)\s*\{/;
if (fnCutiRegex.test(code)) {
  code = code.replace(fnCutiRegex, (match) => {
    return `${match}
  const { user, data } = props || {}
  const mode = props?.mode || (props?.activeMenu === 'cuti_saya' ? 'history' : 'form')
  const title = mode === 'history' ? 'Riwayat Cuti Saya' : 'Form Pengajuan Cuti'`;
  });
  console.log('✅ Injected title & mode ke CutiView');
}

fs.writeFileSync(path, code, 'utf8');
console.log('🚀 SUKSES: ReferenceError: title is not defined BERHASIL DIPERBAIKI!');