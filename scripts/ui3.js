const fs=require('fs');const g=[];
function io(p){const r=fs.readFileSync(p,'utf8');return{r,crlf:r.includes('\r\n'),t:r.replace(/\r\n/g,'\n')};}
function save(p,t,crlf,r){if(!fs.existsSync(p+'.bak-ui3'))fs.writeFileSync(p+'.bak-ui3',r,'utf8');
  fs.writeFileSync(p,crlf?t.replace(/\n/g,'\r\n'):t,'utf8');}

// 1) HEADER DESKTOP ke tepi kanan + nama/NRP
{
  const p='app/dashboard/layout.tsx';let {r,crlf,t}=io(p);
  if(t.includes('shrink-0 ml-auto')){console.log('[--] header desktop sudah');}
  else{
    let n=0;
    const rep=[
      ['<header className="hidden lg:flex items-center justify-between h-16 px-8',
       '<header className="hidden lg:flex w-full items-center justify-between gap-4 h-16 px-8'],
      ['            <div>\n              <h1 className="text-base font-black text-[#003D79] tracking-tight">Portal Internal BTM</h1>',
       '            <div className="min-w-0 flex-1">\n              <h1 className="text-base font-black text-[#003D79] tracking-tight">Portal Internal BTM</h1>'],
      ['            <div className="flex items-center gap-4">\n              <button\n                type="button"\n                onClick={() => setIsNotifOpen(true)}',
       '            <div className="flex items-center gap-3 shrink-0 ml-auto">\n              <div className="text-right leading-tight">\n                <div className="text-[12px] font-black text-[#003D79] uppercase">{namaKaryawan}</div>\n                <div className="text-[10px] font-bold text-slate-400">\n                  {nrpKaryawan}{siteKaryawan ? <span className="text-blue-600"> &middot; {siteKaryawan}</span> : null}\n                </div>\n              </div>\n              <button\n                type="button"\n                onClick={() => setIsNotifOpen(true)}'],
    ];
    for(const [a,b] of rep){if(t.includes(a)){t=t.replace(a,b);n++;}}
    if(n<3)g.push('layout: hanya '+n+'/3 pola');
    else{save(p,t,crlf,r);console.log('[OK] header desktop');}
  }
}

// 2) MATRIKS muat sebulan
{
  const p='app/dashboard/manajemen-absensi/page.tsx';let {r,crlf,t}=io(p);
  if(t.includes('min-w-[22px]')){console.log('[--] matriks sudah rapat');}
  else{
    const rep=[
      ['sticky left-0 bg-[#003D79] z-10 min-w-[40px]','sticky left-0 bg-[#003D79] z-10 min-w-[28px]'],
      ['sticky left-[40px] bg-[#003D79] z-10 min-w-[140px]','sticky left-[28px] bg-[#003D79] z-10 min-w-[120px]'],
      ['<th className="px-2 py-2 text-left min-w-[110px]">Jabatan</th>','<th className="px-2 py-2 text-left min-w-[88px]">Jabatan</th>'],
      ['className="px-1 py-2 text-center min-w-[32px] font-bold"','className="px-0.5 py-2 text-center min-w-[22px] font-bold"'],
      ['text-center min-w-[45px] bg-emerald-700','text-center min-w-[38px] bg-emerald-700'],
      ['<th className="px-2 py-2 text-center min-w-[35px]">S</th>','<th className="px-1 py-2 text-center min-w-[26px]">S</th>'],
      ['<th className="px-2 py-2 text-center min-w-[35px]">I</th>','<th className="px-1 py-2 text-center min-w-[26px]">I</th>'],
      ['<th className="px-2 py-2 text-center min-w-[35px]">A</th>','<th className="px-1 py-2 text-center min-w-[26px]">A</th>'],
      ['<th className="px-2 py-2 text-center min-w-[45px]">Off</th>','<th className="px-1 py-2 text-center min-w-[32px]">Off</th>'],
      ['<th className="px-2 py-2 text-center min-w-[50px]">Cuti</th>','<th className="px-1 py-2 text-center min-w-[36px]">Cuti</th>'],
      ['<th className="px-2 py-2 text-center min-w-[60px]">Aksi</th>','<th className="px-1 py-2 text-center min-w-[44px]">Aksi</th>'],
    ];
    let n=0;for(const [a,b] of rep){if(t.includes(a)){t=t.split(a).join(b);n++;}}
    t=t.split('className="px-1 py-1 text-center"').join('className="px-0.5 py-1 text-center"');
    if(n<8)g.push('matriks: hanya '+n+'/11 pola');
    else{save(p,t,crlf,r);console.log('[OK] matriks ('+n+'/11)');}
  }
}
if(g.length){console.error('\nGAGAL:');g.forEach(x=>console.error('  - '+x));process.exit(1);}
console.log('\nSelesai.');