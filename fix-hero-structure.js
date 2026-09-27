const fs = require('fs');
const path = require('path');

console.log('=======================================================');
console.log('🛠️ FIX STRUKTUR HERO → FLAT (SURGICAL, NO FEATURE TOUCH)');
console.log('=======================================================\n');

function listPages(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      if (name !== 'node_modules' && name !== '.next') listPages(full, out);
    } else if (name === 'page.tsx' || name === 'page.jsx') {
      out.push(full);
    }
  }
  return out;
}

// Hapus 1 elemen JSX pembuka dari index openTag sampai tag penutup yang seimbang
function removeBalancedJsxBlock(src, openIdx) {
  // openIdx menunjuk ke '<' dari tag pembuka
  if (openIdx < 0 || src[openIdx] !== '<') return null;

  // Cari akhir tag pembuka '>'
  let i = openIdx;
  let quote = null;
  for (; i < src.length; i++) {
    const ch = src[i];
    if (quote) {
      if (ch === quote && src[i - 1] !== '\\\\') quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '>') break;
  }
  if (i >= src.length) return null;

  const openTagEnd = i;
  const openTag = src.slice(openIdx, openTagEnd + 1);
  // Self-closing
  if (/\\/>$/.test(openTag)) {
    return { start: openIdx, end: openTagEnd + 1, text: src.slice(openIdx, openTagEnd + 1) };
  }

  // Ambil nama tag
  const tagMatch = openTag.match(/^<\\s*([A-Za-z][A-Za-z0-9.]*)/);
  if (!tagMatch) return null;
  const tagName = tagMatch[1];

  // Scan ke depan hitung depth
  let depth = 1;
  i = openTagEnd + 1;
  quote = null;
  while (i < src.length && depth > 0) {
    const ch = src[i];
    if (quote) {
      if (ch === quote && src[i - 1] !== '\\\\') quote = null;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      i++;
      continue;
    }

    if (ch === '<') {
      // comment
      if (src.startsWith('<!--', i)) {
        const endC = src.indexOf('-->', i + 4);
        i = endC === -1 ? src.length : endC + 3;
        continue;
      }
      // closing tag
      const closeMatch = src.slice(i).match(new RegExp('^</\\\\s*' + tagName + '\\\\s*>'));
      if (closeMatch) {
        depth--;
        i += closeMatch[0].length;
        continue;
      }
      // opening same tag or other
      const nextOpen = src.slice(i).match(/^<\\s*([A-Za-z][A-Za-z0-9.]*)[^>]*>/);
      if (nextOpen) {
        const selfClose = /\\/>$/.test(nextOpen[0]);
        const same = nextOpen[1] === tagName;
        if (same && !selfClose) depth++;
        i += nextOpen[0].length;
        continue;
      }
    }
    i++;
  }

  if (depth !== 0) return null;
  return { start: openIdx, end: i, text: src.slice(openIdx, i) };
}

function findHeroOpenIndexes(src) {
  const indexes = [];
  // Cari div dengan bg navy + ciri hero (pt/pb besar ATAU rounded-b ATAU overflow-hidden + pb)
  const re = /<div\\b[^>]*className\\s*=\\s*["'`][^"'`]*bg-\\[#003[Dd]79\\][^"'`]*["'`]/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const tag = m[0];
    const cls = (tag.match(/className\\s*=\\s*["'`]([^"'`]*)["'`]/) || [])[1] || '';
    const isHero =
      /-?mt-/.test(cls) === false && (
        /pt-\\d+/.test(cls) && /pb-\\d+/.test(cls) ||
        /rounded-b-/.test(cls) ||
        /overflow-hidden/.test(cls) && /pb-\\d+/.test(cls) ||
        /pb-(16|20|24|28|32)/.test(cls) ||
        /pt-(8|10|12|14|16)/.test(cls) && /pb-/.test(cls)
      );
    // Jangan anggap hero kalau class kecil (icon box / chip)
    const isSmall =
      /p-2/.test(cls) || /p-1/.test(cls) || /w-\\d/.test(cls) || /h-\\d/.test(cls) ||
      /rounded-xl/.test(cls) && !/rounded-b-/.test(cls) && !/pt-/.test(cls);

    if (isHero && !isSmall) {
      indexes.push(m.index);
    }
  }
  return indexes;
}

function stripNegativeMarginClasses(src) {
  // Hapus class -mt-N dari className
  return src.replace(/className\\s*=\\s*(["'`])([^"'`]*?)\\1/g, (full, q, cls) => {
    let next = cls
      .replace(/(?:^|\\s)-mt-(?:\\d+|\\[\\d+px\\]|\\[\\d+rem\\])(?=\\s|$)/g, ' ')
      .replace(/\\s+/g, ' ')
      .trim();
    return `className=${q}${next}${q}`;
  });
}

function removeDuplicateBackButtons(src) {
  // Jika sudah ada PageHeader, hapus tombol "Kembali" manual yang pakai router.back / history.back
  if (!src.includes('PageHeader')) return src;

  // Hapus button blocks yang berisi teks Kembali + router.back/history.back
  // Pendekatan: cari <button ...> ... Kembali ... </button>
  let result = '';
  let i = 0;
  while (i < src.length) {
    const btnIdx = src.indexOf('<button', i);
    if (btnIdx === -1) {
      result += src.slice(i);
      break;
    }
    result += src.slice(i, btnIdx);
    const block = removeBalancedJsxBlock(src, btnIdx);
    if (!block) {
      result += src[btnIdx];
      i = btnIdx + 1;
      continue;
    }
    const inner = block.text;
    const isBackBtn =
      /Kembali/i.test(inner) &&
      ( /router\\.back\\s*\\(/.test(inner) ||
        /history\\.back\\s*\\(/.test(inner) ||
        /window\\.history\\.back\\s*\\(/.test(inner) );

    if (isBackBtn) {
      // drop
      i = block.end;
      // bersihkan baris kosong berlebih di sekitar
      continue;
    }
    result += inner;
    i = block.end;
  }
  return result;
}

function fixCollateralClassDamage(src) {
  let s = src;

  // CELL_STYLE OFF yang rusak karena replace bg-slate-800
  s = s.replace(
    /'OFF'\\s*:\\s*\\{\\s*bg:\\s*'bg-white rounded-\\[14px\\] border border-\\[#e2e8f0\\] shadow-sm'\\s*,\\s*text:\\s*'text-white'\\s*,\\s*label:\\s*'Off\\/Libur'\\s*\\}/g,
    "'OFF': { bg: 'bg-slate-100', text: 'text-slate-500', label: 'Off/Libur' }"
  );
  s = s.replace(
    /"OFF"\\s*:\\s*\\{\\s*bg:\\s*"bg-white rounded-\\[14px\\] border border-\\[#e2e8f0\\] shadow-sm"\\s*,\\s*text:\\s*"text-white"\\s*,\\s*label:\\s*"Off\\/Libur"\\s*\\}/g,
    '"OFF": { bg: "bg-slate-100", text: "text-slate-500", label: "Off/Libur" }'
  );

  // dot status yang kepakan text-white
  s = s.replace(/dot:\\s*'bg-\\[#003d79\\] text-white'/g, "dot: 'bg-amber-500'");
  s = s.replace(/dot:\\s*"bg-\\[#003d79\\] text-white"/g, 'dot: "bg-amber-500"');

  // class tombol dobel text-white / sisa text-slate-950 dari amber
  s = s.replace(/text-white text-white/g, 'text-white');
  s = s.replace(/bg-\\[#003d79\\] text-white hover:bg-amber-400 text-slate-950/g, 'bg-[#003d79] text-white hover:bg-[#002a57]');
  s = s.replace(/bg-\\[#003d79\\] text-white text-slate-950/g, 'bg-[#003d79] text-white');
  s = s.replace(/hover:bg-amber-400 text-slate-950/g, 'hover:bg-[#002a57]');
  s = s.replace(/bg-\\[#003d79\\] text-white\\/10 border border-amber-500\\/20 text-\\[#003d79\\]/g, 'bg-[#003d79]/10 border border-[#003d79]/20 text-[#003d79]');

  return s;
}

function ensureContentPadding(src) {
  // Setelah PageHeader, pastikan ada wrapper konten ber-padding wajar jika hero dihapus
  // Tidak memaksa kalau sudah ada
  return src;
}

const pages = listPages(path.join(process.cwd(), 'app'));
let fixedHero = 0;
let fixedBack = 0;
let fixedCollateral = 0;
let touched = 0;

for (const filePath of pages) {
  // Jangan sentuh login
  if (filePath.includes(path.join('app', 'login')) || filePath.includes(`${path.sep}login${path.sep}`)) continue;

  let src = fs.readFileSync(filePath, 'utf8');
  const original = src;
  const rel = path.relative(process.cwd(), filePath);

  // 1) Collateral dulu (aman global)
  const beforeCol = src;
  src = fixCollateralClassDamage(src);
  if (src !== beforeCol) fixedCollateral++;

  // 2) Hapus hero blocks (dari belakang biar index aman)
  const heroes = findHeroOpenIndexes(src);
  if (heroes.length) {
    // unique + sort desc
    const uniq = [...new Set(heroes)].sort((a, b) => b - a);
    for (const idx of uniq) {
      // re-find because string may have shifted — gunakan index dari string current hanya jika masih match
      // Karena kita sort desc dan remove dari belakang, index masih valid selama remove di index >= current
      const block = removeBalancedJsxBlock(src, idx);
      if (!block) continue;

      // Validasi isi block: harus hero-ish (ada Kembali atau judul atau MATRIX dll) DAN navy
      const t = block.text;
      const looksHero =
        /bg-\\[#003[Dd]79\\]/.test(t) &&
        ( /Kembali/i.test(t) ||
          /pt-\\d+/.test(t) ||
          /rounded-b-/.test(t) ||
          /overflow-hidden/.test(t) ||
          /MATRIX|Manajemen|Rekap|Hero|relative z-/.test(t) );

      // Jangan hapus block yang terlalu besar (> 250 baris) — terlalu berisiko (bisa konten utama)
      const lineCount = t.split(/\\n/).length;
      if (lineCount > 80) {
        console.log(`  ⚠️ SKIP hero terlalu besar (${lineCount} lines) di ${rel} — manual review`);
        continue;
      }

      if (looksHero) {
        src = src.slice(0, block.start) + '\\n' + src.slice(block.end);
        fixedHero++;
      }
    }
  }

  // 3) Buang negative margin
  src = stripNegativeMarginClasses(src);

  // 4) Buang double back button jika PageHeader ada
  const beforeBack = src;
  src = removeDuplicateBackButtons(src);
  if (src !== beforeBack) fixedBack++;

  // 5) Rapikan baris kosong berlebih
  src = src.replace(/\\n{4,}/g, '\\n\\n\\n');

  if (src !== original) {
    fs.writeFileSync(filePath, src, 'utf8');
    touched++;
    console.log(`  ✅ Fixed: ${rel}`);
  }
}

console.log('\\n=======================================================');
console.log('📊 HASIL FIX STRUKTUR');
console.log(`  📄 File tersentuh     : ${touched}`);
console.log(`  🧱 Hero block dihapus : ${fixedHero}`);
console.log(`  🔙 Double back dibuang: ${fixedBack}`);
console.log(`  🎨 Collateral class   : ${fixedCollateral}`);
console.log('=======================================================');
console.log('Cek sekarang:');
console.log('  http://localhost:3000/dashboard/manajemen-absensi');
console.log('  http://localhost:3000/dashboard/rekap-absensi');
console.log('  http://localhost:3000/dashboard/koreksi-absensi');
console.log('  http://localhost:3000/dashboard/plant/logistik');
console.log('Harus seragam: 1x PageHeader navy + konten card putih flat.');
console.log('=======================================================');
