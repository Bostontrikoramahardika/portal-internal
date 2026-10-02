// MODE PRATINJAU "LIHAT SEBAGAI ROLE" (v2 - jangkar regex, tahan CRLF & beda indentasi)
// Pakai: node scripts/preview-role2.js --dry | (kosong) | --undo

const fs = require('fs');
const F = {
  api: 'app/api/menus/route.ts',
  lay: 'app/dashboard/layout.tsx',
  nav: 'app/components/MobileBottomNav.tsx',
};
const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const UNDO = args.includes('--undo');

if (UNDO) {
  let n = 0;
  for (const p of Object.values(F)) {
    const b = p + '.bak-preview';
    if (fs.existsSync(b)) { fs.copyFileSync(b, p); fs.unlinkSync(b); n++; }
  }
  console.log(n ? 'Dibatalkan. ' + n + ' file dikembalikan.' : 'Tidak ada cadangan.');
  process.exit(0);
}

for (const p of Object.values(F)) {
  if (!fs.existsSync(p)) { console.error('TIDAK ADA: ' + p); process.exit(1); }
}

function baca(p) {
  const r = fs.readFileSync(p, 'utf8');
  const bom = r.charCodeAt(0) === 0xfeff;
  return { crlf: r.includes('\r\n'), bom, t: (bom ? r.slice(1) : r).replace(/\r\n/g, '\n') };
}
function tulis(p, t, i) {
  fs.writeFileSync(p, (i.bom ? '\ufeff' : '') + (i.crlf ? t.replace(/\n/g, '\r\n') : t), 'utf8');
}

const gagal = [];
const lewat = [];
const simpan = [];

function sub(o, pola, isi, label) {
  if (!pola.test(o)) { gagal.push(label); return o; }
  return o.replace(pola, isi);
}

// ===== API =====
const iApi = baca(F.api);
let api = iApi.t;
if (api.includes('as_role')) {
  lewat.push('api (sudah terpasang)');
} else {
  api = sub(api, /const isSuperAdmin = session\.is_super_admin \|\| false\n/,
`const isSuperAdmin = session.is_super_admin || false

  const asRole = new URL(request.url).searchParams.get('as_role') || ''
  let previewPerms: Set<string> | null = null
  let previewRoleLabel = ''
  if (isSuperAdmin && asRole && asRole !== 'super_admin') {
    const { data: rt } = await supabase
      .from('role_templates')
      .select('role_key, role_label, permissions')
      .eq('role_key', asRole)
      .maybeSingle()
    if (rt) {
      previewPerms = new Set((rt as any).permissions || [])
      previewRoleLabel = (rt as any).role_label || asRole
    }
  }
`, 'api: blok pratinjau');

  api = sub(api, /const menus = isSuperAdmin\s*\n(\s*)\? semuaMenus/,
    (_m, sp) => 'const menus = (isSuperAdmin && !previewPerms)\n' + sp + '? semuaMenus', 'api: bypass super admin');

  api = sub(api, /if \(!butuh\) return userRolesSet\.has\(m\.role\)/,
    'const perms = previewPerms || userPerms\n        if (!butuh) return previewPerms ? true : userRolesSet.has(m.role)',
    'api: sumber permission');

  api = sub(api, /\.some\(\(perm: string\) => userPerms\.has\(perm\)\)/,
    '.some((perm: string) => perms.has(perm))', 'api: pencocokan');

  api = sub(api, /NextResponse\.json\(\{\s*menus:\s*deduplicated\s*\}\)/,
`NextResponse.json({
    menus: deduplicated,
    is_super_admin: isSuperAdmin,
    preview_role: previewPerms ? { role_key: asRole, role_label: previewRoleLabel } : null,
  })`, 'api: response');

  simpan.push([F.api, api, iApi]);
}

// ===== LAYOUT =====
const iLay = baca(F.lay);
let lay = iLay.t;
if (/setIsSuperAdmin/.test(lay)) {
  lewat.push('layout (sudah terpasang)');
} else {
  lay = sub(lay, /(const \[isNotifOpen, setIsNotifOpen\] = useState\(false\))/,
    '$1\n  const [isSuperAdmin, setIsSuperAdmin] = useState(false)', 'layout: state');

  lay = sub(lay, /(setMenus\(data\.menus\))/,
    '$1\n            setIsSuperAdmin(Boolean(data.is_super_admin))', 'layout: simpan flag');

  lay = sub(lay, /<MobileBottomNav([^>]*?)\/>/,
    (m, isi) => (/isSuperAdmin/.test(isi) ? m : '<MobileBottomNav' + isi.replace(/\s*$/, ' ') + 'isSuperAdmin={isSuperAdmin} />'),
    'layout: prop');

  simpan.push([F.lay, lay, iLay]);
}

// ===== NAV =====
const iNav = baca(F.nav);
let nav = iNav.t;
if (/gantiPratinjau/.test(nav)) {
  lewat.push('nav (sudah terpasang)');
} else {
  nav = sub(nav, /(interface MobileBottomNavProps \{[\s\S]*?)(\n\})/,
    (_m, a, b) => a + '\n  isSuperAdmin?: boolean;' + b, 'nav: tipe prop');

  nav = sub(nav, /export default function MobileBottomNav\(\{([\s\S]*?)\}: MobileBottomNavProps\)/,
    (_m, isi) => 'export default function MobileBottomNav({' + isi.replace(/\s*$/, '') + ', isSuperAdmin = false }: MobileBottomNavProps)',
    'nav: tanda tangan');

  nav = sub(nav, /(const \[activeTab, setActiveTab\] = useState<string \| null>\(null\);)/,
`$1

  // ---- MODE PRATINJAU ROLE (khusus super admin) ----
  const [daftarRole, setDaftarRole] = useState<any[]>([]);
  const [roleDipilih, setRoleDipilih] = useState('');
  const [menuPratinjau, setMenuPratinjau] = useState<MenuItem[] | null>(null);
  const [memuatPratinjau, setMemuatPratinjau] = useState(false);

  const authHeaders = () => {
    const h: Record<string, string> = {};
    try {
      const t = localStorage.getItem('btm_session_token_v1');
      if (t) h['Authorization'] = 'Bearer ' + t;
    } catch {}
    return h;
  };

  useEffect(() => {
    if (!isSuperAdmin || activeTab !== 'more' || daftarRole.length) return;
    fetch('/api/role-templates', { credentials: 'include', headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const arr = d?.data || d?.roles || [];
        if (Array.isArray(arr)) setDaftarRole(arr);
      })
      .catch(() => {});
  }, [isSuperAdmin, activeTab, daftarRole.length]);

  async function gantiPratinjau(rk: string) {
    setRoleDipilih(rk);
    if (!rk || rk === 'super_admin') { setMenuPratinjau(null); return; }
    setMemuatPratinjau(true);
    try {
      const r = await fetch('/api/menus?as_role=' + encodeURIComponent(rk), {
        credentials: 'include',
        headers: authHeaders(),
      });
      const d = await r.json();
      setMenuPratinjau(Array.isArray(d?.menus) ? d.menus : []);
    } catch {
      setMenuPratinjau([]);
    } finally {
      setMemuatPratinjau(false);
    }
  }`, 'nav: state pratinjau');

  // HANYA pemanggilan di dalam komponen, BUKAN deklarasi fungsinya
  nav = sub(nav, /\? kelompokkanMenu\(menus\) :/, '? kelompokkanMenu(menuPratinjau || menus) :', 'nav: sumber grid');

  const polaMore = /([ \t]*)\{activeTab === 'more' && \(\n([ \t]*)<div className="pb-6">/;
  const ck = nav.match(polaMore);
  if (!ck) {
    gagal.push('nav: UI pemilih role (blok grid More tidak ketemu)');
  } else {
    const I = ck[1];
    const UI = [
      `{activeTab === 'more' && isSuperAdmin && daftarRole.length > 0 && (`,
      `  <div className="mb-4 p-3 rounded-2xl bg-amber-50 border border-amber-200">`,
      `    <label className="block text-[10px] font-black uppercase tracking-widest text-amber-700 mb-1.5">`,
      `      Lihat sebagai role`,
      `    </label>`,
      `    <select`,
      `      value={roleDipilih}`,
      `      onChange={(e) => gantiPratinjau(e.target.value)}`,
      `      className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-sm font-bold text-slate-700"`,
      `    >`,
      `      <option value="">Super Admin (akses penuh saya)</option>`,
      `      {daftarRole`,
      `        .filter((r: any) => r.role_key !== 'super_admin')`,
      `        .map((r: any) => (`,
      `          <option key={r.role_key} value={r.role_key}>`,
      `            {r.role_label} ({r.role_key})`,
      `          </option>`,
      `        ))}`,
      `    </select>`,
      `    {menuPratinjau && (`,
      `      <p className="mt-1.5 text-[10px] font-bold text-amber-700">`,
      `        Pratinjau: {menuPratinjau.length} menu terlihat. Hak akses Anda sendiri tidak berubah.`,
      `      </p>`,
      `    )}`,
      `  </div>`,
      `)}`,
      ``,
      `{activeTab === 'more' && memuatPratinjau && (`,
      `  <p className="py-8 text-center text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">`,
      `    Memuat pratinjau...`,
      `  </p>`,
      `)}`,
    ].map((l) => (l ? I + l : l)).join('\n');

    nav = nav.replace(polaMore, (m, i1, i2) =>
      UI + '\n' + i1 + "{activeTab === 'more' && !memuatPratinjau && (\n" + i2 + '<div className="pb-6">');
  }

  simpan.push([F.nav, nav, iNav]);
}

// ===== HASIL =====
console.log('');
if (gagal.length) {
  console.error('GAGAL - bagian berikut tidak cocok:');
  gagal.forEach((g) => console.error('  - ' + g));
  console.error('\nTidak ada file yang diubah. Kirim pesan ini ke saya.');
  process.exit(1);
}
lewat.forEach((l) => console.log('  [--] ' + l));
simpan.forEach(([p]) => console.log('  [OK] ' + p));
console.log('');
if (DRY) {
  console.log('MODE UJI COBA - tidak ada file yang diubah');
} else {
  for (const [p, t, i] of simpan) {
    if (!fs.existsSync(p + '.bak-preview')) fs.copyFileSync(p, p + '.bak-preview');
    tulis(p, t, i);
  }
  console.log('SELESAI - ' + simpan.length + ' file diperbarui. Cadangan: *.bak-preview');
}
console.log('\n  Batalkan : node scripts/preview-role2.js --undo');
console.log('  Lanjut   : Remove-Item -Recurse -Force .next ; npm run build ; npm run start\n');