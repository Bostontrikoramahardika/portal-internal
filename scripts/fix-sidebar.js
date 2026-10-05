const fs=require('fs');const p='app/dashboard/layout.tsx';
const r=fs.readFileSync(p,'utf8');const crlf=r.includes('\r\n');let s=r.replace(/\r\n/g,'\n');
if(s.includes('grupSidebar')){console.log('Sudah terpasang.');process.exit(0);}
const a='  return (\n    <AuthProvider';
if(!s.includes(a)){console.error('GAGAL: AuthProvider tidak ketemu, jalankan fix-auth.js dulu');process.exit(1);}
const helper=`  const rapikanJudul = (g) => {
    const t = String(g || '').trim()
    if (!t) return 'Lainnya'
    if (t === t.toUpperCase() || t === t.toLowerCase()) {
      return t.toLowerCase().split(' ')
        .map((w) => (w.length > 3 ? w.charAt(0).toUpperCase() + w.slice(1) : w.toUpperCase()))
        .join(' ')
    }
    return t
  }
  const grupSidebar = (() => {
    const peta = new Map()
    ;(menus || []).forEach((m) => {
      if (!m || !m.menu_key) return
      if (m.parent_menu_key) return
      if (String(m.nav_tab || '').toLowerCase() === 'hidden') return
      const grup = String(m.menu_group || 'Lainnya')
      const k = grup.trim().toLowerCase()
      if (!peta.has(k)) peta.set(k, { judul: rapikanJudul(grup), urut: Number(m.sort_order) || 0, items: [] })
      const g = peta.get(k)
      g.urut = Math.min(g.urut, Number(m.sort_order) || 0)
      if (!g.items.some((x) => x.menu_key === m.menu_key)) g.items.push(m)
    })
    return Array.from(peta.values())
      .map((g) => ({ ...g, items: g.items.sort((x, y) => (Number(x.sort_order)||0) - (Number(y.sort_order)||0)) }))
      .filter((g) => g.items.length > 0)
      .sort((x, y) => x.urut - y.urut || x.judul.localeCompare(y.judul))
  })()

` + a;
s=s.replace(a,helper);
const i=s.indexOf('            {menus.map((item, idx) => {');
if(i<0){console.error('GAGAL: perulangan sidebar tidak ketemu');process.exit(1);}
const tutup='            })}\n';
const k=s.indexOf(tutup,i)+tutup.length;
const baru=`            {grupSidebar.map((grup) => (
              <div key={grup.judul} className="pt-3">
                <div className="px-3 pb-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400">
                  {grup.judul}
                </div>
                {grup.items.map((item) => {
                  const label = String(item.menu_label || item.menu_key).replace(/^[^A-Za-z0-9(]+/, '')
                  const href = item.href || '/dashboard?menu=' + item.menu_key
                  const cur = searchParams ? searchParams.get('menu') : null
                  const im = href.includes('menu=') ? href.split('menu=')[1]?.split('&')[0] : null
                  const isActive = im ? cur === im : pathname === href && !cur
                  return (
                    <Link
                      key={item.menu_key}
                      href={href}
                      className={[
                        'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
                        isActive ? 'bg-[#003d79] text-white' : 'text-slate-600 hover:bg-slate-100',
                      ].join(' ')}
                    >
                      <span className="text-sm leading-none">{item.menu_icon || '\\u25A2'}</span>
                      <span className="truncate">{label}</span>
                    </Link>
                  )
                })}
              </div>
            ))}
`;
s=s.slice(0,i)+baru+s.slice(k);
fs.writeFileSync(p+'.bak-sidebar',r,'utf8');
fs.writeFileSync(p,crlf?s.replace(/\n/g,'\r\n'):s,'utf8');
console.log('OK - sidebar dikelompokkan');