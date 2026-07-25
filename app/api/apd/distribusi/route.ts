// app/api/apd/distribusi/route.ts — v1.1 (fix: emp.name → emp.nama)
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'
import { getWitaToday } from '@/app/lib/timezone'

// ═══ GET — Riwayat distribusi (filter by nrp/jenis/bulan) ═══
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const session: any = auth.session!
  const userRoles: string[] = Array.isArray(session.roles) ? session.roles : []

  const allowed = ['super_admin', 'hr_ho', 'hr_site', 'she_site', 'spv_she_ho', 'pjo_site', 'manager_ops']
  if (!allowed.some(r => userRoles.includes(r))) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const nrp = searchParams.get('nrp')
  const jenis = searchParams.get('jenis')
  const bulan = searchParams.get('bulan') // format: "2026-07"
  const limit = Number(searchParams.get('limit') || '100')

  let query = supabaseAdmin
    .from('apd_history')
    .select(`
      id, nrp, nama_karyawan, jenis_apd, penerimaan_ke,
      tanggal_terima, ukuran, jumlah, warna, life_time,
      prediksi_berikutnya, expired_at, keterangan,
      status, input_source, input_by, verified_by, verified_at
    `)
    .eq('input_source', 'HR')
    .order('tanggal_terima', { ascending: false })
    .limit(limit)

  if (nrp) query = query.eq('nrp', nrp)
  if (jenis) query = query.eq('jenis_apd', jenis)
  if (bulan) {
    const [y, m] = bulan.split('-')
    const start = `${y}-${m}-01`
    const lastDay = new Date(Number(y), Number(m), 0).getDate()
    const end = `${y}-${m}-${String(lastDay).padStart(2, '0')}`
    query = query.gte('tanggal_terima', start).lte('tanggal_terima', end)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, data })
}

// ═══ POST — HR distribusi langsung (VERIFIED + kurangi stok) ═══
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const session: any = auth.session!
  const userRoles: string[] = Array.isArray(session.roles) ? session.roles : []

  const allowed = ['super_admin', 'hr_ho', 'hr_site', 'she_site', 'spv_she_ho']
  if (!allowed.some(r => userRoles.includes(r))) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  const body = await req.json()
  const { distribusi, tanggal, kurangi_stok, keterangan } = body
  // distribusi: [{ nrp, jenis_apd, ukuran, warna, jumlah }]
  // kurangi_stok: boolean (default true)

  if (!distribusi || !Array.isArray(distribusi) || distribusi.length === 0) {
    return NextResponse.json({ error: 'distribusi wajib diisi' }, { status: 400 })
  }

  const today = getWitaToday()
  const tanggalFinal = tanggal || today
  const doKurangiStok = kurangi_stok !== false

  const results: any[] = []
  const errors: any[] = []

  for (const item of distribusi) {
    const { nrp, jenis_apd, ukuran, warna, jumlah } = item

    if (!nrp || !jenis_apd || !jumlah) {
      errors.push({ item, error: 'nrp, jenis_apd, jumlah wajib diisi' })
      continue
    }

    // ═══ Ambil data karyawan ═══
    const { data: emp } = await supabaseAdmin
      .from('employees')
      .select('nama, site')
      .eq('nrp', nrp)
      .single()

    if (!emp) {
      errors.push({ item, error: `NRP ${nrp} tidak ditemukan` })
      continue
    }

    // ═══ Ambil master APD untuk life_time ═══
    const { data: master } = await supabaseAdmin
      .from('apd_master')
      .select('life_time_bulan')
      .eq('jenis_apd', jenis_apd)
      .single()

    const lifeTime = master?.life_time_bulan || 12

    // ═══ Hitung penerimaan_ke ═══
    const { count: penerimaanCount } = await supabaseAdmin
      .from('apd_history')
      .select('id', { count: 'exact', head: true })
      .eq('nrp', nrp)
      .eq('jenis_apd', jenis_apd)
      .eq('status', 'VERIFIED')

    const penerimaanKe = (penerimaanCount || 0) + 1

    // ═══ Hitung prediksi berikutnya ═══
    const tglTerima = new Date(tanggalFinal)
    const prediksi = new Date(tglTerima)
    prediksi.setMonth(prediksi.getMonth() + lifeTime)
    const prediksiStr = prediksi.toISOString().split('T')[0]

    // ═══ Insert ke apd_history (VERIFIED langsung) ═══
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('apd_history')
      .insert({
        nrp,
        nama_karyawan: emp.nama,
        jenis_apd,
        penerimaan_ke: penerimaanKe,
        tanggal_terima: tanggalFinal,
        ukuran: ukuran || null,
        warna: warna || null,
        jumlah: Number(jumlah),
        life_time: lifeTime,
        prediksi_berikutnya: prediksiStr,
        keterangan: keterangan || null,
        status: 'VERIFIED',
        input_source: 'HR',
        input_by: session.nrp,
        verified_by: session.nrp,
        verified_at: new Date().toISOString(),
        created_by: session.nrp
      })
      .select()
      .single()

    if (insertError) {
      errors.push({ item, error: insertError.message })
      continue
    }

    // ═══ Kurangi stok (kalau doKurangiStok) ═══
    if (doKurangiStok) {
      await supabaseAdmin.from('apd_stok').insert({
        jenis_apd,
        ukuran: ukuran || null,
        warna: warna || null,
        qty: Number(jumlah),
        tipe: 'keluar',
        tanggal: tanggalFinal,
        keterangan: `Distribusi ke ${emp.nama} (${nrp})`,
        ref_id: inserted.id,
        ref_type: 'distribusi',
        created_by: session.nrp
      })
    }

    results.push(inserted)
  }

  return NextResponse.json({
    ok: true,
    inserted: results.length,
    errors: errors.length > 0 ? errors : undefined,
    data: results
  })
}