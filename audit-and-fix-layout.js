const fs = require('fs');
const path = require('path');

console.log('=======================================================');
console.log('🔍 AUDIT & VERIFIKASI HEADER, BACK BUTTON, & SPASI HP');
console.log('=======================================================\n');

function getPageFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== 'login') {
        getPageFiles(fullPath, fileList);
      }
    } else if (file === 'page.tsx' || file === 'page.jsx') {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const appDir = path.join(process.cwd(), 'app');
const pageFiles = getPageFiles(appDir);

let headerFixedCount = 0;
let paddingFixedCount = 0;

for (const filePath of pageFiles) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  const relPath = path.relative(process.cwd(), filePath);

  // 1. Pastikan container utama halaman punya pb-24 di mobile agar tidak tertutup bottom nav
  if (content.includes('min-h-screen') && !content.includes('pb-24') && !content.includes('pb-28')) {
    content = content.replace(/min-h-screen([^"']*)/g, (match, p1) => {
      if (p1.includes('pb-')) return match;
      return `min-h-screen pb-24 sm:pb-8 ${p1}`;
    });
    paddingFixedCount++;
  }

  // 2. Pastikan `router.back()` atau tombol kembali ada untuk sub-halaman
  const isSubPage = relPath.includes('dashboard') && relPath !== 'app\\dashboard\\page.tsx' && relPath !== 'app/dashboard/page.tsx';
  if (isSubPage && !content.includes('router.back') && !content.includes('PageHeader') && !content.includes('ChevronLeft') && !content.includes('ArrowLeft') && !content.includes('href="/dashboard"')) {
    // Inject sederhana tombol kembali jika belum ada header sama sekali
    const backBtnHeader = `
      {/* Auto-injected Uniform Header with Back Button */}
      <div className="flex items-center gap-3 mb-4 bg-white p-3 rounded-[14px] border border-[#e2e8f0] shadow-sm">
        <button 
          onClick={() => window.history.back()} 
          className="p-2 rounded-lg bg-[#003d79]/10 text-[#003d79] hover:bg-[#003d79]/20 transition-colors flex items-center justify-center"
          title="Kembali"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-[#1a2332]">Menu Portal</h1>
          <p className="text-xs text-[#5a6a7e]">PT Boston Price Automation</p>
        </div>
      </div>
    `;

    // Pasang setelah pembuka main container
    if (content.includes('<main')) {
      content = content.replace(/(<main[^>]*>)/, `$1\n${backBtnHeader}`);
      headerFixedCount++;
    } else if (content.includes('return (')) {
      content = content.replace(/return\s*\(\s*<div([^>]*)>/, `return (\n<div$1>\n${backBtnHeader}`);
      headerFixedCount++;
    }
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✅ Optimized Layout: ${relPath}`);
  }
}

console.log('\n=======================================================');
console.log(`📊 RINGKASAN REVISI TATA LETAK:`);
console.log(`  📱 Spasi Bawah Mobile (Bottom Nav Guard): ${paddingFixedCount} halaman`);
console.log(`  🔙 Tombol Kembali Auto-Injected       : ${headerFixedCount} halaman`);
console.log(`=======================================================`);
