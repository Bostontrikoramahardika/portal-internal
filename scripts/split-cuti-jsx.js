const fs = require('fs');
const path = 'app/dashboard/page.tsx';

let code = fs.readFileSync(path, 'utf8');

// Pembungkus JSX Form vs History di FormCutiView
// 1. Bungkus form input agar HANYA muncul jika mode === 'form'
// Cari posisi elemen form/input di FormCutiView
if (code.includes('FormCutiView')) {
  // Sembunyikan bagian form jika mode === 'history'
  code = code.replace(
    /(<form[\s\S]*?<\/form>|<div[^>]*className="[^"]*bg-white[^"]*"[^>]*>[\s\S]*?KIRIM PENGAJUAN[\s\S]*?<\/div>)/i,
    "{mode !== 'history' && ($1)}"
  );

  // Sembunyikan bagian riwayat tabel jika mode === 'form'
  code = code.replace(
    /(<div[^>]*className="[^"]*bg-white[^"]*"[^>]*>[\s\S]*?Riwayat Cuti Periode[\s\S]*?<\/div>\s*<\/div>)/i,
    "{mode !== 'form' && ($1)}"
  );

  console.log('✅ JSX Form & History Cuti berhasil dipisah tegas!');
}

fs.writeFileSync(path, code, 'utf8');
console.log('🚀 SUKSES: Tampilan Riwayat Cuti bersih dari Form Input!');