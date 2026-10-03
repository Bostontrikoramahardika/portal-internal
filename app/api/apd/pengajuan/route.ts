import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'

// PENGAJUAN APD
//  GET ?mode=saya | ?mode=inbox | ?cek=<jenis>
//  POST -> buat pengajuan baru
// Penyetuju: SHE Site atau HR Site pada site yang sama.

const ROLE_PENYETUJU = ['she_site', 'hr_site']

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
    const cek = searchParams.get('cek') || ''
    const nrp = String(session.nrp)
    const roles: string[] = session.roles || []
    const bolehSetujui = session.is_super_admin || roles.some((r) => ROLE_PENYETUJU.includes(r))

    if (cek) {
      const { data: master } = await supabaseAdmin
        .from('apd_master')
        .select('jenis_apd, life_time_bulan, ukuran_tersedia, warna_tersedia')
        .eq('jenis_apd', cek).maybeSingle()

      const { data: terakhir } = await supabaseAdmin
        .from('apd_history')
        .select('tanggal_terima, prediksi_berikutnya, jumlah')
        .eq('nrp', nrp).eq('jenis_apd', cek)
        .order('tanggal_terima', { ascending: false }).limit(1).maybeSingle()

      let belumHabis = false
      let sisaHari = 0
      if (terakhir?.prediksi_berikutnya) {
        const p = new Date(terakhir.prediksi_berikutnya)
        belumHabis = p.getTime() > Date.now()
        sisaHari = Math.ceil((p.getTime() - Date.now()) / 86400000)
      }

      return NextResponse.json({
        ok: true, jenis_apd: cek,
        life_time_bulan: master?.life_time_bulan ?? null,
        ukuran_tersedia: master?.ukuran_tersedia ?? null,
        warna_tersedia: master?.warna_tersedia ?? null,
        terakhir_terima: terakhir?.tanggal_terima ?? null,
        prediksi_berikutnya: terakhir?.prediksi_berikutnya ?? null,
        masa_pakai_belum_habis: belumHabis,
        sisa_hari: belumHabis ? sisaHari : 0,
      })
    }

    if (mode === 'inbox') {
      if (!bolehSetujui) return NextResponse.json({ ok: true, rows: [], boleh_setujui: false })
      let q = supabaseAdmin.from('apd_requests').select('*')
        .order('created_at', { ascending: false }).limit(200)
      if (!session.is_super_admin && session.site) q = q.eq('site', session.site)
      const { data, error } = await q
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, rows: data || [], boleh_setujui: true })
    }

    const { data, error } = await supabaseAdmin.from('apd_requests').select('*')
      .eq('nrp', nrp).order('created_at', { ascending: false }).limit(100)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, rows: data || [], boleh_setujui: bolehSetujui })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Gagal memuat' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await sesi(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const jenis_apd = String(body?.jenis_apd || '').trim()
    const jumlah = Number(body?.jumlah || 0)
    const alasan = String(body?.alasan || '').trim()

    if (!jenis_apd) return NextResponse.json({ error: 'Jenis APD wajib dipilih' }, { status: 400 })
    if (!jumlah || jumlah < 1) return NextResponse.json({ error: 'Jumlah minimal 1' }, { status: 400 })
    if (!alasan) return NextResponse.json({ error: 'Alasan wajib dipilih' }, { status: 400 })

    const nrp = String(session.nrp)
    const { data: emp } = await supabaseAdmin.from('employees')
      .select('nrp, nama, site, departemen, jabatan').eq('nrp', nrp).maybeSingle()

    const { data: terakhir } = await supabaseAdmin.from('apd_history')
      .select('prediksi_berikutnya').eq('nrp', nrp).eq('jenis_apd', jenis_apd)
      .order('tanggal_terima', { ascending: false }).limit(1).maybeSingle()

    const belumHabis = terakhir?.prediksi_berikutnya
      ? new Date(terakhir.prediksi_berikutnya).getTime() > Date.now() : false

    const { data, error } = await supabaseAdmin.from('apd_requests').insert({
      nrp,
      nama_karyawan: emp?.nama || session.nama || nrp,
      site: emp?.site || session.site || null,
      departemen: emp?.departemen || null,
      jenis_apd,
      ukuran: String(body?.ukuran || '').trim() || null,
      warna: String(body?.warna || '').trim() || null,
      jumlah, alasan,
      catatan: String(body?.catatan || '').trim() || null,
      masa_pakai_belum_habis: belumHabis,
      status: 'PENDING',
      created_by: nrp,
    }).select().maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, data, masa_pakai_belum_habis: belumHabis }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Gagal mengirim pengajuan' }, { status: 500 })
  }
}