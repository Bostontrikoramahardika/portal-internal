const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE URL or KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMenus() {
  const { data, error } = await supabase
    .from('menus')
    .select('*')
    .order('sort_order');

  if (error) {
    console.error("Error fetching menus:", error);
    return;
  }

  console.log(`=== TOTAL MENU TERDAFTAR: ${data.length} ===`);
  data.forEach(m => {
    console.log(`[${m.role}] ${m.menu_key} -> "${m.menu_label}" (${m.menu_group || '-'}) [active: ${m.active}]`);
  });
}

checkMenus();
