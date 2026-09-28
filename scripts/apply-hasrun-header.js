const fs = require('fs');
const path = require('path');

const layoutPath = path.join(__dirname, '..', 'app', 'dashboard', 'layout.tsx');

if (fs.existsSync(layoutPath)) {
  let content = fs.readFileSync(layoutPath, 'utf8');

  // 1. Pastikan 'use client' & NotificationBell berada di posisi yang benar
  content = content.replace(/import\s+NotificationBell\s+from\s+['"][^'"]+['"];?\s*/g, '');
  content = content.replace(/['"]use client['"];?\s*/g, '');

  const topDirectives = "'use client'\n\nimport NotificationBell from '@/app/dashboard/components/NotificationBell'\n";
  content = topDirectives + content.trim();

  // 2. Ganti header mobile ke versi HASRUN (Putih, BTM MOBILE, v1.7.0, Nama, NRP, Site, Lonceng)
  const startIndex = content.indexOf('<header className=');
  const endIndex = content.indexOf('</header>', startIndex);

  if (startIndex !== -1 && endIndex !== -1) {
    const newHeader = `<header className="sticky top-0 z-[60] bg-white border-b border-slate-200/80 text-slate-800 h-14 flex items-center justify-between px-3.5 shadow-xs sm:hidden">
        {/* KIRI: Logo B + BTM MOBILE + v1.7.0 */}
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

        {/* KANAN: NAMA + NRP + SITE + LONCENG */}
        <div className="flex items-center gap-2.5">
          <div className="flex flex-col items-end leading-none">
            <span className="text-[12px] font-extrabold text-[#003d79] uppercase tracking-wide">
              {firstName}
            </span>
            <span className="text-[9px] font-semibold text-slate-400 mt-0.5">
              NRP: {user?.nrp || '-'}
            </span>
            <span className="text-[8px] font-bold text-blue-600 uppercase mt-0.5">
              {user?.site || 'SITE MINING'}
            </span>
          </div>
          <NotificationBell />
        </div>
      </header>`;

    content = content.slice(0, startIndex) + newHeader + content.slice(endIndex + 9);
  }

  fs.writeFileSync(layoutPath, content, 'utf8');
  console.log('✅ [EXACT HASRUN HEADER] layout.tsx berhasil diubah 100% PERSIS screenshot HASRUN!');
}
