const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAll() {
  console.log("=== 1. FIX DATABASE MENUS ===");
  const roles = ['super_admin','gl_plant','admin_plant','pjo_site','director_ops','manager_ops','business_dev','hr_ho'];

  for (const role of roles) {
    // Aktifkan kembali Partbook (plant_katalog)
    await supabase.from('menus').upsert({
      role, menu_key: 'plant_katalog', menu_label: 'Partbook',
      menu_icon: '📖', menu_group: 'Plant', sort_order: 25, active: true
    }, { onConflict: 'role,menu_key' });

    // Pastikan Logistik aktif
    await supabase.from('menus').upsert({
      role, menu_key: 'plant_logistik', menu_label: 'Logistik & Gudang Site',
      menu_icon: '📦', menu_group: 'Plant', sort_order: 26, active: true
    }, { onConflict: 'role,menu_key' });

    // Pastikan Kru & Workshop aktif
    await supabase.from('menus').upsert({
      role, menu_key: 'plant_dashboard', menu_label: 'Kru & Workshop Plant',
      menu_icon: '🛠️', menu_group: 'Plant', sort_order: 27, active: true
    }, { onConflict: 'role,menu_key' });

    // Nonaktifkan plant_admin sebagai menu terpisah
    await supabase.from('menus').update({ active: false }).eq('role', role).eq('menu_key', 'plant_admin');

    console.log("  OK [" + role + "]");
  }

  // Tambahkan untuk role employee juga (logistik + kru)
  for (const mk of ['plant_logistik', 'plant_dashboard']) {
    await supabase.from('menus').upsert({
      role: 'employee', menu_key: mk,
      menu_label: mk === 'plant_logistik' ? 'Logistik & Gudang Site' : 'Kru & Workshop Plant',
      menu_icon: mk === 'plant_logistik' ? '📦' : '🛠️',
      menu_group: 'Plant', sort_order: mk === 'plant_logistik' ? 26 : 27, active: true
    }, { onConflict: 'role,menu_key' });
  }
  console.log("  OK [employee]");

  console.log("\n=== 2. FIX LAYOUT.TSX ===");
  const fp = './app/dashboard/layout.tsx';
  let c = fs.readFileSync(fp, 'utf8');

  // Fix customMatch tab Plant
  c = c.replace(
    /m\.menu_key === 'plant_logistik'[\s\S]*?m\.menu_key === 'plant_admin'/,
    "m.menu_key === 'plant_katalog' ||\n        m.menu_key === 'plant_logistik' ||\n        m.menu_key === 'plant_dashboard'"
  );

  // Fix routing: pastikan plant_katalog ada dan benar
  if (!c.includes("menuKey === 'plant_katalog'")) {
    c = c.replace(
      "if (menuKey === 'plant_logistik') {",
      "if (menuKey === 'plant_katalog') {\n      router.push('/parts-catalog')\n      setBottomSheetOpen(false)\n      return\n    }\n    if (menuKey === 'plant_logistik') {"
    );
  }

  // Hapus routing plant_admin yang terpisah
  c = c.replace(
    /\s*if \(menuKey === 'plant_admin'\) \{\s*router\.push\('\/partbook\/admin'\)\s*setBottomSheetOpen\(false\)\s*return\s*\}/g,
    ''
  );

  fs.writeFileSync(fp, c, 'utf8');
  console.log("  OK - layout.tsx diperbarui");
  console.log("\n=== SELESAI ===");
}
fixAll();
