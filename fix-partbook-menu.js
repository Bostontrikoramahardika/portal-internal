const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAdminPartbook() {
  console.log("=== AKTIFKAN KEMBALI MENU ADMIN PARTBOOK ===");
  const roles = [
    'super_admin',
    'gl_plant',
    'admin_plant',
    'pjo_site',
    'director_ops',
    'manager_ops',
    'business_dev',
    'hr_ho'
  ];

  for (const role of roles) {
    const { error } = await supabase
      .from('menus')
      .upsert({
        role: role,
        menu_key: 'plant_admin',
        menu_label: 'Admin Partbook',
        menu_icon: '📖',
        menu_group: 'Plant',
        sort_order: 27,
        active: true
      }, { onConflict: 'role,menu_key' });

    if (error) {
      console.error(`Gagal mengaktifkan plant_admin untuk ${role}:`, error.message);
    } else {
      console.log(`✓ [${role}] plant_admin -> Aktif`);
    }
  }
  console.log("Selesai memperbaiki menu database!");
}

fixAdminPartbook();
