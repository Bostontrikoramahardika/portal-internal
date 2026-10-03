const fs=require('fs');const p='app/dashboard/page.tsx';
const r=fs.readFileSync(p,'utf8');const crlf=r.includes('\r\n');let s=r.replace(/\r\n/g,'\n');
if(s.includes('apd_pengajuan')){console.log('Sudah ada.');process.exit(0);}
const a="  hr_dashboard: '/dashboard/hr-dashboard',";
if(!s.includes(a)){console.error('GAGAL: AUTO_REDIRECT_MAP tidak ketemu');process.exit(1);}
s=s.replace(a,"  apd_pengajuan: '/dashboard/apd-pengajuan',\n"+a);
fs.writeFileSync(p,crlf?s.replace(/\n/g,'\r\n'):s,'utf8');
console.log('OK - rute apd_pengajuan didaftarkan');