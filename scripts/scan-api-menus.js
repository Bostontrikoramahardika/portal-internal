const fs = require('fs');
const path = require('path');

const apiMenusPath = path.join(process.cwd(), 'app/api/menus/route.ts');
if (fs.existsSync(apiMenusPath)) {
  const content = fs.readFileSync(apiMenusPath, 'utf8');
  const lines = content.split('\n');
  console.log('=== ANALISIS /api/menus/route.ts ===\n');
  console.log(`Total baris: ${lines.length}`);

  // Cari query Supabase ke tabel menus
  lines.forEach((line, i) => {
    if (line.includes('supabase.from') || line.includes('menus') || line.includes('select')) {
      console.log(`  Line ${i+1}: ${line.trim()}`);
    }
  });

  // Cari filter query/role/permission di dalam route API menus
  console.log('\n--- Filter / Logika Hak Akses di API ---');
  let printCode = false;
  let codeCount = 0;
  lines.forEach((line, i) => {
    if (line.includes('const { data') && line.includes('menus')) {
      printCode = true;
      codeCount = 0;
    }
    if (printCode) {
      console.log(`  ${i+1}: ${line}`);
      codeCount++;
      if (codeCount > 25) printCode = false; // Batasi output 25 baris
    }
  });
} else {
  console.log('API /api/menus/route.ts tidak ditemukan!');
}