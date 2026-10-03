const fs=require('fs');

function cariBlok(lines, barisH1){
  const indH1 = lines[barisH1].length - lines[barisH1].trimStart().length;
  let start = -1;
  for (let n = barisH1-1; n >= 0; n--){
    const st = lines[n].trim();
    if (!st.startsWith('<div')) continue;
    const ind = lines[n].length - lines[n].trimStart().length;
    if (ind < indH1){ start = n; break; }
  }
  if (start < 0) return null;
  let depth = 0;
  for (let n = start; n < lines.length; n++){
    const buka = (lines[n].match(/<div\b/g)||[]).length;
    const mandiri = (lines[n].match(/<div\b[^>]*\/>/g)||[]).length;
    const tutup = (lines[n].match(/<\/div>/g)||[]).length;
    depth += buka - mandiri - tutup;
    if (depth === 0) return [start, n];
  }
  return null;
}

function konversi(p, eyebrow){
  const r = fs.readFileSync(p,'utf8');
  const crlf = r.includes('\r\n');
  let s = r.replace(/\r\n/g,'\n');
  if (s.includes('StatBanner')) return ['SUDAH'];
  const m = /<h1[^>]*>([^<]{2,60})<\/h1>/.exec(s);
  if (!m) return ['LEWAT: tidak ada h1'];
  let judul = m[1].trim().replace(/^[^A-Za-z0-9(]+/,'');
  if (judul === judul.toUpperCase())
    judul = judul.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  const lines = s.split('\n');
  const barisH1 = s.slice(0, m.index).split('\n').length - 1;
  const blok = cariBlok(lines, barisH1);
  if (!blok) return ['LEWAT: blok header tidak ketemu'];
  const [a,b] = blok;
  const ind = ' '.repeat(lines[a].length - lines[a].trimStart().length);
  const sub = /<p[^>]*>([^<]{2,80})<\/p>/.exec(lines.slice(a,b+1).join('\n'));
  const subtitle = sub ? sub[1].trim().replace(/\s+/g,' ') : '';
  const baru = ind + '<StatBanner eyebrow="' + eyebrow + '" title="' + judul + '"' +
               (subtitle ? ' subtitle="' + subtitle + '"' : '') + ' />';
  lines.splice(a, b-a+1, baru);
  let out = lines.join('\n');
  const im = [...out.matchAll(/^import [\s\S]*?from '[^']+'\s*$/gm)];
  if (!im.length) return ['LEWAT: import tidak ketemu'];
  const last = im[im.length-1];
  out = out.slice(0,last.index+last[0].length) +
        "\nimport StatBanner from '@/app/components/std/StatBanner'" +
        out.slice(last.index+last[0].length);
  const o=(out.match(/<div/g)||[]).length, c=(out.match(/<\/div>/g)||[]).length,
        x=(out.match(/<div[^>]*\/>/g)||[]).length;
  if (o-x!==c) return ['LEWAT: div tidak seimbang'];
  if (!fs.existsSync(p+'.bak-gel5')) fs.writeFileSync(p+'.bak-gel5', r, 'utf8');
  fs.writeFileSync(p, crlf ? out.replace(/\n/g,'\r\n') : out, 'utf8');
  return ['OK', judul];
}

const target = [
  ['app/dashboard/dashboard-cuti/page.tsx','HR'],
  ['app/dashboard/hr-override-absensi/page.tsx','HR'],
  ['app/dashboard/manajemen-absensi/page.tsx','HR'],
  ['app/dashboard/monitoring-mcu/page.tsx','HR'],
  ['app/dashboard/import-mcu/page.tsx','Import Data'],
  ['app/dashboard/import-roster/page.tsx','Import Data'],
  ['app/dashboard/kelola-akses/page.tsx','Admin'],
  ['app/dashboard/kelola-event/page.tsx','Admin'],
  ['app/dashboard/kelola-apd/page.tsx','SHE'],
  ['app/dashboard/setting-unit/page.tsx','Leader'],
  ['app/dashboard/koreksi-absensi/page.tsx','Pengajuan'],
  ['app/dashboard/scan-qr/page.tsx','Absensi'],
];
for (const [p,e] of target){
  if (!fs.existsSync(p)){ console.log('  [TIDAK ADA] '+p); continue; }
  const [st,judul] = konversi(p,e);
  const nama = p.split('/')[2];
  console.log(st==='OK' ? '  [OK]    '+nama.padEnd(22)+' -> "'+judul+'"'
                        : '  ['+st+'] '+nama);
}

