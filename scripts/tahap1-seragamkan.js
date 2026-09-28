const fs = require('fs');
const path = require('path');

const dashboardDir = path.join(__dirname, '..', 'app', 'dashboard');
const componentsDir = path.join(__dirname, '..', 'app', 'components');

// 1. BUAT KOMPONEN SLIM BANNER (Gaya Approval Center Ramping)
const slimBannerPath = path.join(componentsDir, 'SlimBanner.tsx');
const slimBannerLines = [
  "import React from 'react';",
  "",
  "interface SlimBannerProps {",
  "  title: string;",
  "  subtitle?: string;",
  "  icon?: React.ReactNode;",
  "  color?: string;",
  "}",
  "",
  "export default function SlimBanner({ title, subtitle, icon, color = 'bg-[#003d79]' }: SlimBannerProps) {",
  "  return (",
  "    <div className={color + ' text-white px-4 py-3 mx-4 mt-3 mb-3 rounded-xl shadow-sm flex items-center justify-between'}>",
  "      <div className='flex items-center gap-2.5'>",
  "        {icon && <div className='text-lg flex-shrink-0'>{icon}</div>}",
  "        <div className='flex flex-col'>",
  "          <h2 className='font-bold text-sm tracking-wide leading-tight'>{title}</h2>",
  "          {subtitle && <p className='text-[11px] text-blue-100/90 leading-tight mt-0.5'>{subtitle}</p>}",
  "        </div>",
  "      </div>",
  "    </div>",
  "  );",
  "}"
];

if (!fs.existsSync(componentsDir)) fs.mkdirSync(componentsDir, { recursive: true });
fs.writeFileSync(slimBannerPath, slimBannerLines.join('\n'), 'utf8');
console.log('✅ [1/3] Komponen SlimBanner.tsx berhasil dibuat!');

// 2. SERAGAMKAN HEADER UTAMA DI LAYOUT.TSX
const layoutPath = path.join(dashboardDir, 'layout.tsx');
if (fs.existsSync(layoutPath)) {
  let layoutContent = fs.readFileSync(layoutPath, 'utf8');
  
  // Deteksi tag header mobile
  const headerRegex = /<header\s+className=["'{][^>]*md:hidden[^>]*>[\s\S]*?<\/header>/;
  let match = layoutContent.match(headerRegex);
  
  if (match) {
    let oldHeader = match[0];
    let nameVar = "{user?.name || user?.firstName || 'User'}";
    if (oldHeader.includes('firstName')) nameVar = "{user?.firstName || 'User'}";
    else if (oldHeader.includes('name')) nameVar = "{user?.name || 'User'}";
    
    let nrpVar = "{user?.nrp || 'BTM Portal'}";

    let newHeader = [
      '<header className="md:hidden sticky top-0 z-[60] bg-[#003d79] border-b border-[#002a57] text-white h-12 flex items-center justify-between px-3.5 shadow-md">',
      '  <div className="flex items-center gap-2.5">',
      '    <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center font-black text-[#003d79] text-base shadow-sm">',
      '      B',
      '    </div>',
      '    <span className="font-bold text-sm tracking-wide text-white">BOSTON</span>',
      '  </div>',
      '  <div className="flex items-center gap-3">',
      '    <NotificationBell />',
      '    <div className="flex flex-col items-end leading-none">',
      '      <span className="text-xs font-bold text-white">' + nameVar + '</span>',
      '      <span className="text-[9px] text-blue-200 mt-0.5">' + nrpVar + '</span>',
      '    </div>',
      '  </div>',
      '</header>'
    ].join('\n');

    layoutContent = layoutContent.replace(headerRegex, newHeader);
    
    if (!layoutContent.includes('NotificationBell') && fs.existsSync(path.join(dashboardDir, 'components', 'NotificationBell.tsx'))) {
      layoutContent = "import NotificationBell from '@/app/dashboard/components/NotificationBell';\n" + layoutContent;
    }

    fs.writeFileSync(layoutPath, layoutContent, 'utf8');
    console.log('✅ [2/3] Header biru di layout.tsx berhasil diseragamkan (Logo Boston + Nama/NRP)!');
  } else {
    console.log('⚠️ [2/3] Header mobile di layout.tsx tidak ditemukan atau sudah disesuaikan.');
  }
}

// 3. SAPU BERSIH PAGEHEADER GANDA DI DASHBOARD
let removedCount = 0;
function walkDir(dir) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      walkDir(dirPath);
    } else if (f.endsWith('.tsx') || f.endsWith('.jsx')) {
      let content = fs.readFileSync(dirPath, 'utf8');
      if (content.includes('PageHeader')) {
        content = content.replace(/import\s+PageHeader\s+from\s+['"][^'"]+['"];?\s*/g, '');
        content = content.replace(/<PageHeader[^>]*\/>/g, '');
        content = content.replace(/<PageHeader[^>]*>[\s\S]*?<\/PageHeader>/g, '');
        fs.writeFileSync(dirPath, content, 'utf8');
        removedCount++;
      }
    }
  });
}
walkDir(dashboardDir);
console.log('✅ [3/3] Sapu bersih selesai! Header ganda dihapus dari ' + removedCount + ' file.');

console.log('\n🎉 EKSEKUSI TAHAP 1 SELESAI!');