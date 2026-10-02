const fs = require('fs');
const path = require('path');

const layoutPath = path.join(__dirname, '..', 'app', 'dashboard', 'layout.tsx');

if (fs.existsSync(layoutPath)) {
  let content = fs.readFileSync(layoutPath, 'utf8');

  // Replace min-h-screen or flex-1 justify-between with simple auto height container
  // Membersihkan mt-auto atau justify-between yang menarik footer ke bawah
  content = content
    .replace(/min-h-screen/g, 'h-auto')
    .replace(/justify-between/g, 'justify-start')
    .replace(/mt-auto/g, 'mt-3');

  fs.writeFileSync(layoutPath, content, 'utf8');
  console.log('✅ app/dashboard/layout.tsx berhasil diperbaiki (Space terbuang dihilangkan)!');
} else {
  console.log('❌ File app/dashboard/layout.tsx tidak ditemukan!');
}