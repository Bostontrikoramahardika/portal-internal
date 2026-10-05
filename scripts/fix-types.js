const fs=require('fs');const p='app/api/attendance/matrix/route.ts';
const r=fs.readFileSync(p,'utf8');const crlf=r.includes('\r\n');let s=r.replace(/\r\n/g,'\n');
const rep=[
 ['const nrpSemua = employees.map((e) => e.nrp)',
  'const nrpSemua = employees.map((e: any) => e.nrp)'],
 ['const lemburMap = {}',
  'const lemburMap: Record<string, any[]> = {}'],
 ['const disetujui = (lemburRows || []).filter((l) => {',
  'const disetujui = (lemburRows || []).filter((l: any) => {'],
 ['disetujui.flatMap((l) => [l.pjo_nrp, l.atasan_nrp])',
  'disetujui.flatMap((l: any) => [l.pjo_nrp, l.atasan_nrp])'],
 ['const namaMap = {}',
  'const namaMap: Record<string, string> = {}'],
 [';(ap || []).forEach((x) => {',
  ';(ap || []).forEach((x: any) => {'],
 ['disetujui.forEach((l) => {',
  'disetujui.forEach((l: any) => {'],
 ['Object.keys(lemburMap).forEach((k) =>',
  'Object.keys(lemburMap).forEach((k: string) =>'],
 ['lemburMap[k].sort((x, y) => String(x.tanggal).localeCompare(String(y.tanggal)))',
  'lemburMap[k].sort((x: any, y: any) => String(x.tanggal).localeCompare(String(y.tanggal)))'],
];
let n=0;
for(const [a,b] of rep){ if(s.includes(a)){ s=s.split(a).join(b); n++; } }
if(!n){console.log('Tidak ada yang perlu diubah.');process.exit(0);}
fs.writeFileSync(p+'.bak-types',r,'utf8');
fs.writeFileSync(p,crlf?s.replace(/\n/g,'\r\n'):s,'utf8');
console.log('OK - '+n+'/9 anotasi tipe ditambahkan');