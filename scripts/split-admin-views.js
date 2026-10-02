const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const PAGE = path.join(ROOT, 'app', 'dashboard', 'page.tsx');
const VIEWS = path.join(ROOT, 'app', 'dashboard', 'views');
const BAK = PAGE + '.bak-split';

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const UNDO = args.includes('--undo');
const pilih = args.filter((a) => !a.startsWith('--'));

const TARGET_DEFAULT = [
  'ResetPasswordAdminView',
  'KelolaHakCutiView',
  'RoleManagerView',
  'SystemAuditView',
  'PermissionManagerView',
  'SitesManagerView',
  'GlobalConfigView',
];

if (UNDO) {
  if (!fs.existsSync(BAK)) {
    console.error('Cadangan page.tsx.bak-split tidak ditemukan.');
    process.exit(1);
  }
  fs.copyFileSync(BAK, PAGE);
  fs.unlinkSync(BAK);
  if (fs.existsSync(VIEWS)) fs.rmSync(VIEWS, { recursive: true, force: true });
  console.log('page.tsx dikembalikan & folder views/ dihapus. Semua batal.');
  process.exit(0);
}

if (!fs.existsSync(PAGE)) {
  console.error('app/dashboard/page.tsx tidak ditemukan. Jalankan dari folder utama project.');
  process.exit(1);
}

let src = fs.readFileSync(PAGE, 'utf8');
const BOM = src.charCodeAt(0) === 0xfeff;
if (BOM) src = src.slice(1);
let lines = src.split('\n');

function daftarFungsi(ls) {
  const out = [];
  ls.forEach((l, i) => {
    const m = /^(?:export default )?function (\w+)/.exec(l);
    if (m) out.push({ nama: m[1], mulai: i });
  });
  return out;
}

function batasAkhir(ls, mulai) {
  for (let i = mulai + 1; i < ls.length; i++) {
    if (/^(?:export default )?function \w+/.test(ls[i])) return i;
    if (/^\/\/ =+/.test(ls[i])) return i;
    if (/^const \w+ = dynamic\(/.test(ls[i])) return i;
  }
  return ls.length;
}

const FIELDS = ['Input', 'Select', 'Textarea', 'DetailRow', 'DetailRowSimple', 'FieldInput', 'ToggleField', 'StatusBadge'];
const HELPER_MAX_BARIS = 45;

const target = pilih.length ? pilih : TARGET_DEFAULT;
const hasil = { ok: [], lewat: [], hilang: [] };
const dipindah = [];
const helperDipakai = new Map();

function ambilHelper(ls, nama) {
  const fns = daftarFungsi(ls);
  const f = fns.find((x) => x.nama === nama);
  if (!f) return null;
  const akhir = batasAkhir(ls, f.mulai);
  if (akhir - f.mulai > HELPER_MAX_BARIS) return null;
  return ls
    .slice(f.mulai, akhir)
    .join('\n')
    .replace(/\s+$/, '')
    .replace(new RegExp('^function ' + nama), 'export function ' + nama);
}

console.log('\nMemeriksa komponen...\n');

for (const nama of target) {
  const fns = daftarFungsi(lines);
  const f = fns.find((x) => x.nama === nama);
  if (!f) {
    hasil.hilang.push(nama);
    console.log('  [TIDAK ADA]  ' + nama);
    continue;
  }

  const akhir = batasAkhir(lines, f.mulai);
  const body = lines.slice(f.mulai, akhir).join('\n').replace(/\s+$/, '');
  const jml = akhir - f.mulai;

  const lokal = new Set(fns.map((x) => x.nama));
  const dipakai = new Set((body.match(/\b[A-Z]\w+\b/g) || []).filter((w) => lokal.has(w) && w !== nama));
  const butuhFields = [...dipakai].filter((d) => FIELDS.includes(d));
  const butuhLain = [...dipakai].filter((d) => !FIELDS.includes(d));

  if (butuhLain.length) {
    hasil.lewat.push({ nama, butuhLain });
    console.log('  [DILEWATI]   ' + nama + '  (butuh: ' + butuhLain.join(', ') + ')');
    continue;
  }

  for (const h of butuhFields) {
    if (helperDipakai.has(h)) continue;
    const kode = ambilHelper(lines, h);
    if (kode) helperDipakai.set(h, kode);
  }

  const imports = ["import { useState, useEffect, useRef } from 'react'"];
  if (butuhFields.length) imports.push('import { ' + butuhFields.sort().join(', ') + " } from './_fields'");

  const isi =
    "'use client'\n\n" +
    '// ' + nama + ' dipisah dari app/dashboard/page.tsx (v1.8)\n' +
    '// Kode disalin UTUH. Logika & tampilan TIDAK diubah.\n' +
    '// Dimuat lewat next/dynamic hanya saat menunya dibuka.\n\n' +
    imports.join('\n') +
    '\n\n' +
    body.replace(new RegExp('^function ' + nama), 'export default function ' + nama) +
    '\n';

  dipindah.push({ nama, isi, jml });

  lines = [
    ...lines.slice(0, f.mulai),
    '// ' + nama + ' dipindah ke ./views/' + nama + '.tsx (lazy-load v1.8)',
    '',
    ...lines.slice(akhir),
  ];

  hasil.ok.push({ nama, jml });
  console.log('  [DIPINDAH]   ' + nama + '  (' + jml + ' baris)');
}

if (!dipindah.length) {
  console.log('\nTidak ada komponen yang bisa dipindah. Tidak ada file yang diubah.');
  process.exit(0);
}

let teks = lines.join('\n');

if (!/^import dynamic from 'next\/dynamic'/m.test(teks)) {
  const importTerakhir = [...teks.matchAll(/^import .*$/gm)].pop();
  const pos = importTerakhir.index + importTerakhir[0].length;
  teks = teks.slice(0, pos) + "\nimport dynamic from 'next/dynamic'" + teks.slice(pos);
}

const blok =
  '\n\n// LAZY-LOAD MENU ADMIN (v1.8)\n' +
  '// Menu khusus SUPER_ADMIN di bawah ini TIDAK ikut diunduh karyawan biasa.\n' +
  'const _LoadingMenu = () => (\n' +
  '  <div className="p-10 text-center text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">\n' +
  '    Memuat menu...\n' +
  '  </div>\n' +
  ')\n' +
  dipindah
    .map((d) => 'const ' + d.nama + " = dynamic(() => import('./views/" + d.nama + "'), { ssr: false, loading: _LoadingMenu })")
    .join('\n');

const importTerakhir2 = [...teks.matchAll(/^import .*$/gm)].pop();
const pos2 = importTerakhir2.index + importTerakhir2[0].length;
teks = teks.slice(0, pos2) + blok + teks.slice(pos2);

const perluFields = helperDipakai.size > 0;
const FIELDS_SRC =
  "'use client'\n\n" +
  '// HELPER TAMPILAN - disalin OTOMATIS dari page.tsx (v1.8)\n' +
  '// Isinya identik dengan aslinya. page.tsx tetap memakai salinannya sendiri.\n\n' +
  [...helperDipakai.values()].join('\n\n') +
  '\n';

const totalBaris = hasil.ok.reduce((a, b) => a + b.jml, 0);
const sebelum = src.split('\n').length;
const sesudah = teks.split('\n').length;

console.log('\n' + '='.repeat(60));
if (DRY) {
  console.log('MODE UJI COBA - tidak ada file yang diubah');
} else {
  if (!fs.existsSync(BAK)) fs.writeFileSync(BAK, (BOM ? '\ufeff' : '') + src, 'utf8');
  fs.mkdirSync(VIEWS, { recursive: true });
  if (perluFields) fs.writeFileSync(path.join(VIEWS, '_fields.tsx'), FIELDS_SRC, 'utf8');
  for (const d of dipindah) fs.writeFileSync(path.join(VIEWS, d.nama + '.tsx'), d.isi, 'utf8');
  fs.writeFileSync(PAGE, (BOM ? '\ufeff' : '') + teks, 'utf8');
  console.log('SELESAI');
}
console.log('='.repeat(60));
console.log('  Komponen dipindah : ' + hasil.ok.length);
console.log('  Baris dipindah    : ' + totalBaris);
console.log('  page.tsx          : ' + sebelum + ' -> ' + sesudah + ' baris');
if (hasil.lewat.length) console.log('  Dilewati          : ' + hasil.lewat.map((x) => x.nama).join(', '));
if (hasil.hilang.length) console.log('  Tidak ditemukan   : ' + hasil.hilang.join(', '));
console.log('\n  Cadangan : app/dashboard/page.tsx.bak-split');
console.log('  Batalkan : node scripts/split-admin-views.js --undo');
console.log('\n  Setelah ini WAJIB jalankan: npm run build\n');
