const fs = require('fs');
const path = require('path');

console.log('=======================================================');
console.log('🔬 DEEP SCAN STRUKTUR HTML (3 RUSAK vs 1 BERSIH)');
console.log('=======================================================\n');

const targets = [
  { label: 'RUSAK-1', file: 'app/dashboard/manajemen-absensi/page.tsx' },
  { label: 'RUSAK-2', file: 'app/dashboard/rekap-absensi/page.tsx' },
  { label: 'RUSAK-3', file: 'app/dashboard/koreksi-absensi/page.tsx' },
  { label: 'RELATIF-BERSIH', file: 'app/dashboard/plant/logistik/page.tsx' },
];

function extractLayoutSignals(content) {
  const signals = [];
  if (/-mt-\d+/.test(content)) signals.push('NEG_MARGIN');
  if (/bg-\[#003d79\]/.test(content)) signals.push('NAVY_BG');
  if (/rounded-b-\[/.test(content) || /rounded-b-3xl/.test(content) || /rounded-b-\[40px\]/.test(content)) signals.push('ROUNDED_BOTTOM_HERO');
  if (/pb-\d+/.test(content) && /bg-\[#003d79\]/.test(content)) signals.push('NAVY_WITH_PADDING');
  if ((content.match(/[Kk]embali/g) || []).length > 1) signals.push('MULTI_KEMBALI');
  if ((content.match(/router\.back/g) || []).length > 1) signals.push('MULTI_ROUTER_BACK');
  if (/PageHeader/.test(content)) signals.push('USE_PAGEHEADER');
  if (/AppFooter|rck_Production|V1\.7\.0/.test(content)) signals.push('HAS_FOOTER');
  if (/min-h-screen/.test(content)) signals.push('MIN_H_SCREEN');
  if (/bg-\[#f4f7fa\]/.test(content)) signals.push('LIGHT_BG');
  return signals;
}

for (const t of targets) {
  const full = path.join(process.cwd(), t.file);
  if (!fs.existsSync(full)) {
    console.log(`❌ ${t.label}: FILE TIDAK ADA → ${t.file}\n`);
    continue;
  }
  const content = fs.readFileSync(full, 'utf8');
  const lines = content.split(/\r?\n/);
  const signals = extractLayoutSignals(content);

  console.log('-------------------------------------------------------');
  console.log(`${t.label}: ${t.file}`);
  console.log(`SIGNALS: ${signals.join(', ') || '(none)'}`);
  console.log(`TOTAL LINES: ${lines.length}`);
  console.log('--- FIRST 100 LINES (layout area) ---');
  console.log(lines.slice(0, 100).join('\n'));
  console.log('\n--- SNIPPETS: className yang mengandung navy/hero/margin ---');
  
  lines.forEach((line, i) => {
    if (
      line.includes('bg-[#003d79]') ||
      line.includes('-mt-') ||
      line.includes('rounded-b-') ||
      line.includes('Kembali') ||
      line.includes('router.back') ||
      line.includes('PageHeader') ||
      (line.includes('className') && line.includes('pb-') && line.includes('bg-'))
    ) {
      console.log(`L${i + 1}: ${line.trim().slice(0, 200)}`);
    }
  });
  console.log('\n');
}

// Ringkasan cepat semua 20 halaman rusak: apakah hero pattern-nya sama?
console.log('=======================================================');
console.log('📋 PATTERN SUMMARY — 20 HALAMAN BERANTAKAN');
console.log('=======================================================');

const broken = [
  'app/dashboard/approval-koreksi/page.tsx',
  'app/dashboard/crew-on-duty/page.tsx',
  'app/dashboard/dashboard-cuti/page.tsx',
  'app/dashboard/hr-override-absensi/page.tsx',
  'app/dashboard/import-roster/page.tsx',
  'app/dashboard/kelola-event/page.tsx',
  'app/dashboard/kelola-event/[id]/page.tsx',
  'app/dashboard/kelola-unit/page.tsx',
  'app/dashboard/koreksi-absensi/page.tsx',
  'app/dashboard/logistik/page.tsx',
  'app/dashboard/manajemen-absensi/page.tsx',
  'app/dashboard/mcu-saya/page.tsx',
  'app/dashboard/monitoring-apd/page.tsx',
  'app/dashboard/page.tsx',
  'app/dashboard/plant/inspeksi/page.tsx',
  'app/dashboard/plant/logistik/page.tsx',
  'app/dashboard/plant/page.tsx',
  'app/dashboard/rekap-absensi/page.tsx',
  'app/dashboard/rekrutmen/page.tsx',
  'app/dashboard/setting-unit/page.tsx',
];

for (const rel of broken) {
  const full = path.join(process.cwd(), rel);
  if (!fs.existsSync(full)) {
    console.log(`❓ MISSING  ${rel}`);
    continue;
  }
  const c = fs.readFileSync(full, 'utf8');
  const sig = extractLayoutSignals(c);
  const hero = sig.includes('NEG_MARGIN') || sig.includes('ROUNDED_BOTTOM_HERO');
  const multiBack = sig.includes('MULTI_KEMBALI') || sig.includes('MULTI_ROUTER_BACK');
  console.log(`${hero ? 'HERO' : 'flat'} | back:${multiBack ? 'DOUBLE' : 'ok   '} | ${sig.join(',')} | ${rel}`);
}

console.log('\n✅ Deep scan selesai. Kirim output ini — lalu kita eksekusi fix yang tepat.');
