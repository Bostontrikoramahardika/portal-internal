const fs=require('fs');const p='app/api/menus/route.ts';
let s=fs.readFileSync(p,'utf8');const crlf=s.includes('\r\n');s=s.replace(/\r\n/g,'\n');
if(s.includes('required_permission')){console.log('Sudah terpasang.');process.exit(0);}
const lama=`  if (!isSuperAdmin) {
    // Tambah role '*' supaya menu global juga kebawa
    const rolesToQuery = Array.from(new Set([...(session.roles || []), '*']))
    query = query.in('role', rolesToQuery)
  }

  const { data: menus, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
`;
if(!s.includes(lama)){console.error('GAGAL: pola tidak ketemu di app/api/menus/route.ts');process.exit(1);}
const baru=`  // Saring setelah diambil supaya bisa memakai required_permission
  // (boleh berisi beberapa permission dipisah koma = OR).
  const { data: semuaMenus, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const userRolesSet = new Set([...(session.roles || []), '*'])
  const userPerms = new Set(session.permissions || [])

  const menus = isSuperAdmin
    ? semuaMenus
    : (semuaMenus || []).filter((m: any) => {
        const butuh = String(m.required_permission || '').trim()
        if (!butuh) return userRolesSet.has(m.role)
        if (butuh === 'super_admin_only') return false
        return butuh.split(',').map((x: string) => x.trim()).filter(Boolean)
          .some((perm: string) => userPerms.has(perm))
      })
`;
fs.writeFileSync(p+'.bak-perm',crlf?s.replace(/\n/g,'\r\n'):s,'utf8');
s=s.replace(lama,baru);
fs.writeFileSync(p,crlf?s.replace(/\n/g,'\r\n'):s,'utf8');
console.log('OK - app/api/menus/route.ts diperbarui. Cadangan: route.ts.bak-perm');