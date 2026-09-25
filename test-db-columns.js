
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Supabase credentials missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
  console.log('🔍 Testing Supabase unit_master schema...');
  const { data, error } = await supabase.from('unit_master').select('*').limit(1);
  if (error) {
    console.error('❌ Query error:', error);
    return;
  }
  if (data && data.length > 0) {
    console.log('✅ Kolom yang tersedia di unit_master:');
    console.log(Object.keys(data[0]));
  } else {
    console.log('⚠️ Tabel unit_master kosong.');
  }
}

checkTable();
