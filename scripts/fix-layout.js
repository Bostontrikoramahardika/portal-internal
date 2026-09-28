const fs = require('fs');
const path = require('path');

const layoutPath = path.join(__dirname, '..', 'app', 'dashboard', 'layout.tsx');

if (fs.existsSync(layoutPath)) {
  let content = fs.readFileSync(layoutPath, 'utf8');

  // 1. Bersihkan dulusemua import NotificationBell & 'use client'
  content = content.replace(/import\s+NotificationBell\s+from\s+['"][^'"]+['"];?\s*/g, '');
  content = content.replace(/['"]use client['"];?\s*/g, '');

  // 2. Tempatkan 'use client' di baris 1, diikuti import NotificationBell
  const topDirectives = "'use client'\n\nimport NotificationBell from '@/app/dashboard/components/NotificationBell'\n";
  content = topDirectives + content.trim();

  // 3. Ganti header mobile
  const startTag = '<header className="sticky top-0 z-30 bg-[#003d79]';
  const endTag = '</header>';
  const startIndex = content.indexOf(startTag);
  const endIndex = content.indexOf(endTag, startIndex);

  if (startIndex !== -1 && endIndex !== -1) {
    const newHeader = `<header className="sticky top-0 z-30 bg-[#003d79] text-white border-b border-[#002a57] shadow-xs sm:hidden">
        <div className="flex items-center justify-between h-12 px-3.5">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center font-black text-sm text-[#003d79] shadow-xs">
              B
            </div>
            <span className="font-black tracking-tight text-xs text-white uppercase">
              BTM APP Mobile
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="flex flex-col items-end leading-none">
              <span className="text-[12px] font-bold text-white">{firstName}</span>
              <span className="text-[9px] text-blue-200 mt-0.5">{user?.nrp || 'BTM Portal'}</span>
            </div>
          </div>
        </div>
      </header>`;

    content = content.slice(0, startIndex) + newHeader + content.slice(endIndex + endTag.length);
  }

  fs.writeFileSync(layoutPath, content, 'utf8');
  console.log('✅ [SUCCESS] layout.tsx berhasil diperbaiki: "use client" kembali ke baris 1 & Header "BTM APP Mobile" dipasang!');
}
