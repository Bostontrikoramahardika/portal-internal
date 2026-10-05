import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'

// JAWABAN KARYAWAN ATAS REKAP ABSENSI: SETUJU | PROTES

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

    const body = await req.json()
    const id = body?.id
    const aksi = String(body?.aksi || '').toUpperCase()
    const catatan = String(body?.catatan || '').trim() || null

    if (!id) return NextResponse.json({ error: 'id wajib' }, { status: 400 })
    if (!['SETUJU', 'PROTES'].includes(aksi)) {
      return NextResponse.json({ error: 'Aksi tidak dikenali' }, { status: 400 })
    }
    if (aksi === 'PROTES' && !catatan) {
      return NextResponse.json({ error: 'Tuliskan bagian mana yang salah' }, { status: 400 })
    }

    const { data: item } = await supabaseAdmin
      .from('rekap_item').select('*').eq('id', id).maybeSingle()
    if (!item) return NextResponse.json({ error: 'Rekap tidak ditemukan' }, { status: 404 })
    if (String(item.nrp) !== String(session.nrp)) {
      return NextResponse.json({ error: 'Bukan rekap Anda' }, { status: 403 })
    }
    if (item.status === 'SETUJU') {
      return NextResponse.json({ error: 'Rekap ini sudah Anda setujui' }, { status: 400 })
    }

    const sekarang = new Date().toISOString()
    const { error } = await supabaseAdmin
      .from('rekap_item')
      .update({ status: aksi, respon_at: sekarang, catatan_karyawan: catatan })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (aksi === 'SETUJU') {
      await supabaseAdmin.from('notifications')
        .update({ read_at: sekarang })
        .eq('nrp', session.nrp).eq('category', 'REKAP_ABSENSI').is('read_at', null)
    }

    if (aksi === 'PROTES') {
      const { data: periode } = await supabaseAdmin
        .from('rekap_periode').select('dikirim_oleh, bulan').eq('id', item.periode_id).maybeSingle()
      if (periode?.dikirim_oleh) {
        await supabaseAdmin.from('notifications').insert({
          nrp: periode.dikirim_oleh,
          title: 'Koreksi rekap ' + String(periode.bulan || ''),
          body: String(item.nama_karyawan || item.nrp) + ': ' + String(catatan).slice(0, 120),
          icon: 'WARN',
          url: '/dashboard/kirim-rekap',
          category: 'REKAP_PROTES',
          data: { rekap_item_id: id },
        })
      }
    }

    return NextResponse.json({ ok: true, status: aksi })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Gagal menyimpan jawaban' }, { status: 500 })
  }
}