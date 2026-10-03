const fs=require('fs');const p='app/dashboard/views/TableView.tsx';
const r=fs.readFileSync(p,'utf8');const crlf=r.includes('\r\n');let s=r.replace(/\r\n/g,'\n');
if(s.includes('KOLOM_RAHASIA')){console.log('Sudah terpasang.');process.exit(0);}
const a="  const isApproval = access_mode?.includes('APPROVAL')";
if(!s.includes(a)){console.error('GAGAL: jangkar isApproval tidak ketemu');process.exit(1);}
const b=a+`

  // ---- RESPONSIF: kolom menyesuaikan lebar layar ----
  const KOLOM_RAHASIA = [
    'google_refresh_token', 'google_access_token', 'last_signature',
    'google_connected_at', 'google_access_enabled', 'password', 'password_hash',
  ]
  const KOLOM_RINGKAS = 4
  const [layarSempit, setLayarSempit] = useState(false)
  const [semuaKolom, setSemuaKolom] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const ubah = () => setLayarSempit(mq.matches)
    ubah()
    mq.addEventListener('change', ubah)
    return () => mq.removeEventListener('change', ubah)
  }, [])

  const kolomBersih = (columns || []).filter((c) => !KOLOM_RAHASIA.includes(c))
  const kolomTampil =
    layarSempit && !semuaKolom ? kolomBersih.slice(0, KOLOM_RINGKAS) : kolomBersih
  const kolomTersembunyi = kolomBersih.length - kolomTampil.length`;
s=s.replace(a,b);
s=s.split('{columns.map((c: string, ci: number) => (').join('{kolomTampil.map((c: string, ci: number) => (');
s=s.split('colSpan={columns.length + 1}').join('colSpan={kolomTampil.length + 1}');
const lama='        <div className="lg:hidden flex items-center gap-1 px-3 pt-2 pb-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">\n          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">\n            <polyline points="13 17 18 12 13 7" /><polyline points="6 17 11 12 6 7" />\n          </svg>\n          Geser untuk kolom lain\n        </div>\n';
const baru='        <div className="lg:hidden flex items-center justify-between gap-2 px-3 pt-2 pb-1">\n          <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">\n            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">\n              <polyline points="13 17 18 12 13 7" /><polyline points="6 17 11 12 6 7" />\n            </svg>\n            Geser untuk kolom lain\n          </span>\n          {(kolomTersembunyi > 0 || semuaKolom) && (\n            <button\n              type="button"\n              onClick={() => setSemuaKolom(v => !v)}\n              className="shrink-0 px-2 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[9px] font-black uppercase tracking-wider text-[#0b2a5b] active:scale-95"\n            >\n              {semuaKolom ? \'Ringkas\' : \'+\' + kolomTersembunyi + \' kolom\'}\n            </button>\n          )}\n        </div>\n';
if(!s.includes(lama)){console.error('GAGAL: penanda geser tidak ketemu');process.exit(1);}
s=s.replace(lama,baru);
if(!/import \{[^}]*useEffect[^}]*\} from 'react'/.test(s)){console.error('GAGAL: useEffect belum diimpor');process.exit(1);}
const o=(s.match(/<div/g)||[]).length,c=(s.match(/<\/div>/g)||[]).length,x=(s.match(/<div[^>]*\/>/g)||[]).length;
if(o-x!==c){console.error('GAGAL: div tidak seimbang');process.exit(1);}
fs.writeFileSync(p+'.bak-resp',r,'utf8');
fs.writeFileSync(p,crlf?s.replace(/\n/g,'\r\n'):s,'utf8');
console.log('OK - tabel responsif + kolom kredensial disembunyikan');