const fs = require('fs');
const path = require('path');

// 1. Update app/dashboard/plant/inspeksi/page.tsx with PageHeader & standard styling
const inspeksiPath = path.join(__dirname, 'app', 'dashboard', 'plant', 'inspeksi', 'page.tsx');
let inspeksiCode = fs.readFileSync(inspeksiPath, 'utf8');

if (!inspeksiCode.includes('PageHeader')) {
  // Add PageHeader import
  inspeksiCode = `import PageHeader from "@/app/components/PageHeader";\n` + inspeksiCode;
  
  // Replace custom header banner with standardized PageHeader
  inspeksiCode = inspeksiCode.replace(
    /<div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white[\s\S]*?<\/div>\s*<\/div>/,
    `<PageHeader 
        title="Form Inspeksi P2H Lapangan" 
        subtitle="Sistem Input Real-Time Condition Checklist Unit Operasional Site PPA-MLP"
        backUrl="/dashboard/plant"
        badge="REALTIME DB"
      />`
  );
  
  fs.writeFileSync(inspeksiPath, inspeksiCode, 'utf8');
  console.log('✅ Standardized app/dashboard/plant/inspeksi/page.tsx');
}

// 2. Update app/dashboard/plant/page.tsx
const plantPath = path.join(__dirname, 'app', 'dashboard', 'plant', 'page.tsx');
let plantCode = fs.readFileSync(plantPath, 'utf8');

if (!plantCode.includes('PageHeader')) {
  plantCode = `import PageHeader from "@/app/components/PageHeader";\n` + plantCode;
  
  // Replace Header section
  plantCode = plantCode.replace(
    /<div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900[\s\S]*?<\/header>/,
    `<PageHeader 
        title="Plant Dashboard & Maintenance Operations" 
        subtitle="PPA Site MLP — Mekanik, Inspeksi, Unit & Partbook"
        backUrl="/dashboard"
        badge="ONLINE"
        rightElement={
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-amber-400">{userSession.nama || "Mekanik Lapangan"}</div>
            <div className="text-[10px] text-slate-400">NRP: {userSession.nrp || "2600101"} | Site: {userSession.site || "MLP"}</div>
          </div>
        }
      />`
  );
  
  fs.writeFileSync(plantPath, plantCode, 'utf8');
  console.log('✅ Standardized app/dashboard/plant/page.tsx');
}

// 3. Update app/dashboard/plant/logistik/page.tsx
const plantLogistikPath = path.join(__dirname, 'app', 'dashboard', 'plant', 'logistik', 'page.tsx');
let plantLogistikCode = fs.readFileSync(plantLogistikPath, 'utf8');

if (!plantLogistikCode.includes('PageHeader')) {
  plantLogistikCode = `import PageHeader from "@/app/components/PageHeader";\n` + plantLogistikCode;
  
  // Add header
  if (plantLogistikCode.includes('<header className=')) {
    plantLogistikCode = plantLogistikCode.replace(
      /<header className="[\s\S]*?<\/header>/,
      `<PageHeader 
        title="Plant Logistik & Permintaan Part" 
        subtitle="Pengajuan, Stok Fast Moving & Monitoring Barang Keluar/Masuk Lapangan"
        backUrl="/dashboard/plant"
        badge="PLANT SITE"
      />`
    );
  } else {
    plantLogistikCode = plantLogistikCode.replace(
      /<div className="min-h-screen bg-slate-50">/,
      `<div className="min-h-screen bg-slate-50">
        <PageHeader 
          title="Plant Logistik & Permintaan Part" 
          subtitle="Pengajuan, Stok Fast Moving & Monitoring Barang Keluar/Masuk Lapangan"
          backUrl="/dashboard/plant"
          badge="PLANT SITE"
        />`
    );
  }
  
  fs.writeFileSync(plantLogistikPath, plantLogistikCode, 'utf8');
  console.log('✅ Standardized app/dashboard/plant/logistik/page.tsx');
}

// 4. Update app/dashboard/logistik/page.tsx
const mainLogistikPath = path.join(__dirname, 'app', 'dashboard', 'logistik', 'page.tsx');
let mainLogistikCode = fs.readFileSync(mainLogistikPath, 'utf8');

if (!mainLogistikCode.includes('PageHeader')) {
  mainLogistikCode = `import PageHeader from "@/app/components/PageHeader";\n` + mainLogistikCode;
  
  if (mainLogistikCode.includes('<header className=')) {
    mainLogistikCode = mainLogistikCode.replace(
      /<header className="[\s\S]*?<\/header>/,
      `<PageHeader 
        title="Logistik Central Portal" 
        subtitle="Manajemen PR, PO, LPB, Stok Warehouse & Opname Central"
        backUrl="/dashboard"
        badge="LOGISTIK"
      />`
    );
  } else {
    mainLogistikCode = mainLogistikCode.replace(
      /<div className="min-h-screen bg-slate-50">/,
      `<div className="min-h-screen bg-slate-50">
        <PageHeader 
          title="Logistik Central Portal" 
          subtitle="Manajemen PR, PO, LPB, Stok Warehouse & Opname Central"
          backUrl="/dashboard"
          badge="LOGISTIK"
        />`
    );
  }
  
  fs.writeFileSync(mainLogistikPath, mainLogistikCode, 'utf8');
  console.log('✅ Standardized app/dashboard/logistik/page.tsx');
}

// 5. Update app/partbook/admin/page.tsx
const adminPartbookPath = path.join(__dirname, 'app', 'partbook', 'admin', 'page.tsx');
if (fs.existsSync(adminPartbookPath)) {
  let adminPartbookCode = fs.readFileSync(adminPartbookPath, 'utf8');
  if (!adminPartbookCode.includes('PageHeader')) {
    adminPartbookCode = `import PageHeader from "@/app/components/PageHeader";\n` + adminPartbookCode;
    adminPartbookCode = adminPartbookCode.replace(
      /<div className="min-h-screen bg-slate-950 text-white">/,
      `<div className="min-h-screen bg-slate-900 text-white">
        <PageHeader 
          title="Partbook Management Console" 
          subtitle="Upload Catalog PDF & Processing Interactive Diagrams"
          backUrl="/parts-catalog"
          badge="ADMIN"
        />`
    );
    fs.writeFileSync(adminPartbookPath, adminPartbookCode, 'utf8');
    console.log('✅ Standardized app/partbook/admin/page.tsx');
  }
}

// 6. Update app/parts-catalog/page.tsx - Ensure Back Button exists in top header
const partsCatalogPath = path.join(__dirname, 'app', 'parts-catalog', 'page.tsx');
if (fs.existsSync(partsCatalogPath)) {
  let catalogCode = fs.readFileSync(partsCatalogPath, 'utf8');
  if (!catalogCode.includes('Kembali') && !catalogCode.includes('PageHeader')) {
    catalogCode = `import PageHeader from "@/app/components/PageHeader";\n` + catalogCode;
    catalogCode = catalogCode.replace(
      /<header className="bg-slate-900\/90 backdrop-blur border-b border-amber-500\/20 sticky top-0 z-40">/,
      `<PageHeader 
        title="Interactive Parts Catalog" 
        subtitle="Diagram Explosive, Parts Breakdown & Direct Order"
        backUrl="/dashboard/plant"
        badge="CATALOG"
      />
      <header className="hidden">`
    );
    fs.writeFileSync(partsCatalogPath, catalogCode, 'utf8');
    console.log('✅ Added Back button & standard header to app/parts-catalog/page.tsx');
  }
}

console.log('🎉 Core pages updated with unified header and Back buttons!');
