const fs = require('fs');
const path = require('path');

console.log('=======================================================');
console.log('🛠️ FIX STRUKTUR LAYOUT: HAPUS BALOK HERO & DOUBLE BACK');
console.log('=======================================================\n');

function getFiles(dir, list = []) {
  if (!fs.existsSync(dir)) return list;
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (f !== 'node_modules' && f !== '.next') getFiles(full, list);
    } else if (f === 'page.tsx' || f === 'page.jsx') {
      list.push(full);
    }
  }
  return list;
}

const allPages = getFiles(path.join(process.cwd(), 'app', 'dashboard'));
let updatedFiles = 0;

for (const filePath of allPages) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  const rel = path.relative(process.cwd(), filePath);

  // 1. Perbaiki CELL_STYLE "OFF" di Manajemen Absensi / Rekap
  content = content.replace(
    /bg-white rounded-\[14px\] border border-\[#e2e8f0\] shadow-sm text-white label: 'Off\/Libur'/g,
    "bg-slate-100 text-slate-600 label: 'Off/Libur'"
  );
  content = content.replace(
    /'OFF':\s*\{\s*bg:\s*'bg-white rounded-\[14px\] border border-\[#e2e8f0\] shadow-sm',\s*text:\s*'text-white'/g,
    "'OFF': { bg: 'bg-slate-100', text: 'text-slate-600'"
  );

  // 2. Bersihkan balok Hero Navy raksasa & tombol kembali di dalamnya
  // Pola: <div className="bg-[#003D79] ..."> ... Kembali ... </div>
  // Kita hilangkan blok div hero ini jika di atasnya sudah ada PageHeader
  if (content.includes('PageHeader')) {
    // Cari blok div hero ber-padding besar
    content = content.replace(
      /<div className="bg-\[#003[Dd]79\][^"]*(?:pt-12|pt-8|pb-24|pb-16|rounded-b-)[^"]*">[\s\S]*?<\/div>/g,
      ''
    );

    // Hapus button Kembali mandiri jika PageHeader sudah menangani tombol back
    content = content.replace(
      /<button[^>]*onClick=\{\(\) => (?:router\.back|history\.back)\(\)\}[^>]*>[\s\S]*?Kembali[\s\S]*?<\/button>/gi,
      ''
    );
  }

  // 3. Hapus class negative margin (-mt-14, -mt-8, -mt-10, dll) agar card tidak menabrak ke atas
  content = content.replace(/ -mt-\d+/g, '');
  content = content.replace(/-mt-\d+ /g, '');
  content = content.replace(/-mt-\[.*?\]/g, '');

  // 4. Bersihkan gabungan class yang rusak
  content = content.replace(/text-white text-white/g, 'text-white');
  content = content.replace(/hover:bg-amber-400 text-slate-950/g, 'hover:bg-[#002a57]');
  content = content.replace(/bg-\[#003d79\] text-white text-slate-950/g, 'bg-[#003d79] text-white');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✅ Fixed Layout: ${rel}`);
    updatedFiles++;
  }
}

console.log('\n=======================================================');
console.log(`🎉 HASIL FIX: ${updatedFiles} halaman berhasil diseragamkan!`);
console.log('=======================================================');
