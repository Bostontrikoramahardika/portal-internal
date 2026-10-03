const fs=require('fs');const p='app/dashboard/layout.tsx';
let r=fs.readFileSync(p,'utf8');const crlf=r.includes('\r\n');let s=r.replace(/\r\n/g,'\n');
if(s.includes('MenuTabs')){console.log('Sudah terpasang.');process.exit(0);}
const imp=[...s.matchAll(/^import .*$/gm)].pop();
if(!imp){console.error('GAGAL: tidak ada baris import');process.exit(1);}
s=s.slice(0,imp.index+imp[0].length)+"\nimport MenuTabs from '@/app/components/MenuTabs'"+s.slice(imp.index+imp[0].length);
if(!/\{children\}/.test(s)){console.error('GAGAL: {children} tidak ketemu');process.exit(1);}
s=s.replace(/([ \t]*)\{children\}/, (m,i)=>i+'<MenuTabs menus={menus} />\n'+i+'{children}');
fs.writeFileSync(p+'.bak-menutabs',r,'utf8');
fs.writeFileSync(p,crlf?s.replace(/\n/g,'\r\n'):s,'utf8');
console.log('OK - MenuTabs disisipkan ke layout. Cadangan: layout.tsx.bak-menutabs');