const fs=require('fs');const p='app/dashboard/views/TableView.tsx';
const r=fs.readFileSync(p,'utf8');const crlf=r.includes('\r\n');let s=r.replace(/\r\n/g,'\n');
if(s.includes('sticky right-0')){console.log('Sudah terpasang.');process.exit(0);}
const reps=[
 ['<th className="px-2.5 py-1.5 lg:px-4 lg:py-2 font-black uppercase tracking-wider text-center whitespace-nowrap text-[10px] lg:text-[11px]">\n                Aksi',
  '<th className="px-2.5 py-1.5 lg:px-4 lg:py-2 font-black uppercase tracking-wider text-center whitespace-nowrap text-[10px] lg:text-[11px] sticky right-0 z-40 bg-[#003D79] shadow-[-2px_0_4px_rgba(0,0,0,0.18)]">\n                Aksi'],
 ['<th className="px-1.5 py-1"></th>',
  '<th className="px-1.5 py-1 sticky right-0 z-40 bg-blue-50 shadow-[-2px_0_4px_rgba(0,0,0,0.12)]"></th>'],
 ['<td className="px-2.5 py-1.5 lg:px-4 lg:py-2 whitespace-nowrap">',
  '<td className={\'px-2.5 py-1.5 lg:px-4 lg:py-2 whitespace-nowrap sticky right-0 z-10 shadow-[-2px_0_4px_rgba(0,0,0,0.06)] \' + (i % 2 === 0 ? \'bg-white\' : \'bg-slate-50\')}>']
];
let n=0;for(const [x,y] of reps){if(s.includes(x)){s=s.replace(x,y);n++;}}
if(n<3){console.error('GAGAL: hanya '+n+'/3 pola ketemu - file TIDAK diubah');process.exit(1);}
const o=(s.match(/<div/g)||[]).length,c=(s.match(/<\/div>/g)||[]).length,sc=(s.match(/<div[^>]*\/>/g)||[]).length;
if(o-sc!==c){console.error('GAGAL: div tidak seimbang - file TIDAK diubah');process.exit(1);}
fs.writeFileSync(p+'.bak-aksi',r,'utf8');
fs.writeFileSync(p,crlf?s.replace(/\n/g,'\r\n'):s,'utf8');
console.log('OK - kolom Aksi dipaku ke kanan (3/3). Cadangan: TableView.tsx.bak-aksi');