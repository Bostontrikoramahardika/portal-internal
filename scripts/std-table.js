const fs=require('fs');const p='app/dashboard/views/TableView.tsx';
let r=fs.readFileSync(p,'utf8');const crlf=r.includes('\r\n');let s=r.replace(/\r\n/g,'\n');
if(s.includes('STDTABLE')){console.log('Sudah terpasang.');process.exit(0);}
const g=[];

const lamaTh=`              {columns.map((c: string) => (
                <th 
                  key={c} 
                  className="px-2.5 py-1.5 lg:px-4 lg:py-2 font-black uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-[#002D5F] transition-colors select-none text-[10px] lg:text-[11px]"
                  onClick={() => handleSort(c)}
                >`;
const baruTh=`              {columns.map((c: string, ci: number) => (
                <th 
                  key={c} 
                  className={'px-2.5 py-1.5 lg:px-4 lg:py-2 font-black uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-[#002D5F] transition-colors select-none text-[10px] lg:text-[11px] ' + (ci === 0 ? 'sticky left-0 z-30 bg-[#003D79] shadow-[2px_0_4px_rgba(0,0,0,0.18)]' : '')}
                  onClick={() => handleSort(c)}
                >`;
if(!s.includes(lamaTh))g.push('header tabel');else s=s.replace(lamaTh,baruTh);

const lamaTd=`                {columns.map((c: string) => (
                  <td key={c} className="px-2.5 py-1.5 lg:px-4 lg:py-2 whitespace-nowrap font-medium text-slate-700 text-[11px] lg:text-xs">
                    {renderCell(c, r[c])}
                  </td>
                ))}`;
const baruTd=`                {columns.map((c: string, ci: number) => (
                  <td
                    key={c}
                    className={
                      'px-2.5 py-1.5 lg:px-4 lg:py-2 whitespace-nowrap font-medium text-slate-700 text-[11px] lg:text-xs ' +
                      (ci === 0
                        ? 'sticky left-0 z-10 font-bold shadow-[2px_0_4px_rgba(0,0,0,0.06)] ' +
                          (i % 2 === 0 ? 'bg-white' : 'bg-slate-50')
                        : '')
                    }
                  >
                    {renderCell(c, r[c])}
                  </td>
                ))}`;
if(!s.includes(lamaTd))g.push('isi tabel');else s=s.replace(lamaTd,baruTd);

const lamaW=`      <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">`;
const baruW=`      {/* STDTABLE: geser horizontal + kolom pertama dipaku */}
      <div className="relative">
        <div className="pointer-events-none absolute top-0 right-0 h-full w-6 z-20 bg-gradient-to-l from-slate-900/10 to-transparent lg:hidden" />
        <div className="lg:hidden px-3 pt-1.5 pb-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">
          Geser ke samping untuk melihat kolom lain &rarr;
        </div>
      <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">`;
if(!s.includes(lamaW))g.push('pembungkus tabel');else s=s.replace(lamaW,baruW);

if(g.length){console.error('GAGAL:');g.forEach(x=>console.error('  - '+x));process.exit(1);}
const i=s.indexOf('</table>');const j=s.indexOf('</div>',i);
s=s.slice(0,j+6)+'\n      </div>'+s.slice(j+6);
fs.writeFileSync(p+'.bak-stdtable',r,'utf8');
fs.writeFileSync(p,crlf?s.replace(/\n/g,'\r\n'):s,'utf8');
const b=(s.match(/<div/g)||[]).length,t2=(s.match(/<\/div>/g)||[]).length,m=(s.match(/<div[^>]*\/>/g)||[]).length;
console.log('div seimbang:',b-m===t2);
console.log('OK - TableView diperbarui. Cadangan: TableView.tsx.bak-stdtable');