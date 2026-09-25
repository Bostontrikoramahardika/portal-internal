const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE URL or KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedPlantMenus() {
  console.log("=== MENDAFTARKAN MENU PLANT & LOGISTIK ===");
  
  const roles = [
    'super_admin',
    'gl_plant',
    'admin_plant',
    'pjo_site',
    'director_ops',
    'manager_ops',
    'business_dev',
    'hr_ho',
    'employee'
  ];

  const menuItems = [];

  roles.forEach(role => {
    // 1. Menu Logistik & Gudang Site
    menuItems.push({
      role: role,
      menu_key: 'plant_logistik',
      menu_label: 'Logistik & Gudang Site',
      menu_icon: '📦',
      menu_group: 'Plant',
      sort_order: 25,
      active: true
    });

    // 2. Menu Hub / Katalog Kru Plant
    menuItems.push({
      role: role,
      menu_key: 'plant_dashboard',
      menu_label: 'Katalog & Kru Plant',
      menu_icon: '🛠️',
      menu_group: 'Plant',
      sort_order: 26,
      active: true
    });
  });

  for (const item of menuItems) {
    const { error } = await supabase
      .from('menus')
      .upsert(item, { onConflict: 'role,menu_key' });

    if (error) {
      console.error(`Gagal insert [${item.role}] ${item.menu_key}:`, error.message);
    } else {
      console.log(`✓ [${item.role}] ${item.menu_key} -> "${item.menu_label}"`);
    }
  }

  console.log("\nSelesai memperbarui menu database!");
}

seedPlantMenus();
