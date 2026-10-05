import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'

const HO_LINTAS_SITE = ['hr_ho', 'director_ops', 'business_dev', 'manager_ops', 'spv_she_ho']

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const bulan = searchParams.get('bulan') || new Date().toISOString().slice(0, 7)
    const siteParam = searchParams.get('site') || ''

    const [th, bl] = bulan.split('-')
    const akhir = new Date(Number(th), Number(bl), 0).getDate()
    const awalTgl = th + '-' + bl + '-01'
    const akhirTgl = th + '-' + bl + '-' + String(akhir).padStart(2, '0')

    const roles: string[] = session.roles || []
    const bolehLintas = session.is_super_admin || roles.some((r) => HO_LINTAS_SITE.includes(r))

    const { data: rows, error } = await supabaseAdmin
      .from('overtime_requests').select('*')
      .gte('tanggal', awalTgl).lte('tanggal', akhirTgl)
      .order('tanggal', { ascending: false }).limit(1000)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const nrps = Array.from(new Set((rows || []).flatMap((r: any) =>
      [r.nrp, r.atasan_nrp, r.pjo_nrp].filter(Boolean).map(String))))

    const { data: emps } = nrps.length
      ? await supabaseAdmin.from('employees')
          .select('nrp, nama, jabatan, departemen, site').in('nrp', nrps)
      : { data: [] as any[] }

    const peta: Record<string, any> = {}
    ;(emps || []).forEach((e: any) => (peta[String(e.nrp)] = e))

    const namaJab = (n: any) => {
      const e = peta[String(n)]
      if (!e) return null
      return e.jabatan ? e.nama + ' (' + e.jabatan + ')' : e.nama
    }

    let hasil = (rows || []).map((r: any) => {
      const e = peta[String(r.nrp)] || {}
      const ata = String(r.status_atasan || '').toUpperCase()
      const pjo = String(r.status_pjo || '').toUpperCase()
      const fin = String(r.status_final || '').toUpperCase()
      const ditolak = fin.includes('DITOLAK') || ata === 'REJECTED' || pjo === 'REJECTED'
      const tahap = ditolak ? 'DITOLAK'
        : pjo === 'APPROVED' ? 'FINAL'
        : ata === 'APPROVED' ? 'MENUNGGU_PJO'
        : 'MENUNGGU_ATASAN'
      return {
        id: r.id, nrp: r.nrp,
        nama: e.nama || r.nrp, jabatan: e.jabatan || '-',
        departemen: e.departemen || '-', site: e.site || '-',
        tanggal: r.tanggal, jam_mulai: r.jam_mulai, jam_selesai: r.jam_selesai,
        total_jam: r.total_jam ?? null, alasan: r.alasan || '-',
        status_atasan: r.status_atasan, status_pjo: r.status_pjo,
        status_final: r.status_final, tahap,
        atasan_nama: namaJab(r.atasan_nrp),
        pjo_nama: namaJab(r.pjo_nrp),
        disetujui_oleh: namaJab(r.pjo_nrp) || namaJab(r.atasan_nrp) || null,
      }
    })

    if (!bolehLintas && session.site) hasil = hasil.filter((x: any) => x.site === session.site)
    if (siteParam && siteParam !== 'ALL') hasil = hasil.filter((x: any) => x.site === siteParam)

    const hitung = (t: string) => hasil.filter((x: any) => x.tahap === t).length

    return NextResponse.json({
      ok: true, bulan, rows: hasil,
      ringkasan: {
        total: hasil.length, final: hitung('FINAL'),
        menunggu_pjo: hitung('MENUNGGU_PJO'),
        menunggu_atasan: hitung('MENUNGGU_ATASAN'),
        ditolak: hitung('DITOLAK'),
      },
      boleh_lintas_site: bolehLintas,
      boleh_edit: session.is_super_admin ||
        (session.roles || []).some((r: string) => ['hr_site', 'hr_ho', 'pjo_site'].includes(r)),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Gagal memuat lembur' }, { status: 500 })
  }
}

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
