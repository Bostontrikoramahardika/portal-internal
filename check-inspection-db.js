const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkInspectionTables() {
  console.log("=== CEK TABEL INSPEKSI / P2H ===");
  const testTables = ['inspeksi_unit', 'p2h_unit', 'unit_inspections', 'p2h', 'inspeksi'];
  
  for (const t of testTables) {
    try {
      const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
      if (!error) {
        console.log(`✓ Tabel '${t}' DITEMUKAN! Total rows: ${count}`);
      } else {
        console.log(`- Tabel '${t}' tidak ada (${error.message})`);
      }
    } catch (e) {
      console.log(`- Error checking '${t}': ${e.message}`);
    }
  }
}

checkInspectionTables();
