const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n=== MEMERIKSA FILE PARTS-CATALOG & API PARTBOOK ===');

// 1. Cek file page parts-catalog
const pcPage = path.join(process.cwd(), 'app/parts-catalog/page.tsx');
if (fs.existsSync(pcPage)) {
  console.log('File app/parts-catalog/page.tsx EXISTS');
} else {
  console.log('File app/parts-catalog/page.tsx NOT FOUND');
}

// 2. Cek git history untuk app/parts-catalog/page.tsx dan app/api/partbook
try {
  const gitLog = execSync('git log -n 5 --oneline app/parts-catalog/page.tsx', { encoding: 'utf-8' });
  console.log('\nGit Log parts-catalog:\n', gitLog);
  
  const gitLogApi = execSync('git log -n 5 --oneline app/api/partbook/units/route.ts', { encoding: 'utf-8' });
  console.log('\nGit Log api partbook units:\n', gitLogApi);
} catch (e) {
  console.log('Git check error:', e.message);
}

// 3. Cek isi file app/api/partbook/units/route.ts
const pbUnitsPath = path.join(process.cwd(), 'app/api/partbook/units/route.ts');
if (fs.existsSync(pbUnitsPath)) {
  console.log('\nIsi app/api/partbook/units/route.ts:\n', fs.readFileSync(pbUnitsPath, 'utf-8').slice(0, 500));
}
