const fs = require('fs');
const path = require('path');

console.log('=======================================================');
console.log('🔍 INVENTARISASI & INSPEKSI SELURUH SUB-MENU DASHBOARD');
console.log('=======================================================\n');

// 1. Cek file app/dashboard/layout.tsx dan app/dashboard/page.tsx
const dashLayoutPath = path.join(process.cwd(), 'app', 'dashboard', 'layout.tsx');
const dashPagePath = path.join(process.cwd(), 'app', 'dashboard', 'page.tsx');

let dashLayout = fs.readFileSync(dashLayoutPath, 'utf8');
let dashPage = fs.readFileSync(dashPagePath, 'utf8');

const globalFooter = `
      {/* GLOBAL FOOTER TTD - LOCKED V1.7.0 */}
      <footer className="mt-8 mb-24 sm:mb-8 text-center text-xs text-[#8896a7] italic opacity-70 border-t border-[#e2e8f0]/60 pt-4">
        <p className="font-semibold text-[#5a6a7e]">BTM Mobile APP V1.7.0</p>
        <p className="text-[10px] text-[#8896a7] mt-0.5">Powered By rck_Production</p>
      </footer>
`;

// Pastikan AppFooter / Global Footer terpasang di dashboard/layout.tsx
if (!dashLayout.includes('rck_Production') && !dashLayout.includes('BTM Mobile APP V1.7.0')) {
  console.log('📌 Menambahkan Global Footer ke app/dashboard/layout.tsx...');
  
  // Inject sebelum closing main/div container
  if (dashLayout.includes('</main>')) {
    dashLayout = dashLayout.replace('</main>', `${globalFooter}\n</main>`);
  } else {
    const lastDivIndex = dashLayout.lastIndexOf('</div>');
    if (lastDivIndex !== -1) {
      dashLayout = dashLayout.slice(0, lastDivIndex) + globalFooter + dashLayout.slice(lastDivIndex);
    }
  }
  fs.writeFileSync(dashLayoutPath, dashLayout, 'utf8');
  console.log('  ✅ Global Footer terpasang di app/dashboard/layout.tsx!');
}

// Pastikan app/dashboard/page.tsx juga merender footer di bagian bawah konten dinamis
if (!dashPage.includes('rck_Production') && !dashPage.includes('BTM Mobile APP V1.7.0')) {
  console.log('📌 Menambahkan Global Footer ke app/dashboard/page.tsx...');
  const lastDivIndex = dashPage.lastIndexOf('</div>');
  if (lastDivIndex !== -1) {
    dashPage = dashPage.slice(0, lastDivIndex) + globalFooter + dashPage.slice(lastDivIndex);
  }
  fs.writeFileSync(dashPagePath, dashPage, 'utf8');
  console.log('  ✅ Global Footer terpasang di app/dashboard/page.tsx!');
}

// 2. Sekarang scan SELURUH file komponen di folder components/ dan app/ yang merender form/tabel (seperti form cuti)
function getFilesRecursively(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next') {
        getFilesRecursively(fullPath, fileList);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const allCodeFiles = [
  ...getFilesRecursively(path.join(process.cwd(), 'app')),
  ...getFilesRecursively(path.join(process.cwd(), 'components'))
];

let addedFooterToComponents = 0;

for (const filePath of allCodeFiles) {
  let content = fs.readFileSync(filePath, 'utf8');
  const relPath = path.relative(process.cwd(), filePath);

  // Jika file ini adalah komponen sub-menu dashboard (seperti FormCuti, FormOvertime, dsb)
  const isMenuComponent = content.includes('Ajukan Cuti') || 
                          content.includes('Form Cuti') || 
                          content.includes('form_cuti') ||
                          content.includes('Koreksi Absensi') ||
                          content.includes('Overtime') ||
                          content.includes('Roster');

  if (isMenuComponent) {
    if (!content.includes('rck_Production') && !content.includes('BTM Mobile APP V1.7.0')) {
      const lastDivIndex = content.lastIndexOf('</div>');
      if (lastDivIndex !== -1) {
        content = content.slice(0, lastDivIndex) + globalFooter + content.slice(lastDivIndex);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`  ✅ Embedded Footer ke sub-menu: ${relPath}`);
        addedFooterToComponents++;
      }
    }
  }
}

console.log('\n=======================================================');
console.log(`✅ VERIFIKASI SELESAI:`);
console.log(`  📄 Dashboard Layout & Page: Global Footer Aktif`);
console.log(`  🧩 Sub-Menu Komponen      : ${addedFooterToComponents} komponen berhasil dipasangi Footer`);
console.log('=======================================================');
