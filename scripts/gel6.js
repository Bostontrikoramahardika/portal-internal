const fs=require('fs');
const target=[
 ['app/dashboard/plant/page.tsx','Plant','Kru & Workshop Plant','Monitoring kru dan workshop'],
 ['app/dashboard/plant/inspeksi/page.tsx','Plant','Inspeksi P2H','Pemeriksaan harian unit'],
 ['app/dashboard/rekrutmen/page.tsx','HR','Rekrutmen & Pelamar','Lowongan dan kandidat'],
 ['app/dashboard/logistik/page.tsx','Plant & Logistik','Logistik Master','Gudang dan pengadaan'],
];
for (const [p,eyeb,judul,sub] of target){
  if(!fs.existsSync(p)){console.log('  [TIDAK ADA] '+p);continue;}
  const r=fs.readFileSync(p,'utf8');const crlf=r.includes('\r\n');let s=r.replace(/\r\n/g,'\n');
  if(s.includes('StatBanner')){console.log('  [--] '+p.split('/')[2]);continue;}
  const im=[...s.matchAll(/^import [\s\S]*?from ['"][^'"]+['"];?\s*$/gm)];
  if(!im.length){console.log('  [LEWAT import] '+p);continue;}
  const last=im[im.length-1];
  s=s.slice(0,last.index+last[0].length)+"\nimport StatBanner from '@/app/components/std/StatBanner'"+s.slice(last.index+last[0].length);
  const m=/(return \(\s*\n)(\s*)(<div className="[^"]*">\n)/.exec(s);
  if(!m){console.log('  [LEWAT wrapper] '+p);continue;}
  const ind=m[2]+'  ';
  const sisip=ind+'<StatBanner eyebrow="'+eyeb+'" title="'+judul+'" subtitle="'+sub+'" />\n';
  const pos=m.index+m[0].length;
  s=s.slice(0,pos)+sisip+s.slice(pos);
  const o=(s.match(/<div/g)||[]).length,c=(s.match(/<\/div>/g)||[]).length,x=(s.match(/<div[^>]*\/>/g)||[]).length;
  if(o-x!==c){console.log('  [LEWAT div] '+p);continue;}
  if(!fs.existsSync(p+'.bak-gel6'))fs.writeFileSync(p+'.bak-gel6',r,'utf8');
  fs.writeFileSync(p,crlf?s.replace(/\n/g,'\r\n'):s,'utf8');
  console.log('  [OK]    '+p.split('/').slice(2).join('/')+' -> "'+judul+'"');
}