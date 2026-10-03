const fs=require('fs');const p='app/dashboard/views/TableView.tsx';
const r=fs.readFileSync(p,'utf8');const crlf=r.includes('\r\n');let s=r.replace(/\r\n/g,'\n');
if(!s.includes('KOLOM_RAHASIA')){console.error('GAGAL: responsif.js belum pernah jalan');process.exit(1);}
if(s.includes('KOLOM_PRIORITAS')){console.log('Sudah terpasang.');process.exit(0);}

// 1) betulkan tipe yang hilang (sumber error ts7006)
s=s.replace("(columns || []).filter((c) =>","(columns || []).filter((c: string) =>");

// 2) ganti blok pemilihan kolom, toleran terhadap spasi/baris
const re=/const kolomBersih = \(columns \|\| \[\]\)\.filter\(\(c: string\) => !KOLOM_RAHASIA\.includes\(c\)\)\s*\n\s*const kolomTampil =\s*\n\s*layarSempit && !semuaKolom \? kolomBersih\.slice\(0, KOLOM_RINGKAS\) : kolomBersih/;
if(!re.test(s)){console.error('GAGAL: blok kolomBersih/kolomTampil tidak cocok');process.exit(1);}
const b=`const KOLOM_PRIORITAS = [
    'nama', 'nrp', 'jabatan', 'status', 'jenis',
    'site', 'departemen', 'unit', 'tanggal', 'keterangan',
  ]

  const kolomBersih = (columns || []).filter((c: string) => !KOLOM_RAHASIA.includes(c))

  const pilih = (() => {
    const hasil: string[] = []
    const cocok = (c: string, k: string) => {
      const n = String(c).toLowerCase()
      return n === k || n.includes(k)
    }
    for (const kunci of KOLOM_PRIORITAS) {
      if (hasil.length >= KOLOM_RINGKAS) break
      const tepat = kolomBersih.find((c: string) => String(c).toLowerCase() === kunci && !hasil.includes(c))
      const mirip = kolomBersih.find((c: string) => cocok(c, kunci) && !hasil.includes(c))
      const pick = tepat || mirip
      if (pick) hasil.push(pick)
    }
    for (const c of kolomBersih) {
      if (hasil.length >= KOLOM_RINGKAS) break
      if (!hasil.includes(c)) hasil.push(c)
    }
    return hasil
  })()

  const kolomRingkasUrut = kolomBersih.filter((c: string) => pilih.includes(c))

  const kolomTampil =
    layarSempit && !semuaKolom ? kolomRingkasUrut : kolomBersih`;
s=s.replace(re,b);

if(/\((c)\) =>/.test(s) && s.includes('KOLOM_RAHASIA.includes')){console.error('GAGAL: masih ada parameter tanpa tipe');process.exit(1);}
const o=(s.match(/<div/g)||[]).length,c2=(s.match(/<\/div>/g)||[]).length,x=(s.match(/<div[^>]*\/>/g)||[]).length;
if(o-x!==c2){console.error('GAGAL: div tidak seimbang');process.exit(1);}
fs.writeFileSync(p+'.bak-prio',r,'utf8');
fs.writeFileSync(p,crlf?s.replace(/\n/g,'\r\n'):s,'utf8');
console.log('OK - tipe diperbaiki + prioritas kolom dipasang');