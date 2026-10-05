const fs=require('fs');const p='app/dashboard/manajemen-absensi/page.tsx';
const r=fs.readFileSync(p,'utf8');const crlf=r.includes('\r\n');let s=r.replace(/\r\n/g,'\n');
if(s.includes("'lembur'")){console.log('Sudah terpasang.');process.exit(0);}
const g=[];function sub(a,b,l){if(!s.includes(a)){g.push(l);return;}s=s.replace(a,b);}

const im=[...s.matchAll(/^import [\s\S]*?from ['"][^'"]+['"];?\s*$/gm)];
if(!im.length){console.error('GAGAL: import');process.exit(1);}
const last=im[im.length-1];
s=s.slice(0,last.index+last[0].length)+"\nimport LemburPanel from './LemburPanel'"+s.slice(last.index+last[0].length);

sub("const [tabUtama, setTabUtama] = useState<'matriks' | 'kirim'>('matriks')",
    "const [tabUtama, setTabUtama] = useState<'matriks' | 'lembur' | 'kirim'>('matriks')",'state tab');

sub("{([['matriks', 'Matriks Absensi'], ['kirim', 'Kirim Rekap']] as const).map(([id, l]) => (",
    "{([['matriks', 'Matriks'], ['lembur', 'Lembur'], ['kirim', 'Kirim Rekap']] as const).map(([id, l]) => (",'bilah tab');

sub("  if (tabUtama === 'kirim') {",
`  if (tabUtama === 'lembur') {
    return (
      <div className="text-slate-800">
        <BilahTab />
        <LemburPanel />
      </div>
    )
  }

  if (tabUtama === 'kirim') {`,'cabang lembur');

if(g.length){console.error('GAGAL:');g.forEach(x=>console.error('  - '+x));process.exit(1);}
fs.writeFileSync(p+'.bak-lembur',r,'utf8');
fs.writeFileSync(p,crlf?s.replace(/\n/g,'\r\n'):s,'utf8');
console.log('OK - tab Lembur terpasang');