const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Supabase credentials missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkKruData() {
  console.log('🔍 Memeriksa data karyawan/users real di Supabase...');

  // Cek tabel users / karyawan / profiles
  const tablesToTry = ['users', 'karyawan', 'profiles', 'kru_plant', 'user_master'];
  
  for (const table of tablesToTry) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(5);
      if (!error && data) {
        console.log(`\n✅ Tabel REAL ditemukan: "${table}" (${data.length} baris sampel):`);
        console.log(data);
      }
    } catch (e) {}
  }
}

checkKruData();
