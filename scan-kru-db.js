const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const root = process.cwd();
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function findKruAndTables() {
  console.log('=== 1. CEK PERSIS NAMA TABEL DI SUPABASE ===');
  
  // List of possible employee / user tables
  const possibleTables = [
    'users', 'user', 'karyawan', 'employees', 'profiles', 'profile', 
    'crew', 'kru', 'mechanics', 'mekanik', 'master_karyawan', 
    'absensi', 'attendance', 'crew_on_duty', 'unit_master'
  ];

  for (const table of possibleTables) {
    const { data, error } = await supabase.from(table).select('*').limit(3);
    if (!error && data) {
      console.log(`✅ TABEL ADA: "${table}" (${data.length} data)`);
      if (data.length > 0) {
        console.log('   Sample keys:', Object.keys(data[0]));
        console.log('   Sample row:', JSON.stringify(data[0]).slice(0, 150));
      }
    }
  }

  console.log('\n=== 2. CEK FILE CODE UNTUK FUNGSI FETCH KARYAWAN/CREW ===');
  const filesToCheck = [
    'app/dashboard/crew-on-duty/page.tsx',
    'app/dashboard/manajemen-absensi/page.tsx',
    'app/api/auth/me/route.ts'
  ];

  filesToCheck.forEach(f => {
    const full = path.join(root, f);
    if (fs.existsSync(full)) {
      const code = fs.readFileSync(full, 'utf8');
      console.log(`📄 ${f}:`);
      const fromMatch = code.match(/\.from\(["']([^"']+)["']\)/g);
      if (fromMatch) {
        console.log('   Tables referenced:', Array.from(new Set(fromMatch)));
      }
    }
  });
}

findKruAndTables();
