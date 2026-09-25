const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanup() {
  // 1. Nonaktifkan plant_orders di database
  console.log("=== 1. NONAKTIFKAN plant_orders DI DATABASE ===");
  const { error: dbErr } = await supabase
    .from('menus')
    .update({ active: false })
    .eq('menu_key', 'plant_orders');

  if (dbErr) {
    console.error("Gagal update DB:", dbErr.message);
  } else {
    console.log("OK - Semua menu plant_orders di-set active=false");
  }

  // 2. Update layout.tsx - hapus plant_orders dari customMatch dan routing
  console.log("\n=== 2. UPDATE layout.tsx ===");
  const filePath = './app/dashboard/layout.tsx';
  let content = fs.readFileSync(filePath, 'utf8');

  // Hapus plant_orders dari customMatch (tab Plant)
  content = content.replace(
    /\s*m\.menu_key === 'plant_orders' \|\|/g,
    ''
  );

  // Hapus routing handler plant_orders
  content = content.replace(
    /\s*if \(menuKey === 'plant_orders'\) \{\s*router\.push\('\/part-orders'\)\s*setBottomSheetOpen\(false\)\s*return\s*\}/g,
    ''
  );

  // Hapus plant_orders dari customMatch tab HO juga
  // (sudah ter-cover oleh regex di atas karena polanya sama)

  fs.writeFileSync(filePath, content, 'utf8');
  console.log("OK - plant_orders dihapus dari layout.tsx");

  console.log("\n=== SELESAI ===");
}

cleanup();
