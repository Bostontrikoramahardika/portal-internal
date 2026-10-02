#!/usr/bin/env node
/**
 * 🔧 FIX UI v1.8 — Standardisasi footer & tata letak
 *
 * Jalankan dari root project:  node scripts/fix-ui-v18.js
 *
 * Yang dikerjakan:
 *  1. Hapus FOOTER MANUAL yang disalin di 29 halaman dashboard
 *     (penyebab "footer dobel" — layout.tsx sudah punya <AppFooter />)
 *  2. Hapus `min-h-screen` pada <main> di app/dashboard/layout.tsx
 *     dan `flex-1` pada wrapper konten  (penyebab "footer melayang")
 *  3. Hapus `min-h-screen` pada wrapper halaman dashboard yang menimbulkan
 *     ruang kosong ganda di HP
 *
 * AMAN:
 *  - Semua file yang diubah dibuatkan cadangan *.bak-v18
 *  - Tidak menyentuh app/page.tsx (halaman login)
 *  - Bisa dibatalkan: node scripts/fix-ui-v18.js --undo
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DASH = path.join(ROOT, 'app', 'dashboard');
const UNDO = process.argv.includes('--undo');
const DRY = process.argv.includes('--dry');

/* ─────────── util ─────────── */
function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name === 'page.tsx' || e.name === 'layout.tsx') out.push(p);
  }
  return out;
}

const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/');

function save(file, before, after) {
  if (before === after) return false;
  if (DRY) return true;
  const bak = file + '.bak-v18';
  if (!fs.existsSync(bak)) fs.writeFileSync(bak, before, 'utf8');
  fs.writeFileSync(file, after, 'utf8');
  return true;
}

/* ─────────── mode undo ─────────── */
if (UNDO) {
  let n = 0;
  for (const f of walk(DASH)) {
    const bak = f + '.bak-v18';
    if (fs.existsSync(bak)) {
      fs.copyFileSync(bak, f);
      fs.unlinkSync(bak);
      console.log('  ↩️  dipulihkan  ' + rel(f));
      n++;
    }
  }
  console.log(`\n✅ ${n} file dikembalikan ke kondisi semula.`);
  process.exit(0);
}

/* ─────────── 1. hapus footer manual ─────────── */
console.log('\n🔎 Mencari footer manual di halaman dashboard...\n');

// <footer ...>...BTM Mobile APP...</footer>  (+ komentar di atasnya kalau ada)
const FOOTER_RE =
  /[ \t]*\{\/\*[^*]*(?:Standard App Footer|Footer)[^*]*\*\/\}[ \t]*\r?\n?[ \t]*<footer[\s\S]*?<\/footer>[ \t]*\r?\n?|[ \t]*<footer[\s\S]{0,400}?rck_Production[\s\S]*?<\/footer>[ \t]*\r?\n?/gi;

let hapusFooter = 0;
for (const f of walk(DASH)) {
  if (path.basename(f) !== 'page.tsx') continue;
  const src = fs.readFileSync(f, 'utf8');
  if (!/rck_Production/i.test(src)) continue;

  const out = src.replace(FOOTER_RE, '');
  if (/rck_Production/i.test(out)) {
    console.log('  ⚠️  LEWATI (bentuk tidak dikenal) ' + rel(f));
    continue;
  }
  if (save(f, src, out)) {
    console.log('  ✅ footer dihapus  ' + rel(f));
    hapusFooter++;
  }
}

/* ─────────── 2. perbaiki layout.tsx ─────────── */
console.log('\n🔎 Memperbaiki app/dashboard/layout.tsx...\n');

const LAYOUT = path.join(DASH, 'layout.tsx');
let fixLayout = 0;
if (fs.existsSync(LAYOUT)) {
  const src = fs.readFileSync(LAYOUT, 'utf8');
  let out = src;

  // <main ... flex flex-col min-h-screen ...>  →  tanpa min-h-screen
  out = out.replace(/(<main[^>]*className="[^"]*?)\s*min-h-screen/g, '$1');

  // <div className="flex-1 p-3 ...">{children}  →  tanpa flex-1
  out = out.replace(/(<div className=")flex-1\s+(p-3[^"]*"[^>]*>\s*\r?\n?\s*\{children\})/g, '$1$2');

  if (save(LAYOUT, src, out)) {
    console.log('  ✅ min-h-screen & flex-1 dibersihkan  ' + rel(LAYOUT));
    fixLayout++;
  } else {
    console.log('  ℹ️  tidak ada yang perlu diubah (mungkin sudah diperbaiki)');
  }
}

/* ─────────── 3. min-h-screen ganda di halaman ─────────── */
console.log('\n🔎 Membersihkan min-h-screen ganda di halaman...\n');

let fixPage = 0;
for (const f of walk(DASH)) {
  if (path.basename(f) !== 'page.tsx') continue;
  const src = fs.readFileSync(f, 'utf8');
  // hanya pada div pembungkus paling luar yang juga punya background halaman
  const out = src.replace(
    /(<div className="\s*)min-h-screen\s+(bg-\[#f4f7fa\][^"]*")/g,
    '$1$2'
  );
  if (save(f, src, out)) {
    console.log('  ✅ min-h-screen dihapus  ' + rel(f));
    fixPage++;
  }
}

/* ─────────── ringkasan ─────────── */
console.log('\n' + '═'.repeat(58));
console.log(DRY ? '🧪 MODE UJI COBA — tidak ada file yang diubah' : '🎉 SELESAI');
console.log('═'.repeat(58));
console.log(`  Footer manual dihapus    : ${hapusFooter} halaman`);
console.log(`  Layout diperbaiki        : ${fixLayout} file`);
console.log(`  min-h-screen dibersihkan : ${fixPage} halaman`);
console.log('\n  Cadangan disimpan sebagai *.bak-v18');
console.log('  Batalkan dengan          : node scripts/fix-ui-v18.js --undo\n');
