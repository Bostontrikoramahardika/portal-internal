import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'

// REKAP ABSENSI UNTUK REKONSILIASI KARYAWAN
//  GET  ?mode=saya | ?mode=detail&id= | ?mode=hr&periode= | ?mode=periode
//  POST -> HR mengirim rekap (atau versi baru lewat ulang_dari)

const ROLE_HR = ['hr_site', 'hr_ho']

async function sesi(req: NextRequest) {
  const token = req.cookies.get('session_token')?.value
  if (!token) return null
  return await getSession(token)
}

export async function GET(req: NextRequest) {
  try {
    const session = await sesi(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const mode = searchParams.get('mode') || 'saya'
    const nrp = String(session.nrp)
    const roles: string[] = session.roles || []
    const bolehKirim = session.is_super_admin || roles.some((r) => ROLE_HR.includes(r))

    if (mode === 'detail') {
      const id = searchParams.get('id')
      if (!id) return NextResponse.json({ error: 'id wajib' }, { status: 400 })
      const { data: item } = await supabaseAdmin
        .from('rekap_item').select('*').eq('id', id).maybeSingle()
      if (!item) return NextResponse.json({ error: 'Rekap tidak ditemukan' }, { status: 404 })
      if (item.nrp !== nrp && !bolehKirim) {
        return NextResponse.json({ error: 'Bukan rekap Anda' }, { status: 403 })
      }
      const { data: periode } = await supabaseAdmin
        .from('rekap_periode').select('*').eq('id', item.periode_id).maybeSingle()

      if (item.nrp === nrp && !item.dibaca_at) {
        const now = new Date().toISOString()
        await supabaseAdmin.from('rekap_item')
          .update({ dibaca_at: now, status: item.status === 'TERKIRIM' ? 'DIBACA' : item.status })
          .eq('id', id)
        item.dibaca_at = now
        if (item.status === 'TERKIRIM') item.status = 'DIBACA'
      }
      return NextResponse.json({ ok: true, item, periode })
    }

    if (mode === 'hr') {
      if (!bolehKirim) return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
      const periodeId = searchParams.get('periode')
      if (!periodeId) return NextResponse.json({ error: 'periode wajib' }, { status: 400 })
      const { data } = await supabaseAdmin
        .from('rekap_item').select('*').eq('periode_id', periodeId).order('nama_karyawan')
      const rows = data || []
      const hitung = (s: string) => rows.filter((r: any) => r.status === s).length
      return NextResponse.json({
        ok: true, rows,
        ringkasan: {
          total: rows.length, terkirim: hitung('TERKIRIM'), dibaca: hitung('DIBACA'),
          setuju: hitung('SETUJU'), protes: hitung('PROTES'),
        },
      })
    }

    if (mode === 'periode') {
      if (!bolehKirim) return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
      let q = supabaseAdmin.from('rekap_periode').select('*')
        .order('created_at', { ascending: false }).limit(50)
      if (!session.is_super_admin && session.site) q = q.eq('site', session.site)
      const { data } = await q
      return NextResponse.json({ ok: true, rows: data || [] })
    }

    const { data: items } = await supabaseAdmin
      .from('rekap_item').select('*').eq('nrp', nrp)
      .order('created_at', { ascending: false }).limit(24)
    const ids = Array.from(new Set((items || []).map((i: any) => i.periode_id)))
    const { data: periodeRows } = ids.length
      ? await supabaseAdmin.from('rekap_periode').select('*').in('id', ids)
      : { data: [] as any[] }
    const peta: Record<string, any> = {}
    ;(periodeRows || []).forEach((p: any) => (peta[p.id] = p))

    return NextResponse.json({
      ok: true,
      rows: (items || []).map((i: any) => ({ ...i, periode: peta[i.periode_id] || null })),
      boleh_kirim: bolehKirim,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Gagal memuat' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await sesi(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const roles: string[] = session.roles || []
    if (!session.is_super_admin && !roles.some((r) => ROLE_HR.includes(r))) {
      return NextResponse.json({ error: 'Hanya HR yang boleh mengirim rekap' }, { status: 403 })
    }

    const body = await req.json()
    const bulan = String(body?.bulan || '').trim()
    const site = String(body?.site || session.site || '').trim()
    const pesan = String(body?.pesan || '').trim() || null
    const batas = String(body?.batas_konfirmasi || '').trim() || null
    const karyawan: any[] = Array.isArray(body?.karyawan) ? body.karyawan : []
    const ulangDari = String(body?.ulang_dari || '').trim() || null

    if (!bulan) return NextResponse.json({ error: 'Bulan wajib diisi' }, { status: 400 })
    if (!karyawan.length) return NextResponse.json({ error: 'Pilih minimal satu karyawan' }, { status: 400 })

    let versi = 1
    if (ulangDari) {
      const { data: lama } = await supabaseAdmin
        .from('rekap_periode').select('versi').eq('id', ulangDari).maybeSingle()
      versi = Number(lama?.versi || 1) + 1
    }

    const { data: periode, error: ePer } = await supabaseAdmin
      .from('rekap_periode')
      .insert({
        site, bulan, pesan_hr: pesan, batas_konfirmasi: batas,
        versi, parent_periode_id: ulangDari,
        dikirim_oleh: session.nrp, dikirim_nama: session.nama,
        dikirim_at: new Date().toISOString(), status: 'TERKIRIM',
      })
      .select().maybeSingle()
    if (ePer) return NextResponse.json({ error: ePer.message }, { status: 500 })

    const items = karyawan.map((k: any) => ({
      periode_id: periode.id,
      nrp: String(k.nrp),
      nama_karyawan: k.nama || null,
      departemen: k.departemen || null,
      jabatan: k.jabatan || null,
      ringkasan: k.ringkasan || null,
      jml_lembur: Number(k.jml_lembur || 0),
      nominal_lembur: Number(k.nominal_lembur || 0),
      total_lembur: Number(k.jml_lembur || 0) * Number(k.nominal_lembur || 0),
      jml_piket: Number(k.jml_piket || 0),
      nominal_piket: Number(k.nominal_piket || 0),
      total_piket: Number(k.jml_piket || 0) * Number(k.nominal_piket || 0),
      status: 'TERKIRIM',
    }))

    const { data: inserted, error: eItem } = await supabaseAdmin
      .from('rekap_item').insert(items).select('id, nrp')
    if (eItem) return NextResponse.json({ error: eItem.message }, { status: 500 })

    if (ulangDari) {
      const nrps = karyawan.map((k: any) => String(k.nrp))
      await supabaseAdmin.from('rekap_periode').update({ status: 'DIREVISI' }).eq('id', ulangDari)
      if (nrps.length) {
        await supabaseAdmin.from('rekap_item').update({ status: 'DIREVISI' })
          .eq('periode_id', ulangDari).in('nrp', nrps)
      }
    }

    const notif = (inserted || []).map((it: any) => ({
      nrp: it.nrp,
      title: 'Rekap Absensi ' + bulan + (versi > 1 ? ' (revisi ' + versi + ')' : ''),
      body: pesan || 'Mohon dicek dan dikonfirmasi.',
      icon: 'DOC',
      url: '/dashboard/rekap-saya?id=' + it.id,
      category: 'REKAP_ABSENSI',
      data: { rekap_item_id: it.id, bulan, batas_konfirmasi: batas },
    }))
    if (notif.length) await supabaseAdmin.from('notifications').insert(notif)

    return NextResponse.json({ ok: true, periode_id: periode.id, terkirim: items.length }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Gagal mengirim rekap' }, { status: 500 })
  }
}