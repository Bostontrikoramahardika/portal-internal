// app/api/she/route.ts
// Modul Inspeksi & Observasi (SHE)
// - Katalog 99 form dibaca dari app/lib/data/she-templates.json
//   lalu diisi otomatis ke tabel she_forms saat pertama dibuka.
// - Isian disimpan ke she_submissions + she_items.
// - Rekap dilihat SHE (dan HR/PJO sesuai site).

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'
import { logAudit } from '@/app/lib/auditLog'
import TEMPLATES from '@/app/lib/data/she-templates.json'

export const dynamic = 'force-dynamic'

const SHE_ROLES = ['she_site', 'spv_she_ho']
const VIEW_ROLES = [
  'she_site', 'spv_she_ho',
  'hr_site', 'hrga_site', 'hr_ho', 'hrga', 'hrga_pusat',
  'pjo_site', 'pjo', 'gl_produksi', 'gl_plant', 'atasan',
  'admin', 'admin_site', 'admin_plant', 'super_admin',
  'director_ops', 'manager_ops',
]
const HO_ROLES = ['hr_ho', 'hrga', 'hrga_pusat', 'admin', 'super_admin', 'director_ops', 'manager_ops', 'spv_she_ho']

const rolesOf = (s: any) => (s?.roles || []).map((r: string) => String(r).toLowerCase())
const hasAny = (roles: string[], l: string[]) => roles.some((r) => l.includes(r))

type Tpl = { kode: string; nama: string; mode?: string; kolom: string[]; items: string[]; jumlah_baris?: number }
const ALL: Record<string, Tpl[]> = {
  INSPEKSI: (TEMPLATES as any).inspeksi || [],
  OBSERVASI: (TEMPLATES as any).observasi || [],
}

async function pastikanKatalog(jenis: string) {
  const { count } = await supabase
    .from('she_forms')
    .select('id', { count: 'exact', head: true })
    .eq('jenis', jenis)

  if ((count || 0) > 0) return

  const list = ALL[jenis] || []
  if (!list.length) return

  const rows = list.map((t) => ({
    jenis,
    kode: t.kode,
    nama: t.nama,
    mode: t.mode || 'item',
    kolom: t.kolom || [],
    items: t.items || [],
    jumlah_baris: t.jumlah_baris || (t.items || []).length,
  }))

  // kirim bertahap supaya tidak kena limit body
  for (let i = 0; i < rows.length; i += 20) {
    await supabase.from('she_forms').upsert(rows.slice(i, i + 20), {
      onConflict: 'jenis,kode',
      ignoreDuplicates: true,
    })
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

    const roles = rolesOf(session)
    if (!session.is_super_admin && !hasAny(roles, VIEW_ROLES)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('mode') || 'forms'
    const jenis = (searchParams.get('jenis') || 'INSPEKSI').toUpperCase()

    if (mode === 'forms') {
      await pastikanKatalog(jenis)
      const { data, error } = await supabase
        .from('she_forms')
        .select('id, kode, nama, mode, kolom, items, jumlah_baris')
        .eq('jenis', jenis)
        .eq('aktif', true)
        .order('kode', { ascending: true })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, forms: data || [] })
    }

    if (mode === 'detail') {
      const id = searchParams.get('id') || ''
      const { data: sub } = await supabase.from('she_submissions').select('*').eq('id', id).maybeSingle()
      const { data: items } = await supabase
        .from('she_items').select('*').eq('submission_id', id).order('no', { ascending: true })
      return NextResponse.json({ success: true, submission: sub, items: items || [] })
    }

    // mode === 'list'
    const bulan = searchParams.get('bulan') || String(new Date().getMonth() + 1).padStart(2, '0')
    const tahun = searchParams.get('tahun') || String(new Date().getFullYear())
    const site = searchParams.get('site') || ''
    const status = searchParams.get('status') || ''

    const firstDay = `${tahun}-${bulan}-01`
    const lastDay = `${tahun}-${bulan}-${String(new Date(Number(tahun), Number(bulan), 0).getDate()).padStart(2, '0')}`

    let q = supabase
      .from('she_submissions')
      .select('*')
      .eq('jenis', jenis)
      .gte('tanggal', firstDay)
      .lte('tanggal', lastDay)
      .order('created_at', { ascending: false })

    if (site) q = q.eq('site', site)
    if (status) q = q.eq('status', status)

    const isHO = !!session.is_super_admin || hasAny(roles, HO_ROLES)
    const userSite = String((session as any).scope_site || (session as any).site || '')
    if (!isHO && userSite) q = q.eq('site', userSite)

    let { data, error } = await q

    // kolom site belum ada → ulangi tanpa filter site
    if (error && /site/i.test(error.message || '')) {
      let q2 = supabase
        .from('she_submissions')
        .select('*')
        .eq('jenis', jenis)
        .gte('tanggal', firstDay)
        .lte('tanggal', lastDay)
        .order('created_at', { ascending: false })
      if (status) q2 = q2.eq('status', status)
      const ulang = await q2
      data = ulang.data
      error = ulang.error
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const rows = data || []
    return NextResponse.json({
      success: true,
      rows,
      stats: {
        total: rows.length,
        terkirim: rows.filter((r: any) => r.status === 'TERKIRIM').length,
        diverifikasi: rows.filter((r: any) => r.status === 'DIVERIFIKASI').length,
        temuan: rows.reduce((a: number, r: any) => a + Number(r.jumlah_temuan || 0), 0),
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Gagal memuat' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

    const roles = rolesOf(session)
    if (!session.is_super_admin && !hasAny(roles, VIEW_ROLES)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const body = await request.json()
    const action = body.action || 'submit'
    const myNrp = String((session as any).nrp || '')

    if (action === 'verifikasi') {
      if (!session.is_super_admin && !hasAny(roles, SHE_ROLES)) {
        return NextResponse.json({ error: 'Hanya SHE yang bisa memverifikasi' }, { status: 403 })
      }
      const { error } = await supabase
        .from('she_submissions')
        .update({ status: 'DIVERIFIKASI', verified_by: myNrp, verified_at: new Date().toISOString() })
        .eq('id', body.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, message: 'Laporan diverifikasi' })
    }

    if (action === 'seed') {
      await pastikanKatalog('INSPEKSI')
      await pastikanKatalog('OBSERVASI')
      return NextResponse.json({ success: true, message: 'Katalog form disiapkan' })
    }

    // action === 'submit'
    const {
      form_id, jenis, kode_form, nama_form, tanggal, jam, site, lokasi, unit,
      diperiksa_nrp, diperiksa_nama, departemen, catatan, items,
    } = body

    if (!form_id || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Form dan isian wajib ada' }, { status: 400 })
    }

    const isTemuan = (h: string) => {
      const v = String(h || '').toUpperCase()
      return v === 'Q' || v === 'NO' || v === 'NG'
    }
    const jumlahTemuan = items.filter((i: any) => isTemuan(i.hasil)).length

    const kepala: any = {
      form_id,
      jenis,
      kode_form,
      nama_form,
      tanggal: tanggal || new Date().toISOString().slice(0, 10),
      jam: jam || null,
      site: site || (session as any).site || (session as any).scope_site || null,
      lokasi: lokasi || null,
      unit: unit || null,
      pengawas_nrp: myNrp,
      pengawas_nama: (session as any).nama || '',
      diperiksa_nrp: diperiksa_nrp || null,
      diperiksa_nama: diperiksa_nama || null,
      departemen: departemen || null,
      catatan: catatan || null,
      jumlah_temuan: jumlahTemuan,
      status: 'TERKIRIM',
    }

    let { data: sub, error: e1 } = await supabase
      .from('she_submissions').insert(kepala).select().single()

    // kolom site / departemen belum ada di database lama → ulangi tanpa kolom itu
    if (e1 && /(site|departemen)/i.test(e1.message || '')) {
      const { site: _s, departemen: _d, ...tanpa } = kepala
      const ulang = await supabase.from('she_submissions').insert(tanpa).select().single()
      sub = ulang.data
      e1 = ulang.error
    }

    if (e1 || !sub) return NextResponse.json({ error: e1?.message || 'Gagal menyimpan' }, { status: 500 })

    const itemRows = items.map((i: any, idx: number) => ({
      submission_id: (sub as any).id,
      no: i.no ?? idx + 1,
      uraian: i.uraian || null,
      hasil: i.hasil || null,
      keterangan: i.keterangan || null,
      hazard: i.hazard || null,
      foto_url: i.foto_url || null,          // ⬅ foto temuan ikut disimpan
    }))

    let { error: e2 } = await supabase.from('she_items').insert(itemRows)

    // kolom foto_url belum ada di database lama → simpan tanpa foto
    if (e2 && /foto_url/i.test(e2.message || '')) {
      const tanpaFoto = itemRows.map(({ foto_url, ...sisa }: any) => sisa)
      const ulang = await supabase.from('she_items').insert(tanpaFoto)
      e2 = ulang.error
    }
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })

    await logAudit({
      actor_nrp: myNrp,
      actor_nama: (session as any).nama || '',
      action: 'SUBMIT_SHE_FORM',
      category: 'SYSTEM' as const,
      target_type: 'she_submission',
      target_id: (sub as any).id,
      target_label: `${jenis} ${kode_form} (${jumlahTemuan} temuan)`,
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      id: (sub as any).id,
      message: `Laporan tersimpan • ${jumlahTemuan} temuan`,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Gagal menyimpan' }, { status: 500 })
  }
}
