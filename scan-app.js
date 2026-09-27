const fs = require('fs');
const path = require('path');

function scanDirectory(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      scanDirectory(filePath, fileList);
    } else if (file === 'page.tsx') {
      fileList.push(filePath);
    }
  });
  return fileList;
}

const pages = scanDirectory(path.join(process.cwd(), 'app', 'dashboard'));
let report = "=== LAPORAN AUDIT 41+ HALAMAN BTM ===\n\n";

pages.forEach(page => {
  const content = fs.readFileSync(page, 'utf8');
  const relPath = path.relative(process.cwd(), page);
  let issues = [];

  // Cek apakah masih pakai desain putih lama (belum standar)
  if (content.includes('bg-white') && content.includes('min-h-screen')) {
     issues.push('- Masih pakai background putih full (Belum standar #f4f7fa)');
  }
  // Cek apakah belum pakai PageWrapper
  if (!content.includes('PageWrapper') && !content.includes('AppLayout')) {
     issues.push('- Belum menggunakan Layout Standar / Card');
  }
  // Cek apakah masih ada header / tombol back double
  if ((content.includes('router.back()') || content.includes('<Link href=')) && content.includes('fixed top')) {
     issues.push('- Masih ada Header/Tombol Back bawaan lama yang tumpang tindih');
  }

  if (issues.length > 0) {
    report += `📄 File: ${relPath}\n${issues.join('\n')}\n\n`;
  }
});

fs.writeFileSync('audit-report.txt', report);
console.log('✅ Selesai! Buka file audit-report.txt');
