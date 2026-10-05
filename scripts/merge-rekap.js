const fs=require('fs');const p='app/dashboard/manajemen-absensi/page.tsx';
const r=fs.readFileSync(p,'utf8');const crlf=r.includes('\r\n');let s=r.replace(/\r\n/g,'\n');
if(s.includes('tabUtama')){console.log('Sudah terpasang.');process.exit(0);}
const im=[...s.matchAll(/^import [\s\S]*?from ['"][^'"]+['"];?\s*$/gm)];
if(!im.length){console.error('GAGAL: import tidak ketemu');process.exit(1);}
const last=im[im.length-1];
s=s.slice(0,last.index+last[0].length)+"\nimport KirimRekapPanel from '@/app/dashboard/kirim-rekap/page'"+s.slice(last.index+last[0].length);

const st="  const [exporting, setExporting] = useState<'matrix' | 'detail' | null>(null)";
if(!s.includes(st)){console.error('GAGAL: state exporting tidak ketemu');process.exit(1);}
s=s.replace(st, st+"\n  const [tabUtama, setTabUtama] = useState<'matriks' | 'kirim'>('matriks')");

const a='  const totalKaryawan = groups.reduce((acc, g) => acc + g.rows.length, 0)\n\n  return (';
if(!s.includes(a)){console.error('GAGAL: totalKaryawan tidak ketemu');process.exit(1);}
const b=`  const totalKaryawan = groups.reduce((acc, g) => acc + g.rows.length, 0)

  const BilahTab = () => (
    <div className="flex gap-1.5 p-1 mb-3 rounded-2xl bg-slate-100 border border-slate-200">
      {([['matriks', 'Matriks Absensi'], ['kirim', 'Kirim Rekap']] as const).map(([id, l]) => (
        <button key={id} type="button" onClick={() => setTabUtama(id)}
          className={'flex-1 px-3 py-2 rounded-xl text-[12px] font-black uppercase tracking-wide transition-all active:scale-95 ' +
            (tabUtama === id ? 'bg-[#003d79] text-white shadow' : 'text-slate-500')}>
          {l}
        </button>
      ))}
    </div>
  )

  if (tabUtama === 'kirim') {
    return (
      <div className="text-slate-800">
        <BilahTab />
        <KirimRekapPanel />
      </div>
    )
  }

  return (`;
s=s.replace(a,b);
const a2='    <div className="bg-[#f4f7fa] pb-24 text-slate-800">\n';
if(!s.includes(a2)){console.error('GAGAL: pembungkus tidak ketemu');process.exit(1);}
s=s.replace(a2, a2+'      <BilahTab />\n');
fs.writeFileSync(p+'.bak-merge',r,'utf8');
fs.writeFileSync(p,crlf?s.replace(/\n/g,'\r\n'):s,'utf8');
console.log('OK - Manajemen Absensi bertab');