import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'

// NOMINAL REKAP — dipakai halaman "Susun & Kirim" supaya isian nominal
// tidak kembali kosong saat membuka bulan baru.
// Sumber: rekap yang TERAKHIR dikirim (bulan sebelumnya, atau versi
// terakhir di bulan yang sama).
//
// GET ?bulan=YYYY-MM

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
    const roles: string[] = session.roles || []
    if (!session.is_super_admin && !roles.some((r) => ROLE_HR.includes(r))) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const bulan = String(searchParams.get('bulan') || '').trim()
    if (!/^\d{4}-\d{2}$/.test(bulan)) {
      return NextResponse.json({ error: 'bulan wajib (YYYY-MM)' }, { status: 400 })
    }

    // periode terakhir pada bulan ini atau sebelumnya
    const { data: periode } = await supabaseAdmin
      .from('rekap_periode')
      .select('id, bulan, versi, dikirim_at, pesan_hr, batas_konfirmasi')
      .lte('bulan', bulan)
      .order('bulan', { ascending: false })
      .order('versi', { ascending: false })
      .order('dikirim_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!periode) {
      return NextResponse.json({ ok: true, ada: false, items: {}, pesan: null, batas: null })
    }

    const { data: items } = await supabaseAdmin
      .from('rekap_item')
      .select('nrp, nominal_lembur, nominal_piket, jml_lembur, jml_piket')
      .eq('periode_id', periode.id)

    const map: Record<string, any> = {}
    ;(items || []).forEach((it: any) => {
      const nrp = String(it.nrp || '')
      if (!nrp) return
      map[nrp] = {
        lembur: Number(it.nominal_lembur || 0),
        piket: Number(it.nominal_piket || 0),
        jmlLembur: Number(it.jml_lembur || 0),
        jmlPiket: Number(it.jml_piket || 0),
      }
    })

    const samaBulan = String(periode.bulan) === bulan
    return NextResponse.json({
      ok: true,
      ada: Object.keys(map).length > 0,
      items: map,
      pesan: periode.pesan_hr || null,
      batas: periode.batas_konfirmasi || null,
      sumber: periode.bulan,
      versi: periode.versi,
      sama_bulan: samaBulan,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Gagal baca nominal' }, { status: 500 })
  }
}
