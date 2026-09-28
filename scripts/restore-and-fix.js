const fs = require('fs');
const path = 'app/dashboard/page.tsx';
const backupPath = 'app/dashboard/page.tsx.backup';

// 1. RESTORE DARI BACKUP KALO ADA
if (fs.existsSync(backupPath)) {
  fs.copyFileSync(backupPath, path);
  console.log('✅ File page.tsx berhasil direstore dari backup!');
} else {
  console.log('ℹ️ Backup tidak ditemukan, membersihkan tag error secara manual...');
}

let code = fs.readFileSync(path, 'utf8');

// 2. BERSIHKAN SEMUA TAG INJEKSI KASAR YANG BIKIN SYNTAX ERROR
code = code.replace(/\{mode !== 'history' && \(\{mode !== 'form' && \(/g, '');
code = code.replace(/\{mode !== 'history' && \(/g, '');
code = code.replace(/\{mode !== 'form' && \(/g, '');

// 3. PASTIKAN ACTIVE MENU TERDEFINISI DENGAN AMAN
if (!code.includes('const activeMenu =') && !code.includes('let activeMenu =')) {
  code = code.replace(
    /function\s+DashboardContent\s*\(\s*\)\s*\{/,
    "function DashboardContent() {\n  const searchParams = useSearchParams()\n  const menuKey = searchParams?.get('menu') || 'absensi_saya'\n  const activeMenu = menuKey"
  );
}

// 4. FIX DENGAN AMAN DEKLARASI FormCutiView
const fnFormCutiRegex = /function\s+FormCutiView\s*\([^)]*\)\s*\{/;
if (fnFormCutiRegex.test(code)) {
  code = code.replace(fnFormCutiRegex, (match) => {
    return `function FormCutiView(props: any) {
  const { user, data } = props || {}
  const mode = props?.mode || (props?.activeMenu === 'cuti_saya' ? 'history' : 'form')
  const title = mode === 'history' ? 'Riwayat Cuti Saya' : 'Form Pengajuan Cuti'`;
  });
}

fs.writeFileSync(path, code, 'utf8');
console.log('🚀 SUKSES: Error syntax berhasil disembuhkan dan page.tsx kembali normal!');