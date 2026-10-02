const fs=require('fs');
const F={api:'app/api/menus/route.ts',lay:'app/dashboard/layout.tsx',nav:'app/components/MobileBottomNav.tsx'};
const gagal=[];const simpan=[];
function baca(p){const r=fs.readFileSync(p,'utf8');return{crlf:r.includes('\r\n'),bom:r.charCodeAt(0)===0xfeff,t:(r.charCodeAt(0)===0xfeff?r.slice(1):r).replace(/\r\n/g,'\n')};}
function tulis(p,t,i){fs.writeFileSync(p,(i.bom?'\ufeff':'')+(i.crlf?t.replace(/\n/g,'\r\n'):t),'utf8');}
function sub(o,a,b,label){if(!o.includes(a)){gagal.push(label);return o;}return o.replace(a,b);}

// ---------- API ----------
const iApi=baca(F.api);let api=iApi.t;
if(api.includes('as_role')){console.log('API sudah terpasang, dilewati.');}
else{
api=sub(api,"  const isSuperAdmin = session.is_super_admin || false\n",
`  const isSuperAdmin = session.is_super_admin || false

  // MODE PRATINJAU: super admin boleh melihat menu "sebagai" role lain.
  // Hanya memengaruhi daftar menu, bukan hak akses sebenarnya.
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
`,'api: blok pratinjau');
api=sub(api,"  const menus = isSuperAdmin\n    ? semuaMenus","  const menus = (isSuperAdmin && !previewPerms)\n    ? semuaMenus",'api: bypass super admin');
api=sub(api,"        const butuh = String(m.required_permission || '').trim()\n        if (!butuh) return userRolesSet.has(m.role)",
"        const butuh = String(m.required_permission || '').trim()\n        const perms = previewPerms || userPerms\n        if (!butuh) return previewPerms ? true : userRolesSet.has(m.role)",'api: sumber permission');
api=sub(api,"          .some((perm: string) => userPerms.has(perm))","          .some((perm: string) => perms.has(perm))",'api: pencocokan');
api=sub(api,"  const response = NextResponse.json({ menus: deduplicated })",
`  const response = NextResponse.json({
    menus: deduplicated,
    is_super_admin: isSuperAdmin,
    preview_role: previewPerms ? { role_key: asRole, role_label: previewRoleLabel } : null,
  })`,'api: response');
simpan.push([F.api,api,iApi]);}

// ---------- LAYOUT ----------
const iLay=baca(F.lay);let lay=iLay.t;
if(lay.includes('isSuperAdmin')){console.log('Layout sudah terpasang, dilewati.');}
else{
lay=sub(lay,"  const [isNotifOpen, setIsNotifOpen] = useState(false)","  const [isNotifOpen, setIsNotifOpen] = useState(false)\n  const [isSuperAdmin, setIsSuperAdmin] = useState(false)",'layout: state');
lay=sub(lay,"          } else if (data && Array.isArray(data.menus)) {\n            setMenus(data.menus)\n          }",
"          } else if (data && Array.isArray(data.menus)) {\n            setMenus(data.menus)\n            setIsSuperAdmin(Boolean(data.is_super_admin))\n          }",'layout: simpan flag');
lay=sub(lay,"<MobileBottomNav menus={menus} userRole={currentUser?.role || 'KARYAWAN'} />",
"<MobileBottomNav menus={menus} userRole={currentUser?.role || 'KARYAWAN'} isSuperAdmin={isSuperAdmin} />",'layout: prop');
simpan.push([F.lay,lay,iLay]);}

// ---------- NAV ----------
const iNav=baca(F.nav);let nav=iNav.t;
if(nav.includes('gantiPratinjau')){console.log('Nav sudah terpasang, dilewati.');}
else{
nav=sub(nav,"interface MobileBottomNavProps {\n  menus?: MenuItem[];\n  userRole?: string;\n}",
"interface MobileBottomNavProps {\n  menus?: MenuItem[];\n  userRole?: string;\n  isSuperAdmin?: boolean;\n}",'nav: tipe prop');
nav=sub(nav,"export default function MobileBottomNav({ menus = [], userRole = 'KARYAWAN' }: MobileBottomNavProps) {",
"export default function MobileBottomNav({ menus = [], userRole = 'KARYAWAN', isSuperAdmin = false }: MobileBottomNavProps) {",'nav: tanda tangan');
nav=sub(nav,"  const [activeTab, setActiveTab] = useState<string | null>(null);",
`  const [activeTab, setActiveTab] = useState<string | null>(null);

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
  }`,'nav: state pratinjau');
nav=sub(nav,"  const grupMore = activeTab === 'more' ? kelompokkanMenu(menus) : [];",
"  const grupMore = activeTab === 'more' ? kelompokkanMenu(menuPratinjau || menus) : [];",'nav: sumber grid');
nav=sub(nav,`            {/* ===== MODE "MORE": GRID PER KELOMPOK, SUMBER DATABASE ===== */}
            {activeTab === 'more' && (
              <div className="pb-6">`,
`            {activeTab === 'more' && isSuperAdmin && daftarRole.length > 0 && (
              <div className="mb-4 p-3 rounded-2xl bg-amber-50 border border-amber-200">
                <label className="block text-[10px] font-black uppercase tracking-widest text-amber-700 mb-1.5">
                  Lihat sebagai role
                </label>
                <select
                  value={roleDipilih}
                  onChange={(e) => gantiPratinjau(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-sm font-bold text-slate-700"
                >
                  <option value="">Super Admin (akses penuh saya)</option>
                  {daftarRole
                    .filter((r: any) => r.role_key !== 'super_admin')
                    .map((r: any) => (
                      <option key={r.role_key} value={r.role_key}>
                        {r.role_label} ({r.role_key})
                      </option>
                    ))}
                </select>
                {menuPratinjau && (
                  <p className="mt-1.5 text-[10px] font-bold text-amber-700">
                    Pratinjau: {menuPratinjau.length} menu terlihat. Hak akses Anda sendiri tidak berubah.
                  </p>
                )}
              </div>
            )}

            {activeTab === 'more' && memuatPratinjau && (
              <p className="py-8 text-center text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">
                Memuat pratinjau...
              </p>
            )}
            {activeTab === 'more' && !memuatPratinjau && (
              <div className="pb-6">`,'nav: UI pemilih role');
simpan.push([F.nav,nav,iNav]);}

if(gagal.length){console.error('\nGAGAL:');gagal.forEach(g=>console.error('  - '+g));console.error('\nTidak ada file diubah.');process.exit(1);}
for(const [p,t,i] of simpan){ if(!fs.existsSync(p+'.bak-preview')) fs.copyFileSync(p,p+'.bak-preview'); tulis(p,t,i); }
console.log('\nOK - '+simpan.length+' file diperbarui. Cadangan: *.bak-preview');
console.log('Lanjut: Remove-Item -Recurse -Force .next ; npm run build ; npm run start');