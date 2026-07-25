// app/api/apd/master/route.ts — v1.0
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'

// ═══ GET — List semua master APD ═══
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const activeOnly = searchParams.get('active_only') === 'true'

  let query = supabaseAdmin
    .from('apd_master')
    .select('*')
    .order('urutan', { ascending: true })

  if (activeOnly) query = query.eq('active', true)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, data })
}

// ═══ POST — Tambah jenis APD baru ═══
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const session: any = auth.session!
  const userRoles: string[] = Array.isArray(session.roles) ? session.roles : []
  const role: string = userRoles[0] || 'employee'

  // Hanya HR/SHE/Super Admin yang boleh
  const allowed = ['super_admin', 'hr_ho', 'hr_site', 'she_site', 'spv_she_ho']
  if (!allowed.some(r => userRoles.includes(r))) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  const body = await req.json()
  const {
    jenis_apd,
    life_time_bulan,
    ukuran_tersedia,
    warna_tersedia,
    icon,
    urutan,
    keterangan
  } = body

  if (!jenis_apd || !life_time_bulan) {
    return NextResponse.json({ error: 'jenis_apd dan life_time_bulan wajib diisi' }, { status: 400 })
  }

  // Cek duplikat
  const { data: existing } = await supabaseAdmin
    .from('apd_master')
    .select('id')
    .eq('jenis_apd', jenis_apd.trim())
    .single()

  if (existing) {
    return NextResponse.json({ error: `Jenis APD "${jenis_apd}" sudah ada` }, { status: 409 })
  }

  // Ambil urutan max kalau tidak diisi
  let finalUrutan = urutan
  if (!finalUrutan) {
    const { data: maxRow } = await supabaseAdmin
      .from('apd_master')
      .select('urutan')
      .order('urutan', { ascending: false })
      .limit(1)
      .single()
    finalUrutan = (maxRow?.urutan || 0) + 1
  }

  const { data, error } = await supabaseAdmin
    .from('apd_master')
    .insert({
      jenis_apd: jenis_apd.trim(),
      life_time_bulan: Number(life_time_bulan),
      ukuran_tersedia: ukuran_tersedia || [],
      warna_tersedia: warna_tersedia || [],
      icon: icon || '🦺',
      urutan: finalUrutan,
      active: true,
      keterangan: keterangan || null,
      created_by: session.nrp
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, data })
}

// ═══ PUT — Update jenis APD ═══
export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const session: any = auth.session!
  const userRoles: string[] = Array.isArray(session.roles) ? session.roles : []

  const allowed = ['super_admin', 'hr_ho', 'hr_site', 'she_site', 'spv_she_ho']
  if (!allowed.some(r => userRoles.includes(r))) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  const body = await req.json()
  const { id, jenis_apd, life_time_bulan, ukuran_tersedia, warna_tersedia, icon, urutan, active, keterangan } = body

  if (!id) return NextResponse.json({ error: 'id wajib diisi' }, { status: 400 })

  // Cek duplikat nama (kecuali diri sendiri)
  if (jenis_apd) {
    const { data: existing } = await supabaseAdmin
      .from('apd_master')
      .select('id')
      .eq('jenis_apd', jenis_apd.trim())
      .neq('id', id)
      .single()

    if (existing) {
      return NextResponse.json({ error: `Jenis APD "${jenis_apd}" sudah ada` }, { status: 409 })
    }
  }

  const updateData: any = { updated_by: session.nrp, updated_at: new Date().toISOString() }
  if (jenis_apd !== undefined) updateData.jenis_apd = jenis_apd.trim()
  if (life_time_bulan !== undefined) updateData.life_time_bulan = Number(life_time_bulan)
  if (ukuran_tersedia !== undefined) updateData.ukuran_tersedia = ukuran_tersedia
  if (warna_tersedia !== undefined) updateData.warna_tersedia = warna_tersedia
  if (icon !== undefined) updateData.icon = icon
  if (urutan !== undefined) updateData.urutan = Number(urutan)
  if (active !== undefined) updateData.active = active
  if (keterangan !== undefined) updateData.keterangan = keterangan

  const { data, error } = await supabaseAdmin
    .from('apd_master')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, data })
}

// ═══ DELETE — Nonaktifkan (soft delete via active=false) ═══
export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const session: any = auth.session!
  const userRoles: string[] = Array.isArray(session.roles) ? session.roles : []

  const allowed = ['super_admin', 'hr_ho', 'hr_site', 'she_site', 'spv_she_ho']
  if (!allowed.some(r => userRoles.includes(r))) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'id wajib diisi' }, { status: 400 })

  // Cek apakah ada history yang pakai jenis ini
  const { data: master } = await supabaseAdmin
    .from('apd_master')
    .select('jenis_apd')
    .eq('id', id)
    .single()

  if (!master) return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 })

  const { count } = await supabaseAdmin
    .from('apd_history')
    .select('id', { count: 'exact', head: true })
    .eq('jenis_apd', master.jenis_apd)

  if (count && count > 0) {
    // Soft delete — nonaktifkan saja
    const { error } = await supabaseAdmin
      .from('apd_master')
      .update({ active: false, updated_by: session.nrp, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, message: `APD dinonaktifkan (ada ${count} history)` })
  }

  // Hard delete kalau belum ada history
  const { error } = await supabaseAdmin
    .from('apd_master')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, message: 'APD dihapus permanen' })
}