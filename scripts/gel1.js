const fs=require('fs');const p='app/dashboard/views/TableView.tsx';
let r=fs.readFileSync(p,'utf8');const crlf=r.includes('\r\n');let s=r.replace(/\r\n/g,'\n');
if(s.includes('StatBanner')){console.log('Sudah terpasang.');process.exit(0);}
const imp=[...s.matchAll(/^import .*$/gm)].pop();
if(!imp){console.error('GAGAL: import tidak ketemu');process.exit(1);}
s=s.slice(0,imp.index+imp[0].length)+"\nimport StatBanner from '@/app/components/std/StatBanner'"+s.slice(imp.index+imp[0].length);
const a=s.indexOf('      {/* HEADER */}');
const t=s.indexOf('\u2795 Tambah');
if(a<0||t<0){console.error('GAGAL: blok header tidak ketemu');process.exit(1);}
const mm=/\n      <\/div>\n/.exec(s.slice(t));
if(!mm){console.error('GAGAL: penutup header tidak ketemu');process.exit(1);}
const b=t+mm.index+mm[0].length;
const baru=`      {/* HEADER - STD UI Kit (acuan Approval Center) */}
      <StatBanner
        eyebrow={String(table || 'DATA').replace(/_/g, ' ').toUpperCase()}
        title={title}
        subtitle={\\\`\\\${displayRows.length} dari \\\${rows.length} data\\\`}
        onRefresh={canCreate ? undefined : handleRefresh}
        refreshing={refreshing}
        right={
          canCreate ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                aria-label="Muat ulang"
                className="h-9 w-9 shrink-0 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 transition-all flex items-center justify-center disabled:opacity-50"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={refreshing ? 'animate-spin' : ''}>
                  <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
              </button>
              <button
                onClick={() => setFormModal({ mode: 'create' })}
                className="h-9 px-3 shrink-0 rounded-xl bg-white text-[#0b2a5b] font-black text-[11px] uppercase tracking-wide shadow hover:bg-blue-50 active:scale-95 transition-all whitespace-nowrap"
              >
                + Tambah
              </button>
            </div>
          ) : undefined
        }
      />
`;
s=s.slice(0,a)+baru+s.slice(b);
const ob=(s.match(/<div/g)||[]).length,cl=(s.match(/<\/div>/g)||[]).length,sc=(s.match(/<div[^>]*\/>/g)||[]).length;
if(ob-sc!==cl){console.error('GAGAL: div tidak seimbang ('+ob+','+sc+','+cl+') - file TIDAK diubah');process.exit(1);}
fs.writeFileSync(p+'.bak-gel1',r,'utf8');
fs.writeFileSync(p,crlf?s.replace(/\n/g,'\r\n'):s,'utf8');
console.log('OK - div seimbang. Cadangan: TableView.tsx.bak-gel1');