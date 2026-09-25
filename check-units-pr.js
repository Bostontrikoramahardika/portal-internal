const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUnitsAndPR() {
  console.log("=== CEK TABEL UNIT & PR ===");
  
  // 1. Cek tabel unit
  const tables = ['units', 'master_unit', 'kelola_unit', 'equipment'];
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(5);
    if (!error && data) {
      console.log(`✓ Tabel '${t}' ditemukan (${data.length} unit sampel)`);
    }
  }

  // 2. Cek tabel purchase_requests untuk backlog
  const { data: prData, error: prErr } = await supabase.from('purchase_requests').select('*').limit(1);
  if (!prErr) {
    console.log("✓ Tabel 'purchase_requests' siap menerima data Backlog!");
  }
}

checkUnitsAndPR();
