const fs=require('fs');const p='app/dashboard/views/TableView.tsx';
const r=fs.readFileSync(p,'utf8');const crlf=r.includes('\r\n');let s=r.replace(/\r\n/g,'\n');
if(s.includes('KOLOM_PRIORITAS')){console.log('Sudah terpasang.');process.exit(0);}
const a="  const kolomBersih = (columns || []).filter((c: string) => !KOLOM_RAHASIA.includes(c))\n  const kolomTampil =\n    layarSempit && !semuaKolom ? kolomBersih.slice(0, KOLOM_RINGKAS) : kolomBersih";
if(!s.includes(a)){console.error('GAGAL: blok kolomBersih tidak ketemu - jalankan responsif.js dulu');process.exit(1);}
const b=`  const KOLOM_PRIORITAS = [
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
s=s.replace(a,b);
const o=(s.match(/<div/g)||[]).length,c=(s.match(/<\/div>/g)||[]).length,x=(s.match(/<div[^>]*\/>/g)||[]).length;
if(o-x!==c){console.error('GAGAL: div tidak seimbang');process.exit(1);}
fs.writeFileSync(p+'.bak-prio',r,'utf8');
fs.writeFileSync(p,crlf?s.replace(/\n/g,'\r\n'):s,'utf8');
console.log('OK - prioritas kolom dipasang');