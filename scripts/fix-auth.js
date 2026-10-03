const fs=require('fs');const p='app/dashboard/layout.tsx';
const r=fs.readFileSync(p,'utf8');const crlf=r.includes('\r\n');let s=r.replace(/\r\n/g,'\n');
if(s.includes('AuthProvider')){console.log('Sudah terpasang.');process.exit(0);}
const imp=[...s.matchAll(/^import .*$/gm)].pop();
if(!imp){console.error('GAGAL: import tidak ketemu');process.exit(1);}
s=s.slice(0,imp.index+imp[0].length)+"\nimport { AuthProvider } from '@/app/lib/AuthContext'"+s.slice(imp.index+imp[0].length);
const anchor=s.indexOf('const userInitial');
if(anchor<0){console.error('GAGAL: userInitial tidak ketemu');process.exit(1);}
const i=s.indexOf('  return (\n',anchor);
const j=s.lastIndexOf('  )\n}');
if(i<0||j<0||j<i){console.error('GAGAL: blok return tidak ketemu');process.exit(1);}
const badan=s.slice(i+'  return (\n'.length,j);
s=s.slice(0,i)+'  return (\n    <AuthProvider\n      user={currentUser}\n      permissions={currentUser?.permissions || []}\n    >\n'+badan+'    </AuthProvider>\n'+s.slice(j);
const ob=(s.match(/<AuthProvider/g)||[]).length,cl=(s.match(/<\/AuthProvider>/g)||[]).length;
if(ob!==1||cl!==1){console.error('GAGAL: AuthProvider tidak seimbang');process.exit(1);}
fs.writeFileSync(p+'.bak-auth',r,'utf8');
fs.writeFileSync(p,crlf?s.replace(/\n/g,'\r\n'):s,'utf8');
console.log('OK - AuthProvider dipasang. Cadangan: layout.tsx.bak-auth');