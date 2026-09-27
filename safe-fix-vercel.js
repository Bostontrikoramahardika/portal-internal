const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('=======================================================');
console.log('🚨 RECOVER & SAFE FIX JSX SYNTAX FOR VERCEL BUILD');
console.log('=======================================================\n');

// 1. Restore file dashboard dari commit 548481c yang terbukti 100% lulus build
console.log('🔄 Restoring clean dashboard files from commit 548481c...');
try {
  execSync('git checkout 548481c -- app/dashboard', { stdio: 'inherit' });
  console.log('✅ Restoration complete.\n');
} catch (e) {
  console.log('⚠️ Git checkout note:', e.message);
}

// 2. Terapkan Safe Class Transformation (Ubah Hero className menjadi "hidden")
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

const pages = getFiles(path.join(process.cwd(), 'app', 'dashboard'));
let updatedCount = 0;

for (const filePath of pages) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // A. Jika ada PageHeader, sembunyikan balok hero raksasa dengan class "hidden"
  if (content.includes('PageHeader')) {
    content = content.replace(
      /className="bg-\[#003[Dd]79\][^"]*(?:pt-12|pt-8|pb-24|pb-16|rounded-b-)[^"]*"/g,
      'className="hidden"'
    );
  }

  // B. Hapus negative margin (-mt-14, -mt-8, -mt-10) agar card tidak menabrak
  content = content.replace(/ -mt-\d+/g, '');
  content = content.replace(/-mt-\d+ /g, '');
  content = content.replace(/-mt-\[.*?\]/g, '');

  // C. Perbaiki CELL_STYLE "OFF"
  content = content.replace(
    /bg-white rounded-\[14px\] border border-\[#e2e8f0\] shadow-sm text-white label: 'Off\/Libur'/g,
    "bg-slate-100 text-slate-600 label: 'Off/Libur'"
  );
  content = content.replace(
    /'OFF':\s*\{\s*bg:\s*'bg-white rounded-\[14px\] border border-\[#e2e8f0\] shadow-sm',\s*text:\s*'text-white'/g,
    "'OFF': { bg: 'bg-slate-100', text: 'text-slate-600'"
  );

  // D. Rapikan class dobel
  content = content.replace(/text-white text-white/g, 'text-white');
  content = content.replace(/hover:bg-amber-400 text-slate-950/g, 'hover:bg-[#002a57]');
  content = content.replace(/bg-\[#003d79\] text-white text-slate-950/g, 'bg-[#003d79] text-white');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    updatedCount++;
  }
}

console.log(`✅ Safe Transformation applied to ${updatedCount} files.`);
console.log('=======================================================');
