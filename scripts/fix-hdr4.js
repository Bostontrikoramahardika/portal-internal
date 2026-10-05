const fs=require('fs');const p='app/dashboard/layout.tsx';
const r=fs.readFileSync(p,'utf8');const crlf=r.includes('\r\n');let s=r.replace(/\r\n/g,'\n');
if(s.includes('shrink-0 ml-auto')){console.log('Sudah terpasang.');process.exit(0);}
let n=0;

const a='<header className="hidden lg:flex items-center justify-start h-16 px-8';
if(s.includes(a)){
  s=s.replace(a,'<header className="hidden lg:flex w-full items-center justify-between gap-4 h-16 px-8');n++;
}

const b='            <div>\n              <h1 className="text-base font-black text-[#003D79] tracking-tight">Portal Internal BTM</h1>';
if(s.includes(b)){
  s=s.replace(b,'            <div className="min-w-0 flex-1">\n              <h1 className="text-base font-black text-[#003D79] tracking-tight">Portal Internal BTM</h1>');n++;
}

const c='            <div className="flex items-center gap-4">\n              <button\n                type="button"\n                onClick={() => setIsNotifOpen(true)}';
if(s.includes(c)){
  s=s.replace(c,
'            <div className="flex items-center gap-3 shrink-0 ml-auto">\n'+
'              <div className="text-right leading-tight">\n'+
'                <div className="text-[12px] font-black text-[#003D79] uppercase">{namaKaryawan}</div>\n'+
'                <div className="text-[10px] font-bold text-slate-400">\n'+
'                  {nrpKaryawan}{siteKaryawan ? <span className="text-blue-600"> &middot; {siteKaryawan}</span> : null}\n'+
'                </div>\n'+
'              </div>\n'+
'              <button\n                type="button"\n                onClick={() => setIsNotifOpen(true)}');n++;
}

if(n<3){console.error('GAGAL: hanya '+n+'/3');process.exit(1);}
fs.writeFileSync(p+'.bak-hdr4',r,'utf8');
fs.writeFileSync(p,crlf?s.replace(/\n/g,'\r\n'):s,'utf8');
console.log('OK - header desktop (3/3): justify-start -> justify-between');