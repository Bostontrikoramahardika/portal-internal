const XLSX = require('xlsx');
const fs = require('fs');

const file = process.argv[2];
if (!file) { console.error('Pakai: node scripts\\baca-excel.js "C:\\path\\file.xlsx"'); process.exit(1); }
if (!fs.existsSync(file)) { console.error('File tidak ada: ' + file); process.exit(1); }

const wb = XLSX.readFile(file, { cellFormula: true, cellDates: true });
const out = [];
out.push('FILE  : ' + file.split('\\').pop());
out.push('SHEET : ' + wb.SheetNames.length + ' -> ' + wb.SheetNames.join(' | '));
out.push('');

for (const nama of wb.SheetNames) {
  const ws = wb.Sheets[nama];
  const ref = ws['!ref'] || 'A1';
  const rng = XLSX.utils.decode_range(ref);
  const baris = rng.e.r + 1, kolom = rng.e.c + 1;
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });

  out.push('='.repeat(70));
  out.push('SHEET: ' + nama + '   (' + baris + ' baris x ' + kolom + ' kolom)');
  out.push('='.repeat(70));

  for (let i = 0; i < Math.min(5, data.length); i++) {
    const isi = (data[i] || []).slice(0, 30).map(v => String(v).slice(0, 16));
    out.push('  R' + (i + 1) + ': ' + isi.join(' | '));
  }
  if (data.length > 8) {
    out.push('  ...');
    const isi = (data[8] || []).slice(0, 30).map(v => String(v).slice(0, 16));
    out.push('  R9: ' + isi.join(' | '));
  }

  const rumus = new Set();
  for (const sel of Object.keys(ws)) {
    if (sel.startsWith('!')) continue;
    if (ws[sel].f) rumus.add(sel.replace(/[0-9]+/g, 'N') + ' = ' + String(ws[sel].f).slice(0, 80));
  }
  if (rumus.size) {
    out.push('  RUMUS (' + rumus.size + ' pola unik):');
    [...rumus].slice(0, 12).forEach(r => out.push('    ' + r));
    if (rumus.size > 12) out.push('    ... dan ' + (rumus.size - 12) + ' lagi');
  }
  out.push('');
}

fs.writeFileSync('struktur-excel.txt', out.join('\n'), 'utf8');
console.log('SELESAI. ' + wb.SheetNames.length + ' sheet dibaca.');
console.log('Hasil tersimpan di: struktur-excel.txt');