const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUnits() {
  console.log("=== PENCARIAN TABEL / DATA UNIT SITE ===");
  const tables = ['units', 'master_unit', 'kelola_unit', 'equipment'];
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(5);
    if (!error && data) {
      console.log(`✓ Tabel '${t}' ditemukan dengan ${data.length} sampel data:`);
      data.forEach(u => console.log(`   - ${u.no_unit || u.nama_unit || u.kode_unit || u.id} (Site: ${u.site || u.lokasi || '-'})`));
    }
  }

  // Cek juga API unit jika ada
  console.log("\n=== CEK API UNIT ===");
  const apiPaths = ['./app/api/units/route.ts', './app/api/kelola-unit/route.ts', './app/api/unit/route.ts'];
  apiPaths.forEach(p => {
    if (fs.existsSync(p)) console.log(`✓ File API ditemukan: ${p}`);
  });
}

checkUnits();
