const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectColumns() {
  console.log("=== STRUKTUR TABEL INSPEKSI ===");
  const tables = ['inspeksi_unit', 'p2h_unit', 'unit_inspections', 'p2h', 'inspeksi'];
  
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(1);
    if (!error && data) {
      console.log(`\n✓ Tabel '${t}' sampel data:`, data.length > 0 ? Object.keys(data[0]) : "Tabel kosong tapi ada");
    }
  }
}

inspectColumns();
