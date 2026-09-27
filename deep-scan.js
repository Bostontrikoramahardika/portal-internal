const fs = require('fs');
const path = require('path');

const pagesToScan = [
  'app/dashboard/apd-saya/page.tsx',
  'app/dashboard/approval-koreksi/page.tsx',
  'app/dashboard/crew-on-duty/page.tsx',
  'app/dashboard/dashboard-cuti/page.tsx',
  'app/dashboard/hr-dashboard/page.tsx',
  'app/dashboard/hr-override-absensi/page.tsx',
  'app/dashboard/import-mcu/page.tsx',
  'app/dashboard/import-roster/page.tsx',
  'app/dashboard/kelola-akses/page.tsx',
  'app/dashboard/kelola-apd/page.tsx',
  'app/dashboard/kelola-event/page.tsx',
  'app/dashboard/kelola-event/[id]/page.tsx',
  'app/dashboard/kelola-unit/page.tsx',
  'app/dashboard/koreksi-absensi/page.tsx',
  'app/dashboard/logistik/page.tsx',
  'app/dashboard/manajemen-absensi/page.tsx',
  'app/dashboard/mcu-saya/page.tsx',
  'app/dashboard/monitoring-apd/page.tsx',
  'app/dashboard/monitoring-mcu/karyawan/[nrp]/page.tsx',
  'app/dashboard/monitoring-mcu/page.tsx',
  'app/dashboard/monitoring-mcu/[id]/page.tsx',
  'app/dashboard/page.tsx',
  'app/dashboard/plant/inspeksi/page.tsx',
  'app/dashboard/plant/logistik/page.tsx',
  'app/dashboard/plant/page.tsx',
  'app/dashboard/rekap-absensi/page.tsx',
  'app/dashboard/rekrutmen/page.tsx',
  'app/dashboard/scan-qr/page.tsx',
  'app/dashboard/setting-unit/page.tsx',
  'app/dashboard/test-google/page.tsx'
];

let report = "=== DEEP SCAN 30 HALAMAN BTM APP ===\n";
report += "Dibuat: " + new Date().toISOString() + "\n\n";

pagesToScan.forEach((pagePath, idx) => {
  const fullPath = path.join(process.cwd(), pagePath);
  if (!fs.existsSync(fullPath)) {
    report += `\n\n[${idx+1}] ❌ FILE NOT FOUND: ${pagePath}\n`;
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');
  const totalLines = lines.length;
  const fileSizeKB = (fs.statSync(fullPath).size / 1024).toFixed(1);

  // Deteksi fitur & elemen kunci
  const hasUseClient = content.includes("'use client'") || content.includes('"use client"');
  const hasUseState = (content.match(/useState/g) || []).length;
  const hasUseEffect = (content.match(/useEffect/g) || []).length;
  const hasFetch = (content.match(/fetch\(/g) || []).length;
  const hasSupabaseAPI = content.match(/\/api\/[a-z\-\/]+/gi) || [];
  const hasForm = content.includes('<form') || content.includes('onSubmit');
  const hasTable = content.includes('<table') || content.includes('grid-cols-');
  const hasModal = content.includes('Modal') || content.includes('isOpen') || content.includes('setShow');
  const hasRouter = content.includes('useRouter') || content.includes('router.push') || content.includes('router.back');
  const hasImage = content.includes('next/image') || content.includes('<img');
  const hasChart = content.includes('recharts') || content.includes('Chart');
  const hasExcel = content.includes('xlsx') || content.includes('excel') || content.includes('Export');
  const hasUpload = content.includes('upload') || content.includes('FormData');
  const hasQRScanner = content.includes('QrScanner') || content.includes('qr-scanner') || content.includes('html5-qrcode');
  
  // Deteksi header pattern
  const hasBackButton = content.includes('router.back()') || content.includes('ArrowLeft') || content.includes('←');
  const hasStickyHeader = content.includes('sticky') || content.includes('fixed top');
  const hasBGWhite = content.includes('bg-white') && content.includes('min-h-screen');
  
  // Deteksi struktur & jumlah section
  const sectionCount = (content.match(/<section/g) || []).length;
  const divWithBGCount = (content.match(/bg-\[#[a-f0-9]+\]/gi) || []).length;

  // Extract judul halaman (deteksi h1/h2/title)
  const titleMatch = content.match(/<h1[^>]*>([^<]+)<\/h1>/) || content.match(/<h2[^>]*className="[^"]*text-[a-z0-9\-]+[^"]*"[^>]*>([^<]+)<\/h2>/);
  const pageTitle = titleMatch ? titleMatch[1].trim().substring(0, 60) : 'Tidak terdeteksi';

  report += `\n${'='.repeat(70)}\n`;
  report += `[${idx+1}/30] ${pagePath}\n`;
  report += `${'='.repeat(70)}\n`;
  report += `📏 Total Line     : ${totalLines} | Ukuran: ${fileSizeKB} KB\n`;
  report += `📋 Judul Halaman  : ${pageTitle}\n`;
  report += `🎯 Fitur Utama:\n`;
  report += `   - Client Comp   : ${hasUseClient ? 'YES' : 'NO'}\n`;
  report += `   - useState      : ${hasUseState}x\n`;
  report += `   - useEffect     : ${hasUseEffect}x\n`;
  report += `   - fetch API     : ${hasFetch}x\n`;
  report += `   - Form Input    : ${hasForm ? 'YES' : 'NO'}\n`;
  report += `   - Table/Grid    : ${hasTable ? 'YES' : 'NO'}\n`;
  report += `   - Modal/Popup   : ${hasModal ? 'YES' : 'NO'}\n`;
  report += `   - Router Nav    : ${hasRouter ? 'YES' : 'NO'}\n`;
  report += `   - Image/Photo   : ${hasImage ? 'YES' : 'NO'}\n`;
  report += `   - Chart Graph   : ${hasChart ? 'YES' : 'NO'}\n`;
  report += `   - Excel Export  : ${hasExcel ? 'YES' : 'NO'}\n`;
  report += `   - File Upload   : ${hasUpload ? 'YES' : 'NO'}\n`;
  report += `   - QR Scanner    : ${hasQRScanner ? 'YES' : 'NO'}\n`;
  report += `🎨 Layout Style:\n`;
  report += `   - BG Putih Full : ${hasBGWhite ? 'YA (perlu diganti)' : 'TIDAK'}\n`;
  report += `   - Back Button   : ${hasBackButton ? 'ADA' : 'TIDAK'}\n`;
  report += `   - Sticky Header : ${hasStickyHeader ? 'ADA' : 'TIDAK'}\n`;
  report += `🔗 API Endpoints Terpakai (${hasSupabaseAPI.length}):\n`;
  const uniqueAPIs = [...new Set(hasSupabaseAPI)].slice(0, 10);
  uniqueAPIs.forEach(api => report += `   • ${api}\n`);
  
  // Ambil 15 baris pertama return JSX (buat kita lihat struktur awal halaman)
  const returnIdx = content.indexOf('return (');
  if (returnIdx !== -1) {
    const previewJSX = content.substring(returnIdx, returnIdx + 800).replace(/\s+/g, ' ').substring(0, 400);
    report += `📌 Preview JSX Awal:\n   ${previewJSX}...\n`;
  }
});

fs.writeFileSync('deep-scan-report.txt', report);
console.log('=======================================================');
console.log('✅ Selesai! File: deep-scan-report.txt');
console.log(`✅ Total halaman ter-scan: ${pagesToScan.length}`);
console.log('=======================================================');
console.log('Buka & copy paste isi file itu ke chat.');
