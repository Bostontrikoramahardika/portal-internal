const fs = require('fs');
const path = require('path');

let envContent = '';
const envLocalPath = path.join(__dirname, '..', '.env.local');
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envLocalPath)) envContent = fs.readFileSync(envLocalPath, 'utf8');
else if (fs.existsSync(envPath)) envContent = fs.readFileSync(envPath, 'utf8');

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
  console.error("❌ Supabase URL / Key tidak ditemukan!");
  process.exit(1);
}

const EXCLUSIVE_KEYS = [
  'config_global',
  'manage_permissions',
  'reset_password_admin',
  'kelola_karyawan',
  'kelola_hak_cuti',
  'import_mcu_bulk',
  'import_roster_bulk'
];

async function lockExclusiveMenus() {
  console.log('\n🔐 MEMULAI PENGUNCIAN MENU EKSKLUSIF SUPER_ADMIN...\n');

  const res = await fetch(`${SUPABASE_URL}/rest/v1/menus?select=*`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });

  if (!res.ok) {
    console.error('❌ Gagal fetch menu:', res.status, res.statusText);
    return;
  }

  const menus = await res.json();

  const toDelete = menus.filter(m =>
    EXCLUSIVE_KEYS.includes(m.menu_key) &&
    m.role && m.role.toUpperCase() !== 'SUPER_ADMIN'
  );

  if (toDelete.length === 0) {
    console.log('✅ Semua menu eksklusif sudah aman! Hanya SUPER_ADMIN yang punya akses.');
    return;
  }

  const byRole = {};
  toDelete.forEach(m => {
    if (!byRole[m.role]) byRole[m.role] = [];
    byRole[m.role].push(m);
  });

  console.log(`⚠️  Ditemukan ${toDelete.length} akses yang perlu dicabut:\n`);
  Object.keys(byRole).sort().forEach(role => {
    console.log(`  🚫 [${role}]`);
    byRole[role].forEach(m => {
      console.log(`      - ${m.menu_label} (${m.menu_key})`);
    });
  });

  console.log('\n⏳ Menghapus akses dari database...\n');

  let success = 0, fail = 0;
  for (const m of toDelete) {
    const delRes = await fetch(
      `${SUPABASE_URL}/rest/v1/menus?id=eq.${m.id}`,
      {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'return=minimal'
        }
      }
    );

    if (delRes.ok || delRes.status === 204) {
      console.log(`  ✅ [${m.role}] ${m.menu_key} → DICABUT`);
      success++;
    } else {
      const errText = await delRes.text();
      console.log(`  ❌ [${m.role}] ${m.menu_key} → GAGAL (${delRes.status}: ${errText})`);
      fail++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`  🏁 SELESAI! ${success} berhasil dicabut, ${fail} gagal.`);
  console.log(`  🔐 7 menu eksklusif sekarang HANYA untuk SUPER_ADMIN.`);
  console.log('='.repeat(60) + '\n');
}

lockExclusiveMenus().catch(e => console.error('❌ Error:', e.message));