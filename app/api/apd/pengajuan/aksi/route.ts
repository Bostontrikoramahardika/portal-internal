import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'

// SETUJUI / TOLAK PENGAJUAN APD
// Saat disetujui: catat apd_history (muncul di APD Saya) + kurangi apd_stok.

const ROLE_PENYETUJU = ['she_site', 'hr_site']

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

    const roles: string[] = session.roles || []
    const boleh = session.is_super_admin || roles.some((r) => ROLE_PENYETUJU.includes(r))
    if (!boleh) return NextResponse.json({ error: 'Hanya SHE Site atau HR Site yang boleh menyetujui' }, { status: 403 })

    const body = await req.json()
    const id = body?.id
    const aksi = String(body?.aksi || '').toUpperCase()
    const catatan = String(body?.catatan || '').trim() || null
    if (!id) return NextResponse.json({ error: 'ID pengajuan wajib diisi' }, { status: 400 })
    if (!['APPROVE', 'REJECT'].includes(aksi)) return NextResponse.json({ error: 'Aksi tidak dikenali' }, { status: 400 })

    const { data: req0 } = await supabaseAdmin.from('apd_requests').select('*').eq('id', id).maybeSingle()
    if (!req0) return NextResponse.json({ error: 'Pengajuan tidak ditemukan' }, { status: 404 })
    if (req0.status !== 'PENDING') return NextResponse.json({ error: 'Pengajuan sudah diproses' }, { status: 400 })
    if (!session.is_super_admin && session.site && req0.site && req0.site !== session.site) {
      return NextResponse.json({ error: 'Beda site, tidak berwenang' }, { status: 403 })
    }

    const sekarang = new Date().toISOString()
    const roleSetuju = roles.find((r) => ROLE_PENYETUJU.includes(r)) || 'super_admin'

    if (aksi === 'REJECT') {
      const { error } = await supabaseAdmin.from('apd_requests').update({
        status: 'REJECTED', approver_nrp: session.nrp, approver_nama: session.nama,
        approver_role: roleSetuju, approved_at: sekarang, catatan_approver: catatan,
      }).eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, status: 'REJECTED' })
    }

    const { data: master } = await supabaseAdmin.from('apd_master')
      .select('life_time_bulan').eq('jenis_apd', req0.jenis_apd).maybeSingle()

    const lifeTime = master?.life_time_bulan ?? null
    const tanggalTerima = sekarang.slice(0, 10)

    const { count } = await supabaseAdmin.from('apd_history')
      .select('id', { count: 'exact', head: true })
      .eq('nrp', req0.nrp).eq('jenis_apd', req0.jenis_apd)
    const penerimaanKe = (count || 0) + 1

    let prediksi: string | null = null
    if (lifeTime) {
      const d = new Date(tanggalTerima)
      d.setMonth(d.getMonth() + Number(lifeTime))
      prediksi = d.toISOString().slice(0, 10)
    }

    const { error: eHist } = await supabaseAdmin.from('apd_history').insert({
      nrp: req0.nrp,
      nama_karyawan: req0.nama_karyawan,
      jenis_apd: req0.jenis_apd,
      penerimaan_ke: penerimaanKe,
      tanggal_terima: tanggalTerima,
      ukuran: req0.ukuran || null,
      warna: req0.warna || null,
      jumlah: Number(req0.jumlah),
      life_time: lifeTime,
      prediksi_berikutnya: prediksi,
      keterangan: 'Dari pengajuan APD (' + String(req0.alasan || '-') + ') disetujui ' + String(session.nama),
      status: 'VERIFIED',
      input_source: 'PENGAJUAN',
      input_by: session.nrp,
      verified_by: session.nrp,
      verified_at: sekarang,
      created_by: session.nrp,
    })
    if (eHist) return NextResponse.json({ error: eHist.message }, { status: 500 })

    const { error: eStok } = await supabaseAdmin.from('apd_stok').insert({
      jenis_apd: req0.jenis_apd,
      ukuran: req0.ukuran || null,
      warna: req0.warna || null,
      qty: Number(req0.jumlah),
      tipe: 'keluar',
      tanggal: tanggalTerima,
      keterangan: 'Pengajuan APD ke ' + String(req0.nama_karyawan) + ' (' + String(req0.nrp) + ')',
      created_by: session.nrp,
    })
    if (eStok) return NextResponse.json({ error: eStok.message }, { status: 500 })

    const { error: eUpd } = await supabaseAdmin.from('apd_requests').update({
      status: 'APPROVED', approver_nrp: session.nrp, approver_nama: session.nama,
      approver_role: roleSetuju, approved_at: sekarang, catatan_approver: catatan,
    }).eq('id', id)
    if (eUpd) return NextResponse.json({ error: eUpd.message }, { status: 500 })

    return NextResponse.json({
      ok: true, status: 'APPROVED', tanggal_terima: tanggalTerima,
      jam: sekarang, penerimaan_ke: penerimaanKe, prediksi_berikutnya: prediksi,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Gagal memproses' }, { status: 500 })
  }
}