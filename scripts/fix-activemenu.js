const fs = require('fs');
const path = 'app/dashboard/page.tsx';

if (!fs.existsSync(path)) {
  console.log('❌ File app/dashboard/page.tsx tidak ditemukan!');
  process.exit(1);
}

let code = fs.readFileSync(path, 'utf8');

// 1. DOKTERIN activeMenu DI DALAM DashboardContent KALO BELUM ADA
if (!code.includes('const activeMenu =') && !code.includes('let activeMenu =')) {
  code = code.replace(
    /function\s+DashboardContent\s*\(\s*\)\s*\{/,
    "function DashboardContent() {\n  const searchParams = useSearchParams()\n  const activeMenu = searchParams?.get('menu') || 'absensi_saya'"
  );
  console.log('✅ Injected const activeMenu ke DashboardContent');
}

// 2. RAPILAN SIGNATURE FormCutiView DENGAN PROPS SAFE
code = code.replace(
  /function\s+FormCutiView\s*\([^)]*\)\s*\{/,
  "function FormCutiView(props: any) {\n  const { user, data } = props || {}\n  const mode = props?.mode || (props?.activeMenu === 'cuti_saya' ? 'history' : 'form')"
);

// 3. RAPILAN SIGNATURE CutiView KALO ADA
code = code.replace(
  /function\s+CutiView\s*\([^)]*\)\s*\{/,
  "function CutiView(props: any) {\n  const { user, data } = props || {}\n  const mode = props?.mode || (props?.activeMenu === 'cuti_saya' ? 'history' : 'form')"
);

// 4. PASTIIN SETIAP PEMANGGILAN FormCutiView MELAMPIRKAN activeMenu ATAU mode
code = code.replace(
  /<FormCutiView([^>]*)\/>/g,
  (m) => m.includes('activeMenu') || m.includes('mode=') ? m : `<FormCutiView activeMenu={activeMenu} ${m.replace('<FormCutiView', '').trim()}`
);

fs.writeFileSync(path, code, 'utf8');
console.log('');
console.log('===================================================');
console.log(' SUKSES MEMPERBARUI app/dashboard/page.tsx:');
console.log('  - Fix ReferenceError: activeMenu is not defined');
console.log('  - Safe function signatures untuk FormCutiView');
console.log('===================================================');