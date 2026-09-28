const fs = require('fs');
const path = 'app/dashboard/layout.tsx';
let code = fs.readFileSync(path, 'utf8');

const newHeader = `      {/* HEADER MOBILE — COMPACT + ROUNDED */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-[60] px-2.5 pt-1.5">
        <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,61,121,0.08)] rounded-2xl px-3 py-1.5 flex items-center justify-between">
          {/* Kiri: Logo + App Name */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-xl bg-[#003D79] flex items-center justify-center shadow-sm overflow-hidden">
              <Image src="/btm-fix.png" alt="BTM" width={18} height={18} className="object-contain" />
            </div>
            <div className="leading-none">
              <h1 className="text-[11px] font-black uppercase text-[#003D79] tracking-tight">BTM Mobile</h1>
              <p className="text-[8px] font-bold text-slate-400 mt-0.5">v1.6.2</p>
            </div>
          </div>

          {/* Kanan: User Info + Lonceng */}
          <div className="flex items-center gap-2">
            <div className="text-right leading-none shrink-0 max-w-[130px]">
              <div className="text-[10px] font-black text-[#003D79] uppercase truncate">{namaKaryawan}</div>
              <div className="text-[8px] text-slate-500 font-bold mt-0.5">NRP: {nrpKaryawan}</div>
              <div className="text-[8px] text-blue-600 font-black mt-0.5">{siteKaryawan}</div>
            </div>
            <button
              type="button"
              onClick={() => setIsNotifOpen(true)}
              className="relative w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-90 transition-all flex items-center justify-center shrink-0 border border-slate-200/80"
            >
              <span className="text-base leading-none">🔔</span>
              {notifCount > 0 && (
                <>
                  <span className="absolute -top-0.5 -right-0.5 animate-ping h-3 w-3 rounded-full bg-red-400 opacity-75"></span>
                  <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-[7px] font-black h-3.5 w-3.5 flex items-center justify-center rounded-full border border-white shadow-md pointer-events-none">
                    {notifCount > 9 ? '9+' : notifCount}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>`;

const headerRegex = /\{\/\* HEADER MOBILE \*\/\}[\s\S]*?<\/button>\s*<\/div>\s*<\/div>/;

if (headerRegex.test(code)) {
  code = code.replace(headerRegex, newHeader.trim());
  console.log('✅ HEADER MOBILE BERHASIL DIUPDATE!');
} else {
  const fbRegex = /<div className="lg:hidden fixed top-0 left-0 right-0 z-\[60\][\s\S]*?<\/button>\s*<\/div>\s*<\/div>/;
  if (fbRegex.test(code)) {
    code = code.replace(fbRegex, newHeader.trim());
    console.log('✅ HEADER MOBILE BERHASIL DIUPDATE (FALLBACK)!');
  } else {
    console.log('❌ Header pattern tidak ditemukan');
  }
}

code = code.replace('pt-12 lg:pt-0', 'pt-[3.75rem] lg:pt-0');

fs.writeFileSync(path, code, 'utf8');
console.log('🚀 SUKSES MEMPERBARUI HEADER LAYOUT!');