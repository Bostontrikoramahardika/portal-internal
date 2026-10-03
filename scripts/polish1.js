const fs=require('fs');const g=[];

// 1) globals.css: scrollbar horizontal yang SELALU terlihat
{
  const p='app/globals.css';let c=fs.readFileSync(p,'utf8');
  if(c.includes('std-scroll-x')){console.log('[--] globals.css sudah');}
  else{
    c+="\n\n/* STD: scrollbar horizontal selalu terlihat (penting di HP) */\n"+
".std-scroll-x{scrollbar-width:thin;scrollbar-color:#94a3b8 #e2e8f0;-webkit-overflow-scrolling:touch}\n"+
".std-scroll-x::-webkit-scrollbar{height:8px}\n"+
".std-scroll-x::-webkit-scrollbar-track{background:#e2e8f0;border-radius:999px}\n"+
".std-scroll-x::-webkit-scrollbar-thumb{background:#94a3b8;border-radius:999px;border:2px solid #e2e8f0}\n"+
".std-scroll-x::-webkit-scrollbar-thumb:active{background:#0b2a5b}\n";
    fs.writeFileSync(p,c,'utf8');console.log('[OK] globals.css');
  }
}

// 2) TableView: pakai scrollbar + 3 perapian
{
  const p='app/dashboard/views/TableView.tsx';
  const r=fs.readFileSync(p,'utf8');const crlf=r.includes('\r\n');let s=r.replace(/\r\n/g,'\n');
  if(s.includes('std-scroll-x')){console.log('[--] TableView sudah');}
  else{
    const rep=[
      ['<div className="overflow-x-auto overflow-y-auto max-h-[60vh]">',
       '<div className="std-scroll-x overflow-x-auto overflow-y-auto max-h-[60vh] pb-1">'],
      ['            Menampilkan <span className="text-[#003D79] font-black">{displayRows.length}</span> dari {rows.length} data\n',
       "            {hasActiveFilters ? 'Hasil tersaring' : 'Semua data'}\n"],
      ["{renderTable(activeRows, '\u2705 Karyawan Aktif', 'bg-emerald-600')}",
       "{renderTable(activeRows, 'Karyawan Aktif', 'bg-[#0b2a5b]')}"],
      ['className="py-2 lg:py-2.5 px-3 rounded-lg lg:rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-[10px] lg:text-xs font-black hover:bg-rose-100 transition-all whitespace-nowrap"',
       'className="self-end lg:self-auto py-2 lg:py-2.5 px-3 rounded-lg lg:rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-[10px] lg:text-xs font-black hover:bg-rose-100 transition-all whitespace-nowrap"']
    ];
    let n=0;for(const [a,b] of rep){if(s.includes(a)){s=s.replace(a,b);n++;}}
    s=s.split("'bg-rose-600'").join("'bg-slate-500'");
    if(n<3)g.push('TableView: hanya '+n+'/4 pola ketemu');
    else{
      const o=(s.match(/<div/g)||[]).length,c2=(s.match(/<\/div>/g)||[]).length,x=(s.match(/<div[^>]*\/>/g)||[]).length;
      if(o-x!==c2){g.push('TableView: div tidak seimbang');}
      else{fs.writeFileSync(p+'.bak-polish',r,'utf8');
        fs.writeFileSync(p,crlf?s.replace(/\n/g,'\r\n'):s,'utf8');console.log('[OK] TableView ('+n+'/4)');}
    }
  }
}

if(g.length){console.error('\nGAGAL:');g.forEach(x=>console.error('  - '+x));process.exit(1);}
console.log('\nSelesai.');