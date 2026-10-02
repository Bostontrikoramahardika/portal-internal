const fs = require('fs');
const path = require('path');

// Load environment variables dari .env / .env.local
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
    if (supabaseUrl && supabaseKey) {
      console.log(`Menggunakan konfigurasi dari: ${p}`);
      break;
    }
  }
}

if (!supabaseUrl || !supabaseKey) {
  console.log('Gagal memuat kredensial Supabase dari file .env. Mencoba memuat dari config file...');
  const supabaseLibPath = path.join(process.cwd(), 'app/lib/supabase.ts');
  if (fs.existsSync(supabaseLibPath)) {
    const content = fs.readFileSync(supabaseLibPath, 'utf8');
    console.log('Isi app/lib/supabase.ts:');
    console.log(content);
  }
}

if (supabaseUrl && supabaseKey) {
  console.log(`URL: ${supabaseUrl}`);
  console.log(`Key: ${supabaseKey.substring(0, 15)}...`);
  
  // Lakukan request langsung ke REST API Supabase
  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`
  };
  
  fetch(`${supabaseUrl}/rest/v1/menus?select=*&active=eq.true&order=sort_order`, { headers })
    .then(r => {
      if (!r.ok) throw new Error('HTTP error ' + r.status);
      return r.json();
    })
    .then(data => {
      console.log('\n=== DAFTAR MENU YANG AKTIF DI DATABASE SUPABASE ===\n');
      console.log(`Total Menu Aktif: ${data.length}\n`);
      
      console.log('Format: [ID] - Label / Name (menu_key) -> Href [Role]');
      console.log('------------------------------------------------------');
      data.forEach(m => {
        console.log(`[${m.id}] - ${m.title || m.menu_label || m.name} (${m.menu_key}) -> ${m.href || m.url} [Role: ${m.role}]`);
      });
    })
    .catch(err => {
      console.error('Gagal mengambil data dari Supabase REST API:', err.message);
    });
} else {
  console.log('Tidak dapat melakukan fetch karena kredensial Supabase kosong.');
}