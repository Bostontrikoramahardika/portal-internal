const fs=require('fs'),path=require('path');
function cari(d,out){for(const e of fs.readdirSync(d,{withFileTypes:true})){
  const f=path.join(d,e.name);
  if(e.isDirectory()){if(!e.name.startsWith('['))cari(f,out);}
  else if(e.name==='page.tsx')out.push(f.replace(/\\/g,'/'));}return out;}
const files=cari('app/dashboard',[]).filter(f=>
  f!=='app/dashboard/page.tsx' && !f.includes('/apd-saya/') && !f.includes('/mcu-saya/'));
const ubah=[];
for(const f of files){
  const r=fs.readFileSync(f,'utf8');const crlf=r.includes('\r\n');let s=r.replace(/\r\n/g,'\n');
  const m=/(return \(\s*\n\s*<div className=")([^"]*)(")/.exec(s);
  if(!m)continue;
  const asli=m[2];
  let c=asli
    .replace(/\bmin-h-screen\b/g,'')
    .replace(/\bmax-w-\w+\b/g,'')
    .replace(/\bmx-auto\b/g,'')
    .replace(/\b(sm:|md:|lg:)?p[xy]?-\d(\.\d)?\b/g,'')
    .replace(/\s+/g,' ').trim();
  if(c===asli)continue;
  s=s.slice(0,m.index+m[1].length)+c+s.slice(m.index+m[1].length+asli.length);
  const o=(s.match(/<div/g)||[]).length,cl=(s.match(/<\/div>/g)||[]).length,x=(s.match(/<div[^>]*\/>/g)||[]).length;
  if(o-x!==cl){console.error('LEWAT (div tidak seimbang): '+f);continue;}
  if(!fs.existsSync(f+'.bak-gel3'))fs.writeFileSync(f+'.bak-gel3',r,'utf8');
  fs.writeFileSync(f,crlf?s.replace(/\n/g,'\r\n'):s,'utf8');
  ubah.push(f.split('/').slice(2).join('/'));
}
console.log(ubah.join('\n'));
console.log('\n'+ubah.length+' halaman dinormalkan. Cadangan: *.bak-gel3');