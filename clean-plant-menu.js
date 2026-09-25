const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function mergeAndCleanMenus() {
  console.log("=== 1. MERAPIKAN MENU PLANT DI DATABASE ===");

  // Nonaktifkan menu yang menduplikasi (plant_katalog & plant_orders)
  const { error: errDeact } = await supabase
    .from('menus')
    .update({ active: false })
    .in('menu_key', ['plant_katalog', 'plant_orders']);

  if (errDeact) {
    console.error("Gagal menonaktifkan duplikat:", errDeact.message);
  } else {
    console.log("✓ Menu duplikat (plant_katalog & plant_orders) dinonaktifkan.");
  }

  // Update label plant_dashboard menjadi lebih tegas dan jelas fungsinya
  const { error: errUpdate } = await supabase
    .from('menus')
    .update({ 
      menu_label: 'Kru & Workshop Plant',
      menu_icon: '🛠️',
      sort_order: 26
    })
    .eq('menu_key', 'plant_dashboard');

  if (errUpdate) {
    console.error("Gagal update label plant_dashboard:", errUpdate.message);
  } else {
    console.log("✓ plant_dashboard diubah menjadi 'Kru & Workshop Plant'.");
  }

  console.log("\n=== 2. MERAPIKAN LAYOUT.TSX ===");
  const filePath = './app/dashboard/layout.tsx';
  let content = fs.readFileSync(filePath, 'utf8');

  // Bersihkan customMatch Tab Plant agar hanya memuat 3 menu esensial
  const plantCustomMatchRegex = /m\.menu_key === 'plant_logistik'[\s\S]*?m\.menu_key === 'plant_admin'/g;
  content = content.replace(
    plantCustomMatchRegex,
    `m.menu_key === 'plant_logistik' ||\n        m.menu_key === 'plant_dashboard' ||\n        m.menu_key === 'plant_admin'`
  );

  // Bersihkan juga customMatch Tab HO
  content = content.replace(
    /\s*m\.menu_key === 'plant_katalog' \|\|/g,
    ''
  );
  content = content.replace(
    /\s*m\.menu_key === 'plant_orders' \|\|/g,
    ''
  );

  // Pastikan plant_dashboard & plant_logistik masuk di HO customMatch jika belum ada
  if (content.includes("key: 'ho',") && !content.includes("m.menu_key === 'plant_logistik'")) {
    content = content.replace(
      /m\.menu_key === 'kelola_unit' \|\|/,
      `m.menu_key === 'kelola_unit' ||\n        m.menu_key === 'plant_logistik' ||\n        m.menu_key === 'plant_dashboard' ||`
    );
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log("✓ app/dashboard/layout.tsx berhasil diperbarui dan disederhanakan!");

  console.log("\n=== SELESAI ===");
}

mergeAndCleanMenus();
