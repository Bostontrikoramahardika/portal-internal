const fs=require('fs');const g=[];
function io(p){const r=fs.readFileSync(p,'utf8');return{r,crlf:r.includes('\r\n'),t:r.replace(/\r\n/g,'\n')};}
function save(p,t,crlf,r){if(!fs.existsSync(p+'.bak-nama'))fs.writeFileSync(p+'.bak-nama',r,'utf8');
  fs.writeFileSync(p,crlf?t.replace(/\n/g,'\r\n'):t,'utf8');}

{ const p='app/lib/design-system.ts';let {r,crlf,t}=io(p);
  if(t.includes('BTM_APP_NAME'))console.log('[--] design-system sudah');
  else{ t+="\n\n/** Nama aplikasi - satu sumber untuk seluruh tampilan */\nexport const BTM_APP_NAME = 'BTM Mobile App'\nexport const BTM_APP_SHORT = 'BTM Mobile'\n";
    save(p,t,crlf,r);console.log('[OK] design-system');} }

{ const p='app/dashboard/layout.tsx';let {r,crlf,t}=io(p);
  if(t.includes('BTM_APP_SHORT'))console.log('[--] layout sudah');
  else{
    const im=[...t.matchAll(/^import [\s\S]*?from ['"][^'"]+['"];?\s*$/gm)];
    if(!im.length)g.push('layout: import');
    else{
      const last=im[im.length-1];
      t=t.slice(0,last.index+last[0].length)+"\nimport { BTM_APP_NAME, BTM_APP_SHORT } from '@/app/lib/design-system'"+t.slice(last.index+last[0].length);
      let n=0;
      const rep=[
        ['<span className="font-black tracking-tight text-base">BTM PORTAL</span>','<span className="font-black tracking-tight text-base">{BTM_APP_SHORT}</span>'],
        ['<h1 className="text-base font-black text-[#003D79] tracking-tight">Portal Internal BTM</h1>','<h1 className="text-base font-black text-[#003D79] tracking-tight">{BTM_APP_NAME}</h1>'],
        ['<h1 className="text-[11px] font-black uppercase text-[#003D79] tracking-tight whitespace-nowrap">BTM Mobile</h1>','<h1 className="text-[11px] font-black uppercase text-[#003D79] tracking-tight whitespace-nowrap">{BTM_APP_SHORT}</h1>'],
      ];
      for(const [a,b] of rep){if(t.includes(a)){t=t.replace(a,b);n++;}}
      if(n<2)g.push('layout: hanya '+n+'/3 nama');
      else{save(p,t,crlf,r);console.log('[OK] layout ('+n+'/3)');}
    } } }

{ const p='app/layout.tsx';let {r,crlf,t}=io(p);
  if(t.includes("title: 'BTM Mobile App'"))console.log('[--] judul tab sudah');
  else{ t=t.replace("title: 'BTM Portal Internal',","title: 'BTM Mobile App',")
          .replace("description: 'Aplikasi Portal Internal BTM',","description: 'BTM Mobile App - Portal Internal',");
    save(p,t,crlf,r);console.log('[OK] judul tab browser');} }

if(g.length){console.error('\nGAGAL:');g.forEach(x=>console.error('  - '+x));process.exit(1);}
console.log('\nSelesai.');