const fs = require('fs');
const path = require('path');

const plantPagePath = path.join(process.cwd(), 'app', 'dashboard', 'plant', 'page.tsx');
if (fs.existsSync(plantPagePath)) {
  console.log('=== ISI app/dashboard/plant/page.tsx ===');
  console.log(fs.readFileSync(plantPagePath, 'utf8'));
} else {
  console.log('File app/dashboard/plant/page.tsx TIDAK DITEMUKAN!');
}

const dashboardPagePath = path.join(process.cwd(), 'app', 'dashboard', 'page.tsx');
if (fs.existsSync(dashboardPagePath)) {
  console.log('=== DAFTAR MENU DI app/dashboard/page.tsx ===');
  const content = fs.readFileSync(dashboardPagePath, 'utf8');
  const lines = content.split('\n').filter(l => l.includes('href') || l.includes('Plant') || l.includes('Logistik'));
  console.log(lines.join('\n'));
}
