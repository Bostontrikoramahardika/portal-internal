const fs=require('fs');const p='app/dashboard/views/TableView.tsx';
let r=fs.readFileSync(p,'utf8');const crlf=r.includes('\r\n');let s=r.replace(/\r\n/g,'\n');
const re=/^\s*subtitle=\{.*\}\s*$/m;
if(!re.test(s)){console.error('GAGAL: baris subtitle tidak ketemu');process.exit(1);}
s=s.replace(re,"        subtitle={displayRows.length + ' dari ' + rows.length + ' data'}");
if(s.includes('\\`')||s.includes('\\$')){console.error('GAGAL: masih ada escape nyasar');process.exit(1);}
fs.writeFileSync(p,crlf?s.replace(/\n/g,'\r\n'):s,'utf8');
console.log('OK - baris subtitle diperbaiki');
console.log(s.split('\n').filter(l=>l.includes('subtitle=')).join('\n'));