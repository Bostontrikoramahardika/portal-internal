const fs=require('fs');const p='app/dashboard/layout.tsx';
let r=fs.readFileSync(p,'utf8');const crlf=r.includes('\r\n');let s=r.replace(/\r\n/g,'\n');
const a='<div className="p-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">';
const b='<div className="px-3 pt-2 pb-24 lg:px-8 lg:pt-6 lg:pb-10 max-w-lg lg:max-w-7xl w-full mx-auto">';
if(s.includes(b)){console.log('Sudah terpasang.');process.exit(0);}
if(!s.includes(a)){console.error('GAGAL: container tidak ketemu');process.exit(1);}
s=s.replace(a,b);
fs.writeFileSync(p+'.bak-shell',r,'utf8');
fs.writeFileSync(p,crlf?s.replace(/\n/g,'\r\n'):s,'utf8');
console.log('OK - container diseragamkan. Cadangan: layout.tsx.bak-shell');