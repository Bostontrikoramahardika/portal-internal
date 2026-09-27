const fs = require('fs');
const path = require('path');

console.log('=======================================================');
console.log('🚀 STANDARISASI MASSAL BTM PORTAL (NAVY + LIGHT THEME)');
console.log('=======================================================\n');

function getFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== 'login') {
        getFiles(fullPath, fileList);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.jsx')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const appDir = path.join(process.cwd(), 'app');
const componentsDir = path.join(process.cwd(), 'components');
const allFiles = [...getFiles(appDir), ...getFiles(componentsDir)];

let updatedCount = 0;

const replacements = [
  // Version numbers
  { from: /v1\.6\.[0-9]/gi, to: 'V1.7.0' },
  { from: /v1\.6/gi, to: 'V1.7.0' },

  // Dark Page Backgrounds -> Clean Soft Gray Background #f4f7fa
  { from: /bg-\[#0b192c\]/g, to: 'bg-[#f4f7fa]' },
  { from: /bg-\[#020d1a\]/g, to: 'bg-[#f4f7fa]' },
  { from: /bg-\[#0a0f1d\]/g, to: 'bg-[#f4f7fa]' },
  { from: /bg-\[#08101d\]/g, to: 'bg-[#f4f7fa]' },
  { from: /bg-\[#050c18\]/g, to: 'bg-[#f4f7fa]' },
  { from: /bg-\[#030712\]/g, to: 'bg-[#f4f7fa]' },
  { from: /bg-\[#0f172a\]/g, to: 'bg-[#f4f7fa]' },
  { from: /bg-slate-950/g, to: 'bg-[#f4f7fa]' },
  { from: /bg-slate-900/g, to: 'bg-[#f4f7fa]' },

  // Dark Cards / Form Containers -> White Rounded Card with e2e8f0 border
  { from: /bg-\[#0d1f38\]/g, to: 'bg-white rounded-[14px] border border-[#e2e8f0] shadow-sm' },
  { from: /bg-\[#0d1b2a\]/g, to: 'bg-white rounded-[14px] border border-[#e2e8f0] shadow-sm' },
  { from: /bg-\[#112240\]/g, to: 'bg-white rounded-[14px] border border-[#e2e8f0] shadow-sm' },
  { from: /bg-\[#1e293b\]/g, to: 'bg-white rounded-[14px] border border-[#e2e8f0] shadow-sm' },
  { from: /bg-\[#182232\]/g, to: 'bg-white rounded-[14px] border border-[#e2e8f0] shadow-sm' },
  { from: /bg-slate-800\/80/g, to: 'bg-white rounded-[14px] border border-[#e2e8f0] shadow-sm' },
  { from: /bg-slate-800\/50/g, to: 'bg-slate-50 rounded-[14px] border border-[#e2e8f0]' },
  { from: /bg-slate-800/g, to: 'bg-white rounded-[14px] border border-[#e2e8f0] shadow-sm' },

  // Inputs on dark containers -> Clean Light Inputs
  { from: /bg-\[#081220\]/g, to: 'bg-[#f8fafc] text-[#1a2332] border border-[#cbd5e1]' },
  { from: /bg-\[#0a1628\]/g, to: 'bg-[#f8fafc] text-[#1a2332] border border-[#cbd5e1]' },

  // Primary Navy Header conversions
  { from: /bg-\[#0284c7\]/g, to: 'bg-[#003d79]' },
  { from: /bg-\[#002a57\]/g, to: 'bg-[#003d79]' },
  { from: /bg-blue-600/g, to: 'bg-[#003d79]' },
  { from: /bg-blue-700/g, to: 'bg-[#003d79]' },
  { from: /bg-sky-600/g, to: 'bg-[#003d79]' },

  // Yellow/Amber buttons -> Standard Corporate Navy Button
  { from: /bg-amber-500 text-black hover:bg-amber-400/g, to: 'bg-[#003d79] text-white hover:bg-[#002a57]' },
  { from: /bg-amber-500 text-slate-900/g, to: 'bg-[#003d79] text-white hover:bg-[#002a57]' },
  { from: /bg-amber-500/g, to: 'bg-[#003d79] text-white' },
  { from: /bg-amber-600/g, to: 'bg-[#002a57] text-white' },
  { from: /text-amber-500/g, to: 'text-[#003d79]' },
  { from: /text-amber-400/g, to: 'text-[#003d79]' },

  // Text color adjustments on converted backgrounds
  { from: /text-slate-100/g, to: 'text-[#1a2332]' },
  { from: /text-slate-200/g, to: 'text-[#1a2332]' },
  { from: /text-slate-300/g, to: 'text-[#5a6a7e]' },
  { from: /text-slate-400/g, to: 'text-[#5a6a7e]' },
  { from: /text-gray-200/g, to: 'text-[#1a2332]' },
  { from: /text-gray-300/g, to: 'text-[#5a6a7e]' },
  { from: /border-slate-700/g, to: 'border-[#e2e8f0]' },
  { from: /border-slate-800/g, to: 'border-[#e2e8f0]' },
  { from: /border-\[#1e293b\]/g, to: 'border-[#e2e8f0]' }
];

const footerSnippet = `
      {/* Standard App Footer */}
      <footer className="mt-8 mb-20 sm:mb-6 text-center text-xs text-[#8896a7] italic opacity-60">
        <p>BTM Mobile APP V1.7.0</p>
        <p className="text-[10px]">Powered By rck_Production</p>
      </footer>
`;

for (const filePath of allFiles) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Apply replacements
  for (const { from, to } of replacements) {
    content = content.replace(from, to);
  }

  // Inject footer in page.tsx if missing
  if (filePath.endsWith('page.tsx') && content.includes('export default')) {
    if (!content.includes('V1.7.0') && !content.includes('rck_Production') && !content.includes('AppFooter')) {
      const lastIndex = content.lastIndexOf('</div>');
      if (lastIndex !== -1) {
        content = content.slice(0, lastIndex) + footerSnippet + content.slice(lastIndex);
      }
    }
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    const relPath = path.relative(process.cwd(), filePath);
    console.log(`  ✅ Standardized: ${relPath}`);
    updatedCount++;
  }
}

console.log('\n=======================================================');
console.log(`✅ HASIL STANDARISASI: ${updatedCount} file berhasil diperbarui!`);
console.log('🎨 Seluruh halaman sekarang menggunakan Navy #003d79 & Light Theme');
console.log('=======================================================');
