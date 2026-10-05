const fs=require('fs');const p='app/dashboard/layout.tsx';
const r=fs.readFileSync(p,'utf8');const crlf=r.includes('\r\n');let s=r.replace(/\r\n/g,'\n');
if(s.includes('shrink-0 ml-auto')){console.log('Sudah terpasang.');process.exit(0);}

let n=0;
// a) header jadi selebar penuh
const a='<header className="hidden lg:flex items-center justify-between h-16 px-8';
if(s.includes(a)){s=s.replace(a,'<header className="hidden lg:flex w-full items-center justify-between gap-4 h-16 px-8');n++;}

// b) blok kiri boleh menyusut
const b='            <div>\n              <h1 className="text-base font-black text-[#003D79] tracking-tight">Portal Internal BTM</h1>';
if(s.includes(b)){s=s.replace(b,'            <div className="min-w-0 flex-1">\n              <h1 className="text-base font-black text-[#003D79] tracking-tight">Portal Internal BTM</h1>');n++;}

// c) blok kanan: cari div pembungkus tombol Notifikasi di dalam header desktop
const iH=s.indexOf('hidden lg:flex');
const iN=s.indexOf('Notifikasi', iH);
if(iN<0){console.error('GAGAL: tombol Notifikasi tidak ketemu');process.exit(1);}
const iDiv=s.lastIndexOf('<div className="flex items-center', iN);
if(iDiv<0){
  console.error('GAGAL: pembungkus kanan tidak ketemu. Baris di sekitar Notifikasi:');
  console.error(s.slice(Math.max(0,iN-400), iN+80));
  process.exit(1);
}
const akhirTag=s.indexOf('>', iDiv)+1;
const baru='<div className="flex items-center gap-3 shrink-0 ml-auto">\n'+
'              <div className="text-right leading-tight">\n'+
'                <div className="text-[12px] font-black text-[#003D79] uppercase">{namaKaryawan}</div>\n'+
'                <div className="text-[10px] font-bold text-slate-400">\n'+
'                  {nrpKaryawan}{siteKaryawan ? <span className="text-blue-600"> &middot; {siteKaryawan}</span> : null}\n'+
'                </div>\n'+
'              </div>';
s=s.slice(0,iDiv)+baru+s.slice(akhirTag);
n++;

if(n<3){console.error('GAGAL: hanya '+n+'/3');process.exit(1);}
fs.writeFileSync(p+'.bak-hdr3',r,'utf8');
fs.writeFileSync(p,crlf?s.replace(/\n/g,'\r\n'):s,'utf8');
console.log('OK - header desktop dirapikan (3/3)');