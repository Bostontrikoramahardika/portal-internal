const fs = require('fs');
const filePath = './app/dashboard/layout.tsx';

let content = fs.readFileSync(filePath, 'utf8');

// 1. Update customMatch untuk tab Plant
content = content.replace(
  /m\.menu_key === 'plant_katalog' \|\|\s*m\.menu_key === 'plant_orders' \|\|\s*m\.menu_key === 'plant_admin'/g,
  `m.menu_key === 'plant_logistik' ||
        m.menu_key === 'plant_dashboard' ||
        m.menu_key === 'plant_katalog' ||
        m.menu_key === 'plant_orders' ||
        m.menu_key === 'plant_admin'`
);

// 2. Tambahkan routing handler di navigateMenu
const searchTarget = `if (menuKey === 'plant_katalog') {`;
const replacement = `if (menuKey === 'plant_logistik') {
      router.push('/dashboard/plant/logistik')
      setBottomSheetOpen(false)
      return
    }
    if (menuKey === 'plant_dashboard') {
      router.push('/dashboard/plant')
      setBottomSheetOpen(false)
      return
    }
    if (menuKey === 'plant_katalog') {`;

if (content.includes(searchTarget) && !content.includes("menuKey === 'plant_logistik'")) {
  content = content.replace(searchTarget, replacement);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log("✓ app/dashboard/layout.tsx BERHASIL DIUPDATE!");
