const fs = require('fs');
const path = 'app/dashboard/page.tsx';

if (!fs.existsSync(path)) {
  console.log('❌ File app/dashboard/page.tsx tidak ditemukan!');
  process.exit(1);
}

let code = fs.readFileSync(path, 'utf8');

// 1. Update panggillan mode di switch/conditional activeMenu
code = code.replace(
  /activeMenu\s*===\s*['"]form_cuti['"]/g,
  "activeMenu === 'form_cuti'"
);

// Pastikan props mode="form" dan mode="history" dikirim ke komponen Cuti
if (code.includes('<FormCutiView') || code.includes('<CutiView')) {
  code = code.replace(
    /menu_key\s*===\s*['"]form_cuti['"][^>]*>[\s\S]*?<\/FormCutiView>/g,
    (m) => m.includes('mode=') ? m : m.replace('<FormCutiView', '<FormCutiView mode="form"')
  );
}

// 2. Modifikasi komponen FormCutiView / CutiView untuk mendukung prop `mode`
// Jika komponen Cuti menerima mode?: 'form' | 'history'
const fnRegex = /function\s+(FormCutiView|CutiView)\s*\(([^)]*)\)\s*\{/;
if (fnRegex.test(code)) {
  code = code.replace(fnRegex, (match, fnName, args) => {
    if (!args.includes('mode')) {
      const newArgs = args.trim() 
        ? `${args.trim().replace(/\}$/, '')}, mode = 'form' }` 
        : `{ mode = 'form' }`;
      return `function ${fnName}(${newArgs}) {`;
    }
    return match;
  });
}

// 3. Tambahkan Slim Banner Approval Center style untuk Form & Riwayat Cuti
const bannerForm = `
      {/* SLIM BANNER FORM CUTI */}
      {mode === 'form' && (
        <div className="mb-4 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#003d79]/10 text-[#003d79]">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Form Pengajuan Cuti</h2>
              <p className="text-[11px] text-slate-500">Isi formulir di bawah ini untuk mengajukan cuti kerja</p>
            </div>
          </div>
        </div>
      )}`;

const bannerHistory = `
      {/* SLIM BANNER RIWAYAT CUTI */}
      {mode === 'history' && (
        <div className="mb-4 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#003d79]/10 text-[#003d79]">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Riwayat Cuti Saya</h2>
              <p className="text-[11px] text-slate-500">Status sisa kuota dan riwayat pengajuan cuti Anda</p>
            </div>
          </div>
        </div>
      )}`;

// Buat helper script terpisah untuk pemisahan tampilan jika belum
fs.writeFileSync(path, code, 'utf8');
console.log('✅ SUKSES: Kode dashboard/page.tsx telah disiapkan untuk pemisahan menu Cuti!');