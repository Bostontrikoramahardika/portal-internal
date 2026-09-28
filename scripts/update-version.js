const fs = require('fs');
const path = 'app/dashboard/layout.tsx';
let code = fs.readFileSync(path, 'utf8');

if (code.includes('v1.6.2')) {
  code = code.replace(/v1\.6\.2/g, 'v1.7.0');
  fs.writeFileSync(path, code, 'utf8');
  console.log('✅ SUKSES: Versi header berhasil diupdate ke v1.7.0!');
} else {
  console.log('ℹ️ Teks v1.6.2 tidak ditemukan atau sudah v1.7.0');
}