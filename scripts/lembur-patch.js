const fs=require('fs');const p='app/api/overtime/kelola/route.ts';
const r=fs.readFileSync(p,'utf8');const crlf=r.includes('\r\n');let s=r.replace(/\r\n/g,'\n');
if(s.includes('export async function PATCH')){console.log('Sudah terpasang.');process.exit(0);}
const a='      boleh_lintas_site: bolehLintas,';
if(!s.includes(a)){console.error('GAGAL: jalankan file API lembur dulu');process.exit(1);}
s=s.replace(a, a+`
      boleh_edit: session.is_super_admin ||
        (session.roles || []).some((r: string) => ['hr_site', 'hr_ho', 'pjo_site'].includes(r)),`);
s += `

const BOLEH_EDIT = ['hr_site', 'hr_ho', 'pjo_site']

export async function PATCH(req: NextRequest) {
  try {
    const token = req.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

    const roles: string[] = session.roles || []
    const boleh = session.is_super_admin || roles.some((r) => BOLEH_EDIT.includes(r))
    if (!boleh) return NextResponse.json({ error: 'Hanya HR atau PJO yang boleh mengubah lembur' }, { status: 403 })

    const body = await req.json()
    const id = body?.id
    if (!id) return NextResponse.json({ error: 'id wajib' }, { status: 400 })

    const { data: lama } = await supabaseAdmin
      .from('overtime_requests').select('nrp, tanggal').eq('id', id).maybeSingle()
    if (!lama) return NextResponse.json({ error: 'Data lembur tidak ditemukan' }, { status: 404 })

    if (!session.is_super_admin && session.site) {
      const { data: emp } = await supabaseAdmin
        .from('employees').select('site').eq('nrp', lama.nrp).maybeSingle()
      const lintas = roles.includes('hr_ho')
      if (!lintas && emp?.site && emp.site !== session.site) {
        return NextResponse.json({ error: 'Beda site, tidak berwenang' }, { status: 403 })
      }
    }

    const ubah: any = { updated_at: new Date().toISOString() }
    if (body.jam_mulai !== undefined) ubah.jam_mulai = body.jam_mulai || null
    if (body.jam_selesai !== undefined) ubah.jam_selesai = body.jam_selesai || null
    if (body.total_jam !== undefined) ubah.total_jam = Number(body.total_jam) || 0
    if (body.alasan !== undefined) ubah.alasan = String(body.alasan || '').trim() || null

    const { error } = await supabaseAdmin.from('overtime_requests').update(ubah).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Gagal menyimpan' }, { status: 500 })
  }
}
`;
fs.writeFileSync(p+'.bak-patch',r,'utf8');
fs.writeFileSync(p,crlf?s.replace(/\n/g,'\r\n'):s,'utf8');
console.log('OK - PATCH + flag boleh_edit terpasang');