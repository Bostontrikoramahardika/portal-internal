const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

let envVars = {};
['.env.local', '.env'].forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
    lines.forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        envVars[match[1]] = value;
      }
    });
  }
});

const url = envVars.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('\n--- DIAGNOSTIK DATASET UNIT SUPABASE ---');
console.log('Supabase URL:', url ? 'FOUND' : 'NOT FOUND');
console.log('Supabase Key:', key ? 'FOUND' : 'NOT FOUND');

if (!url || !key) {
  console.log('ERROR: .env.local tidak berisi Supabase URL / Key');
  process.exit(1);
}

const supabase = createClient(url, key);

async function inspectTables() {
  const tables = ['units', 'unit_master', 'master_units', 'plant_units', 'equipment', 'vehicles', 'p2h_units'];
  let foundAny = false;

  for (const t of tables) {
    try {
      const { data, error } = await supabase.from(t).select('*');
      if (!error && data) {
        foundAny = true;
        console.log(`\n========================================`);
        console.log(`TABEL FOUND: "${t}" (${data.length} total baris)`);
        console.log(`========================================`);
        if (data.length > 0) {
          console.log('Struktur Kolom:', Object.keys(data[0]).join(', '));
          console.log('\nSample 5 Baris Data Pertama:');
          data.slice(0, 5).forEach((item, idx) => {
            console.log(`[${idx + 1}]`, JSON.stringify(item));
          });
        }
      }
    } catch (e) {
      // Table does not exist, ignore
    }
  }

  if (!foundAny) {
    console.log('\nPERHATIAN: Tidak ditemukan data pada tabel-tabel unit standar.');
  }
}

inspectTables();
