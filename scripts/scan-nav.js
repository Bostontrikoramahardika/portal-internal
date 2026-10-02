const fs = require('fs');
const path = require('path');

const navPath = path.join(process.cwd(), 'app/components/MobileBottomNav.tsx');
if (fs.existsSync(navPath)) {
  const lines = fs.readFileSync(navPath, 'utf8').split('\n');
  console.log('=== ANALISIS CODES DI MobileBottomNav.tsx ===\n');

  // 1. Cari property / interfaces
  console.log('--- 1. Props Interface ---');
  let printProps = false;
  lines.forEach((line, i) => {
    if (line.includes('interface') || line.includes('type MobileBottomNavProps')) {
      printProps = true;
    }
    if (printProps) {
      console.log(`  ${i+1}: ${line}`);
      if (line.trim() === '}') printProps = false;
    }
  });

  // 2. Cari filter logika menus dari database
  console.log('\n--- 2. Logika Pemrosesan & Filter menus ---');
  lines.forEach((line, i) => {
    if (line.includes('.filter') || line.includes('menus') || line.includes('roles') || line.includes('permission')) {
      if (line.includes('const') || line.includes('let') || line.includes('=')) {
        console.log(`  Line ${i+1}: ${line.trim()}`);
      }
    }
  });

  // 3. Tampilkan Drawer / Sheet render block (Bagian menu "Saya" / "More")
  console.log('\n--- 3. Struktur Menu di Dalam Drawer (Line 180 - 300) ---');
  for (let i = 150; i < 350; i++) {
    if (lines[i] !== undefined) {
      // Hanya print baris yang relevan agar ringkas
      if (lines[i].includes('name:') || lines[i].includes('href:') || lines[i].includes('menu_key') || 
          lines[i].includes('map') || lines[i].includes('Drawer') || lines[i].includes('Sheet') || 
          lines[i].includes('grid') || lines[i].includes('Icon') || lines[i].includes('svg') ||
          lines[i].includes('label') || lines[i].includes('items')) {
        console.log(`  Line ${i+1}: ${lines[i].trim()}`);
      }
    }
  }
} else {
  console.log('MobileBottomNav.tsx tidak ditemukan!');
}