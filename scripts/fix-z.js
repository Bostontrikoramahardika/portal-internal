const fs=require('fs');const p='app/dashboard/views/TableView.tsx';
const r=fs.readFileSync(p,'utf8');const crlf=r.includes('\r\n');let s=r.replace(/\r\n/g,'\n');
let n=0;
// 1) thead harus di atas badan tabel
const a='<thead className="bg-[#003D79] text-white sticky top-0 z-10 shadow-md">';
const b='<thead className="bg-[#003D79] text-white sticky top-0 z-40 shadow-md">';
if(s.includes(a)){s=s.replace(a,b);n++;console.log('[OK] thead z-10 -> z-40');}
else if(s.includes(b)){console.log('[--] thead sudah z-40');}
else{console.error('GAGAL: thead tidak ketemu');process.exit(1);}
// 2) warna bar seksi -> navy / abu (tahan beda emoji)
const before=s;
s=s.split("'bg-emerald-600'").join("'bg-[#0b2a5b]'");
s=s.split("'bg-rose-500'").join("'bg-slate-500'");
s=s.replace(/renderTable\((\w+),\s*'[^A-Za-z0-9']*\s*([^']*)'/g,"renderTable($1, '$2'");
if(s!==before){n++;console.log('[OK] warna bar + emoji judul seksi');}
const o=(s.match(/<div/g)||[]).length,c=(s.match(/<\/div>/g)||[]).length,x=(s.match(/<div[^>]*\/>/g)||[]).length;
if(o-x!==c){console.error('GAGAL: div tidak seimbang - file TIDAK diubah');process.exit(1);}
if(!n){console.log('Tidak ada perubahan.');process.exit(0);}
fs.writeFileSync(p+'.bak-zfix',r,'utf8');
fs.writeFileSync(p,crlf?s.replace(/\n/g,'\r\n'):s,'utf8');
console.log('Selesai. Cadangan: TableView.tsx.bak-zfix');