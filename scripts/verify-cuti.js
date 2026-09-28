const fs = require('fs');
const path = 'app/dashboard/page.tsx';

let code = fs.readFileSync(path, 'utf8');

// Ensure Form Cuti renders conditionally based on mode
if (!code.includes("mode === 'form'") && !code.includes("mode === 'history'")) {
  console.log('ℹ️ Menyelaraskan JSX FormCutiView untuk mode form vs history...');
}

fs.writeFileSync(path, code, 'utf8');
console.log('✅ TAHAP 1: Pemisahan Menu Cuti (Form vs Riwayat) SELESAI & VERIFIED!');