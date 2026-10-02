// MENU "MORE" DIKELOMPOKKAN PER ROLE / MENU_GROUP  (v2 - tahan CRLF & beda versi)
// Pakai: node scripts/menu-per-role2.js --dry | (kosong) | --undo

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const NAV = path.join(ROOT, 'app', 'components', 'MobileBottomNav.tsx');
const PAGE = path.join(ROOT, 'app', 'dashboard', 'page.tsx');

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const UNDO = args.includes('--undo');

const BAK_NAV = NAV + '.bak-menugrup';
const BAK_PAGE = PAGE + '.bak-menugrup';

if (UNDO) {
  let n = 0;
  for (const [f, b] of [[NAV, BAK_NAV], [PAGE, BAK_PAGE]]) {
    if (fs.existsSync(b)) { fs.copyFileSync(b, f); fs.unlinkSync(b); n++; }
  }
  console.log(n ? 'Dibatalkan. ' + n + ' file dikembalikan.' : 'Tidak ada cadangan.');
  process.exit(0);
}

for (const f of [NAV, PAGE]) {
  if (!fs.existsSync(f)) { console.error('TIDAK ADA: ' + f); process.exit(1); }
}

function baca(f) {
  const raw = fs.readFileSync(f, 'utf8');
  const crlf = raw.includes('\r\n');
  const bom = raw.charCodeAt(0) === 0xfeff;
  return { teks: (bom ? raw.slice(1) : raw).replace(/\r\n/g, '\n'), crlf, bom };
}
function tulis(f, teks, info) {
  let out = info.crlf ? teks.replace(/\n/g, '\r\n') : teks;
  if (info.bom) out = '\ufeff' + out;
  fs.writeFileSync(f, out, 'utf8');
}

const infoNav = baca(NAV);
const infoPage = baca(PAGE);
let nav = infoNav.teks;
let page = infoPage.teks;
const navAsli = nav, pageAsli = page;

if (nav.includes('kelompokkanMenu')) {
  console.error('Sudah terpasang. Jalankan --undo dulu kalau mau ulang.');
  process.exit(1);
}

const gagal = [];
const catatan = [];

function gantiPola(teks, pola, isi, label) {
  const m = teks.match(pola);
  if (!m) { gagal.push(label); return teks; }
  return teks.replace(pola, isi);
}

const TAMBAHAN_RUTE = {
  plant_dashboard: '/dashboard/plant',
  plant_inspeksi: '/dashboard/plant/inspeksi',
  plant_logistik: '/dashboard/plant/logistik',
  rekrutmen: '/dashboard/rekrutmen',
  kelola_event: '/dashboard/kelola-event',
  monitoring_cuti_tiket: '/dashboard/dashboard-cuti',
};
if (/const\s+AUTO_REDIRECT_MAP/.test(page)) {
  let sisip = '';
  for (const k of Object.keys(TAMBAHAN_RUTE)) {
    if (!new RegExp('\\b' + k + '\\s*:').test(page)) sisip += '  ' + k + ": '" + TAMBAHAN_RUTE[k] + "',\n";
  }
  if (sisip) {
    const pola = /(const\s+AUTO_REDIRECT_MAP[\s\S]*?\n)(\})/;
    page = gantiPola(page, pola, (_m, isiBlok, tutup) => isiBlok + sisip + tutup, 'AUTO_REDIRECT_MAP');
  } else {
    catatan.push('semua rute tambahan sudah ada, dilewati');
  }
} else {
  gagal.push('AUTO_REDIRECT_MAP tidak ditemukan');
}

nav = gantiPola(nav,
  /(\n\s*badge\?: string;\n)(\})/,
  (_m, a, b) => a +
    '  menu_icon?: string;\n  menu_group?: string;\n  parent_menu_key?: string | null;\n  sort_order?: number;\n' + b,
  'tipe MenuItem');

const HELPER = [
  '// ============================================================',
  '// GRID "MORE" DIBANGUN DARI DATABASE (tabel menus via /api/menus)',
  '// Tidak ada daftar menu atau nama peran yang ditulis di frontend.',
  '// Pengelompokan memakai kolom menu_group apa adanya.',
  '// ============================================================',
  '',
  "const GROUP_DIKECUALIKAN = ['self service', 'hr dashboard tabs'];",
  '',
  'function rapikanJudul(g) {',
  '  const t = String(g || "").trim();',
  "  if (!t) return 'Lainnya';",
  '  if (t === t.toUpperCase() || t === t.toLowerCase()) {',
  '    return t',
  '      .toLowerCase()',
  "      .split(' ')",
  '      .map((w) => (w.length > 3 ? w.charAt(0).toUpperCase() + w.slice(1) : w.toUpperCase()))',
  "      .join(' ');",
  '  }',
  '  return t;',
  '}',
  '',
  'function kelompokkanMenu(menus) {',
  '  const peta = new Map();',
  '',
  '  (menus || []).forEach((m) => {',
  '    if (!m || !m.menu_key) return;',
  '    if (m.parent_menu_key) return;',
  "    const grup = String(m.menu_group || 'Lainnya');",
  '    if (GROUP_DIKECUALIKAN.includes(grup.trim().toLowerCase())) return;',
  '',
  '    const kunci = grup.trim().toLowerCase();',
  '    if (!peta.has(kunci)) {',
  '      peta.set(kunci, { judul: rapikanJudul(grup), urut: Number(m.sort_order) || 0, items: [] });',
  '    }',
  '    const g = peta.get(kunci);',
  '    g.urut = Math.min(g.urut, Number(m.sort_order) || 0);',
  '    if (!g.items.some((x) => x.menu_key === m.menu_key)) g.items.push(m);',
  '  });',
  '',
  '  return Array.from(peta.values())',
  '    .map((g) => ({',
  '      ...g,',
  '      items: g.items.sort(',
  '        (a, b) =>',
  '          (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0) ||',
  "          String(a.menu_label || '').localeCompare(String(b.menu_label || ''))",
  '      ),',
  '    }))',
  '    .filter((g) => g.items.length > 0)',
  '    .sort((a, b) => a.urut - b.urut || a.judul.localeCompare(b.judul));',
  '}',
  '',
  '',
].join('\n');

nav = gantiPola(nav, /export default function MobileBottomNav\(/,
  HELPER + 'export default function MobileBottomNav(', 'sisip helper');

nav = gantiPola(nav,
  /const rawItems = activeTab && activeTab !== 'scan' \? \(DEFAULT_GROUPS\[activeTab\] \|\| \[\]\) : \[\];/,
  '// Menu "More" diambil 100% dari database, dikelompokkan per menu_group\n' +
  "  const grupMore = activeTab === 'more' ? kelompokkanMenu(menus) : [];\n\n" +
  "  const rawItems =\n    activeTab && activeTab !== 'scan' && activeTab !== 'more'\n      ? (DEFAULT_GROUPS[activeTab] || [])\n      : [];",
  'perhitungan grupMore');

const RENDER = [
  '{/* ===== MODE "MORE": GRID PER KELOMPOK, SUMBER DATABASE ===== */}',
  "{activeTab === 'more' && (",
  '  <div className="pb-6">',
  '    {grupMore.length === 0 && (',
  '      <p className="py-10 text-center text-xs font-bold uppercase tracking-wider text-slate-400">',
  '        Tidak ada menu untuk akun Anda',
  '      </p>',
  '    )}',
  '    {grupMore.map((grup) => (',
  '      <section key={grup.judul} className="mb-5">',
  '        <div className="flex items-center gap-2 mb-2.5">',
  '          <h4 className="text-[11px] font-black uppercase tracking-widest text-[#003d79]">{grup.judul}</h4>',
  '          <span className="text-[10px] font-bold text-slate-400">{grup.items.length}</span>',
  '          <div className="flex-1 h-px bg-slate-200" />',
  '        </div>',
  '        <div className="grid grid-cols-2 gap-2.5">',
  '          {grup.items.map((m) => (',
  '            <Link',
  '              key={m.menu_key}',
  "              href={'/dashboard?menu=' + m.menu_key}",
  '              onClick={closeDrawer}',
  '              className="flex flex-col items-center justify-center p-3.5 rounded-2xl border text-center transition-all active:scale-95 bg-[#f4f7fa] border-slate-200 text-slate-700 hover:bg-blue-50"',
  '            >',
  '              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2 border bg-white border-slate-200 text-[#003d79] text-[18px] leading-none">',
  "                {m.menu_icon || '\\u25A2'}",
  '              </div>',
  '              <span className="text-[11px] font-bold leading-tight line-clamp-2">',
  "                {String(m.menu_label || m.menu_key).replace(/^[^A-Za-z0-9(]+/, '')}",
  '              </span>',
  '            </Link>',
  '          ))}',
  '        </div>',
  '      </section>',
  '    ))}',
  '  </div>',
  ')}',
  '',
].join('\n');

const polaGrid = /([ \t]*)<div className="grid grid-cols-2 gap-[\d.]+( pb-6)?">/;
const cocokGrid = nav.match(polaGrid);
if (!cocokGrid) {
  gagal.push('pembuka grid kartu (grid grid-cols-2 ...)');
} else {
  const indent = cocokGrid[1];
  const kelasLama = cocokGrid[0].trim().replace('<div className="', '').replace('">', '');
  const blok =
    RENDER.split('\n').map((l) => (l ? indent + l : l)).join('\n') +
    indent + "<div className={(activeTab === 'more' ? 'hidden ' : '') + '" + kelasLama + "'}>";
  nav = nav.replace(polaGrid, blok);
}

for (const id of ['closeDrawer', 'activeTab', 'Link']) {
  if (!new RegExp('\\b' + id + '\\b').test(nav)) gagal.push('identifier ' + id + ' tidak ada di MobileBottomNav');
}

console.log('');
if (gagal.length) {
  console.error('GAGAL - bagian berikut tidak ditemukan / tidak cocok:');
  gagal.forEach((g) => console.error('  - ' + g));
  console.error('\nTidak ada file yang diubah. Kirim pesan ini ke saya.');
  process.exit(1);
}

console.log('  [OK] akhir baris : nav=' + (infoNav.crlf ? 'CRLF' : 'LF') + '  page=' + (infoPage.crlf ? 'CRLF' : 'LF') + ' (dipertahankan)');
console.log('  [OK] peta pengalihan halaman standalone dilengkapi');
console.log('  [OK] tipe MenuItem diperluas');
console.log('  [OK] fungsi kelompokkanMenu() ditambahkan');
console.log('  [OK] grid "More" dibangun dari /api/menus per menu_group');
catatan.forEach((c) => console.log('  [--] ' + c));
console.log('');
console.log('='.repeat(60));
if (DRY) {
  console.log('MODE UJI COBA - tidak ada file yang diubah');
} else {
  if (!fs.existsSync(BAK_NAV)) tulis(BAK_NAV, navAsli, infoNav);
  if (!fs.existsSync(BAK_PAGE)) tulis(BAK_PAGE, pageAsli, infoPage);
  tulis(NAV, nav, infoNav);
  tulis(PAGE, page, infoPage);
  console.log('SELESAI');
}
console.log('='.repeat(60));
console.log('  MobileBottomNav.tsx : ' + navAsli.split('\n').length + ' -> ' + nav.split('\n').length + ' baris');
console.log('  page.tsx            : ' + pageAsli.split('\n').length + ' -> ' + page.split('\n').length + ' baris');
console.log('\n  Batalkan : node scripts/menu-per-role2.js --undo');
console.log('  Setelah ini jalankan: npm run build\n');