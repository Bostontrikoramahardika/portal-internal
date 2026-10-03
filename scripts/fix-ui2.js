const fs=require('fs');const g=[];
function io(p){const r=fs.readFileSync(p,'utf8');return{r,crlf:r.includes('\r\n'),t:r.replace(/\r\n/g,'\n')};}
function save(p,t,crlf,r,tag){if(!fs.existsSync(p+tag))fs.writeFileSync(p+tag,r,'utf8');
  fs.writeFileSync(p,crlf?t.replace(/\n/g,'\r\n'):t,'utf8');}

// A. TableView: baris filter ikut dipaku + penanda geser dirapikan
{
  const p='app/dashboard/views/TableView.tsx';let {r,crlf,t}=io(p);
  if(t.includes("filter-${c}`}\n                  className=")){console.log('[--] TableView sudah');}
  else{
    const a="              {columns.map((c: string) => (\n                <th key={`filter-${c}`} className=\"px-1.5 py-1 lg:px-2 lg:py-1.5\">";
    const b="              {columns.map((c: string, ci: number) => (\n                <th\n                  key={`filter-${c}`}\n                  className={'px-1.5 py-1 lg:px-2 lg:py-1.5 ' + (ci === 0 ? 'sticky left-0 z-30 bg-blue-50 shadow-[2px_0_4px_rgba(0,0,0,0.12)]' : '')}\n                >";
    if(!t.includes(a))g.push('TableView: baris filter');
    else{
      t=t.replace(a,b);
      const c1='        <div className="lg:hidden px-3 pt-1.5 pb-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">\n          Geser ke samping untuk melihat kolom lain &rarr;\n        </div>\n';
      const c2='        <div className="lg:hidden flex items-center gap-1 px-3 pt-2 pb-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">\n          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">\n            <polyline points="13 17 18 12 13 7" /><polyline points="6 17 11 12 6 7" />\n          </svg>\n          Geser untuk kolom lain\n        </div>\n';
      if(t.includes(c1))t=t.replace(c1,c2);
      save(p,t,crlf,r,'.bak-fix2');console.log('[OK] TableView');
    }
  }
}

// B. layout: header anti-tabrakan
{
  const p='app/dashboard/layout.tsx';let {r,crlf,t}=io(p);
  if(t.includes('min-w-0 flex-1 justify-end')){console.log('[--] header sudah');}
  else{
    let n=0;
    const rep=[
      ['<div className="flex items-center gap-2 shrink-0">','<div className="flex items-center gap-2 shrink-0 min-w-0">'],
      ['<h1 className="text-[11px] font-black uppercase text-[#003D79] tracking-tight">BTM Mobile</h1>','<h1 className="text-[11px] font-black uppercase text-[#003D79] tracking-tight whitespace-nowrap">BTM Mobile</h1>'],
      ['<div className="flex items-center gap-2.5 min-w-0">','<div className="flex items-center gap-2.5 min-w-0 flex-1 justify-end pl-2">'],
      ['<div className="text-[11px] font-black text-[#003D79] uppercase truncate max-w-[150px]">','<div className="text-[11px] font-black text-[#003D79] uppercase truncate">'],
      ['<div className="text-[9px] font-bold text-slate-400 truncate max-w-[150px]">','<div className="text-[9px] font-bold text-slate-400 truncate">']
    ];
    for(const [a,b] of rep){if(t.includes(a)){t=t.replace(a,b);n++;}}
    if(n<3)g.push('layout: hanya '+n+'/5 pola ketemu');
    else{save(p,t,crlf,r,'.bak-fix2');console.log('[OK] layout ('+n+'/5)');}
  }
}

if(g.length){console.error('\nGAGAL:');g.forEach(x=>console.error('  - '+x));process.exit(1);}
console.log('\nSelesai. Cadangan: *.bak-fix2');