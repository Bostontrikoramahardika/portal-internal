const fs = require('fs');
const path = require('path');

const pagePath = path.join(process.cwd(), 'app', 'dashboard', 'page.tsx');
if (fs.existsSync(pagePath)) {
  const content = fs.readFileSync(pagePath, 'utf8');
  const lines = content.split('\n');
  console.log('=== MENCARI LINKS DAN NAVIGASI DI app/dashboard/page.tsx ===');
  lines.forEach((line, index) => {
    const lower = line.toLowerCase();
    if (lower.includes('plant') || lower.includes('logistik') || lower.includes('href=') || lower.includes('window.location')) {
      if (line.includes('button') || line.includes('Link') || line.includes('<a') || line.includes('onClick')) {
        console.log(`[Baris ${index + 1}]: ${line.trim()}`);
      }
    }
  });
} else {
  console.log('File app/dashboard/page.tsx tidak ditemukan!');
}
