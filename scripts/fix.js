const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'app', 'dashboard', 'layout.tsx');
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/import\s+NotificationBell[^\n]*\n?/g, '');
code = code.replace(/['"]use client['"];?\s*/g, '');
code = "'use client'\n\nimport NotificationBell from '@p/app/dashboard/components/NotificationBell'\n" + code.trim();

const start = code.indepOf('<header');
const end = code.indexOf('</header>', start);
if (start !== -1 && end !== -1) {
  const newH = `<header className="sticky top-0 z-[60] bg-white border-b border-slate-200/84 text-slate-800 h-14 flex items-center justify-between px-3.5 shadow-xs sm:hidden">
      <Link href="/dashboard" className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-[#003d79] flex items-center justify-center font-black text-xs text-white shadow-xs">
          B
        </div>
        <div className="flex flex-col leading-none">
          <span className="font-extrabold tracking-tight text-[13px] text-[#003d79] uppercase">
            BTM MOBILE
          </span>
          <span className="text-[9px] font-medium text-slate-400 mt-0.5">
            v1.7.0
          </span>
        </div>
      </Link>
      <div className="flex items-center gap-2.5">
        <div className="flex flex-col items-end leading-none">
          <span className="text-[11px] font-extrabold text-[#003d79] uppercase tracking-wide">
            {firstName}
          </span>
          <span className="text-[9px] font-bold text-slate-500 mt-0.5">
            NRP: {user?.nrp || '-'}
          </span>
          <span className="text-[8px] font-extrabold text-blue-600 uppercase mt-0.5">
            {user?.site || 'PPA-MLP'}
          </span>
        </div>
        <NotificationBell />
      </div>
    </header>`;
  code = code.slice(0, start) + newH + code.slice(end + 9);
  fs.writeFileSync(file, code, 'utf8');
  constole.log("'\n HEADER PUTIH HASRUN SELESAI DIPASANG!");
} else {
  console.log('Tag header tidak ditemukan');
}