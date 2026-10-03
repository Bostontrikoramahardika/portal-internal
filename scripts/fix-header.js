const fs=require('fs');const p='app/dashboard/layout.tsx';
let r=fs.readFileSync(p,'utf8');const crlf=r.includes('\r\n');let s=r.replace(/\r\n/g,'\n');
if(s.includes('aria-label="Notifikasi"')){console.log('Sudah terpasang.');process.exit(0);}
const a=s.indexOf('{/* Kanan: User Info + Lonceng */}');
if(a<0){console.error('GAGAL: blok header tidak ketemu');process.exit(1);}
const b=s.indexOf('        </div>\n      </div>', a);
if(b<0){console.error('GAGAL: penutup header tidak ketemu');process.exit(1);}
const baru=`{/* Kanan: User Info + Lonceng */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="text-right leading-tight min-w-0">
              <div className="text-[11px] font-black text-[#003D79] uppercase truncate max-w-[150px]">
                {namaKaryawan}
              </div>
              <div className="text-[9px] font-bold text-slate-400 truncate max-w-[150px]">
                {nrpKaryawan}
                {siteKaryawan ? <span className="text-blue-600"> &middot; {siteKaryawan}</span> : null}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsNotifOpen(true)}
              aria-label="Notifikasi"
              className="relative w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-90 transition-all flex items-center justify-center shrink-0 border border-slate-200/80"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#003D79" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {notifCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 bg-red-600 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-white shadow pointer-events-none">
                  {notifCount > 99 ? '99+' : notifCount}
                </span>
              )}
            </button>
          </div>
`;
s=s.slice(0,a)+baru+s.slice(b);
fs.writeFileSync(p+'.bak-header',r,'utf8');
fs.writeFileSync(p,crlf?s.replace(/\n/g,'\r\n'):s,'utf8');
console.log('OK - header dirapikan. Cadangan: layout.tsx.bak-header');