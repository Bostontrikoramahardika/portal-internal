const fs = require('fs');
const path = require('path');

let supabaseUrl = '';
let supabaseKey = '';

const envPaths = ['.env', '.env.local', '.env.production', '.env.development'];
for (const p of envPaths) {
  const fullPath = path.join(process.cwd(), p);
  if (fs.existsSync(fullPath)) {
    const lines = fs.readFileSync(fullPath, 'utf8').split('\n');
    lines.forEach(line => {
      const parts = line.split('=');
      if (parts[0] && parts[1]) {
        const key = parts[0].trim();
        const value = parts[1].trim().replace(/['"]/g, '');
        if (key === 'NEXT_PUBLIC_SUPABASE_URL' || key === 'SUPABASE_URL') supabaseUrl = value;
        if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY' || key === 'SUPABASE_ANON_KEY' || key === 'SUPABASE_SERVICE_ROLE_KEY') supabaseKey = value;
      }
    });
    if (supabaseUrl && supabaseKey) break;
  }
}

if (supabaseUrl && supabaseKey) {
  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`
  };
  
  // Ambil 1 baris saja untuk kita teliti strukturnya
  fetch(`${supabaseUrl}/rest/v1/menus?limit=1`, { headers })
    .then(r => r.json())
    .then(data => {
      console.log('=== STRUKTUR KOLOM UTUH TABEL MENUS ===\n');
      console.log(JSON.stringify(data[0], null, 2));
    })
    .catch(err => {
      console.error('Gagal mengambil struktur:', err.message);
    });
} else {
  console.log('Kredensial Supabase tidak ditemukan.');
}