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

const url = envVars.NEXT_PUBLIC_SUPABASE_URL;
const key = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function cek() {
  console.log('\n=== CEK STRUKTUR UNIT_MASTER ===');
  const { data: sample } = await supabase.from('unit_master').select('*').limit(1);
  if (sample && sample[0]) {
    console.log('Kolom saat ini:', Object.keys(sample[0]).join(', '));
    console.log('Ada kolom serial_number?', 'serial_number' in sample[0] ? 'YA' : 'TIDAK');
    console.log('Ada kolom sn?', 'sn' in sample[0] ? 'YA' : 'TIDAK');
  }

  console.log('\n=== CEK TABEL FORMAT INSPEKSI YG ADA ===');
  const tables = ['inspeksi_format', 'format_inspeksi', 'checklist_master', 'inspeksi_template', 'p2h_template'];
  for (const t of tables) {
    try {
      const { data, error } = await supabase.from(t).select('*').limit(1);
      if (!error) console.log(`Tabel "${t}" -> ADA`);
    } catch (e) {}
  }

  console.log('\n=== CEK LIST FILE HALAMAN PLANT ===');
  const plantDir = path.join(process.cwd(), 'app/dashboard/plant');
  if (fs.existsSync(plantDir)) {
    const list = fs.readdirSync(plantDir);
    console.log('Folder plant:', list.join(', '));
  }
}

cek();
