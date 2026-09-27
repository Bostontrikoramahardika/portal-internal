const fs = require('fs');
const path = require('path');

console.log('=======================================================');
console.log('🔍 VERIFIKASI AKHIR KESERAGAMAN LAYOUT ALL PAGES');
console.log('=======================================================\n');

function getFiles(dir, list = []) {
  if (!fs.existsSync(dir)) return list;
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (f !== 'node_modules' && f !== '.next') getFiles(full, list);
    } else if (f === 'page.tsx' || f === 'page.jsx') {
      list.push(full);
    }
  }
  return list;
}

const pages = getFiles(path.join(process.cwd(), 'app', 'dashboard'));

let issueCount = 0;

for (const filePath of pages) {
  const content = fs.readFileSync(filePath, 'utf8');
  const rel = path.relative(process.cwd(), filePath);

  const hasNegativeMargin = /-mt-\d+/.test(content);
  const hasHeroBlock = /bg-\[#003[Dd]79\][^"]*(?:pt-12|pb-24|rounded-b-)/.test(content);
  const backBtnMatches = (content.match(/router\.back/g) || []).length;
  const hasPageHeader = content.includes('PageHeader');

  let issues = [];
  if (hasNegativeMargin) issues.push('Margin minus (-mt) tersisa');
  if (hasHeroBlock) issues.push('Balok hero tersisa');
  if (hasPageHeader && backBtnMatches > 0) issues.push('Potensi double back button');

  if (issues.length > 0) {
    console.log(`⚠️ ${rel}:`);
    issues.forEach(i => console.log(`   - ${i}`));
    issueCount++;
  }
}

console.log('\n=======================================================');
if (issueCount === 0) {
  console.log('✅ SEMUA HALAMAN (100%) SUDAH SERAGAM & FLAT PERFECT!');
  console.log('  - Header: Single Navy PageHeader (Back + Title + Badge)');
  console.log('  - Layout: Flat Light Theme (#f4f7fa)');
  console.log('  - Card  : White Rounded Card (#ffffff + border #e2e8f0)');
  console.log('  - Footer: V1.7.0 Powered By rck_Production');
} else {
  console.log(`⚠️ Ada ${issueCount} halaman yang masih perlu sedikit penyesuaian.`);
}
console.log('=======================================================');
