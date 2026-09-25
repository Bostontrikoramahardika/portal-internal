const fs = require('fs');
const path = require('path');

const root = process.cwd();

// 1. Cek isi /app/api/units/route.ts
const apiUnitsPath = path.join(root, 'app', 'api', 'units', 'route.ts');
if (fs.existsSync(apiUnitsPath)) {
  console.log('=== ISI /app/api/units/route.ts ===');
  console.log(fs.readFileSync(apiUnitsPath, 'utf8'));
} else {
  console.log('❌ File /app/api/units/route.ts TIDAK DITEMUKAN');
}

// 2. Cek handler handleSaveUnit di /app/dashboard/plant/page.tsx
const plantPagePath = path.join(root, 'app', 'dashboard', 'plant', 'page.tsx');
if (fs.existsSync(plantPagePath)) {
  const plantCode = fs.readFileSync(plantPagePath, 'utf8');
  console.log('\n=== KODINGAN SAVE UNIT DI plant/page.tsx ===');
  const saveMatch = plantCode.match(/const handleSaveUnit[\s\S]*?\n  \};/);
  if (saveMatch) {
    console.log(saveMatch[0]);
  } else {
    console.log('Fungsi handleSaveUnit tidak ditemukan secara persis, mencari submit...');
    const submitMatch = plantCode.match(/fetch\(["']\/api\/units[\s\S]*?\}\);/);
    if (submitMatch) console.log(submitMatch[0]);
  }
}
