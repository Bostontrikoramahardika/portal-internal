const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function setupNavigation() {
  console.log("=== 1. DAFTARKAN MENU INSPEKSI KE DB ===");
  const roles = ['super_admin','gl_plant','admin_plant','pjo_site','director_ops','manager_ops','business_dev','hr_ho','employee'];
  for (const role of roles) {
    await supabase.from('menus').upsert({
      role, menu_key: 'plant_inspeksi', menu_label: 'Inspeksi P2H (Harian)',
      menu_icon: '📋', menu_group: 'Plant', sort_order: 28, active: true
    }, { onConflict: 'role,menu_key' });
  }
  console.log("✓ Menu plant_inspeksi terdaftar.");

  console.log("\n=== 2. UPDATE LAYOUT.TSX ===");
  const layoutPath = './app/dashboard/layout.tsx';
  let layout = fs.readFileSync(layoutPath, 'utf8');

  // Tambah plant_inspeksi ke customMatch Tab Plant
  layout = layout.replace(
    /m\.menu_key === 'plant_dashboard'/,
    "m.menu_key === 'plant_dashboard' ||\n        m.menu_key === 'plant_inspeksi'"
  );

  // Tambah routing
  if (!layout.includes("menuKey === 'plant_inspeksi'")) {
    layout = layout.replace(
      "if (menuKey === 'plant_katalog') {",
      "if (menuKey === 'plant_inspeksi') {\n      router.push('/dashboard/plant/inspeksi')\n      setBottomSheetOpen(false)\n      return\n    }\n    if (menuKey === 'plant_katalog') {"
    );
  }
  fs.writeFileSync(layoutPath, layout, 'utf8');
  console.log("✓ layout.tsx diperbarui.");

  console.log("\n=== 3. HAPUS KARTU DARI KRU & WORKSHOP ===");
  const plantPagePath = './app/dashboard/plant/page.tsx';
  if (fs.existsSync(plantPagePath)) {
    let plantPage = fs.readFileSync(plantPagePath, 'utf8');
    const targetCard = /<Link href="\/dashboard\/plant\/inspeksi"[\s\S]*?<\/Link>/;
    plantPage = plantPage.replace(targetCard, '');
    // Kembalikan grid ke 2 kolom
    plantPage = plantPage.replace(/grid-cols-1 sm:grid-cols-2 lg:grid-cols-3/, 'grid-cols-1 md:grid-cols-2');
    fs.writeFileSync(plantPagePath, plantPage, 'utf8');
    console.log("✓ Kartu inspeksi dihapus dari halaman Kru & Workshop.");
  }
}
setupNavigation();
