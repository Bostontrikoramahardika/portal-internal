const fs = require('fs');
const path = require('path');

let envContent = '';
const envLocalPath = path.join(__dirname, '..', '.env.local');
const envPath = path.join(__dirname, '..', '.env');

if (fs.existsSync(envLocalPath)) {
  envContent = fs.readFileSync(envLocalPath, 'utf8');
} else if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
}

const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = match[2] || '';
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    env[match[1]] = val.trim();
  }
});

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Supabase URL / Key tidak ditemukan di .env atau .env.local!");
  process.exit(1);
}

async function inspectRoles() {
  try {
    const url = `${SUPABASE_URL}/rest/v1/menus?select=*&active=eq.true&order=role,sort_order`;
    const res = await fetch(url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP Error: ${res.status} ${res.statusText}`);
    }

    const menus = await res.json();
    
    // Group by Role
    const rolesMap = {};
    menus.forEach(m => {
      const r = m.role ? m.role.toUpperCase() : 'ALL';
      if (!rolesMap[r]) rolesMap[r] = [];
      rolesMap[r].push(m);
    });

    console.log('\n================================================================');
    console.log('       DAFTAR ROLE & HAK AKSES MENU SAAT INI (SUPABASE DB)       ');
    console.log('================================================================\n');

    const roleKeys = Object.keys(rolesMap).sort();
    if (roleKeys.length === 0) {
      console.log('⚠️ Tidak ada data menu aktif di tabel `menus`.');
      return;
    }

    roleKeys.forEach(role => {
      console.log(`\n👑 [ ROLE: ${role} ] ➔ (${rolesMap[role].length} Hak Akses Menu)`);
      console.log('----------------------------------------------------------------');
      
      const groupMap = {};
      rolesMap[role].forEach(item => {
        const grp = item.menu_group || 'Umum';
        if (!groupMap[grp]) groupMap[grp] = [];
        groupMap[grp].push(item);
      });

      Object.keys(groupMap).forEach(grp => {
        console.log(`  📁 [${grp.toUpperCase()}]`);
        groupMap[grp].forEach(item => {
          const mode = item.access_mode ? `(Mode: ${item.access_mode})` : '';
          const key = `[Key: ${item.menu_key}]`.padEnd(25);
          console.log(`     • ${item.menu_label.padEnd(26)} ${key} ${mode}`);
        });
      });
    });

    console.log('\n================================================================\n');

  } catch (err) {
    console.error('❌ Gagal memeriksa role:', err.message);
  }
}

inspectRoles();