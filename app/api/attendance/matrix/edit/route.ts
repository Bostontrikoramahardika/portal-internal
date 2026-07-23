import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'

const EDIT_ROLES = ['super_admin','hr_site','pjo_site','gl_produksi','gl_plant']

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const session = auth.session

  const canEdit = session.is_super_admin || EDIT_ROLES.includes(session.role)
  if (!canEdit) {
    return NextResponse.json({ error: 'Tidak punya izin edit' }, { status: 403 })
  }

  const body = await req.json()
  const { nrp, tanggal, roster_shift, status, clock_in, clock_out, shift, keterangan } = body

  if (!nrp || !tanggal) {
    return NextResponse.json({ error: 'NRP dan tanggal wajib' }, { status: 400 })
  }

  // Cek scope
  if (['hr_site','pjo_site'].includes(session.role)) {
    const { data: emp } = await supabaseAdmin
      .from('employees').select('site').eq('nrp', nrp).single()
    if (!emp || emp.site !== session.site) {
      return NextResponse.json({ error: 'Karyawan bukan site Anda' }, { status: 403 })
    }
  }

  if (['gl_plant','gl_produksi'].includes(session.role)) {
    const { data: bawahan } = await supabaseAdmin
      .from('approval_matrix').select('employee_nrp')
      .eq('approver_nrp', session.nrp).eq('employee_nrp', nrp).limit(1)
    if (!bawahan || bawahan.length === 0) {
      return NextResponse.json({ error: 'Karyawan bukan bawahan Anda' }, { status: 403 })
    }
  }

  let updated: any = {}

  // 1. Update roster
  if (roster_shift !== undefined) {
    const { data: existing } = await supabaseAdmin
      .from('rosters').select('*')
      .eq('nrp', nrp).eq('tanggal', tanggal).limit(1)

    if (existing && existing.length > 0) {
      await supabaseAdmin
        .from('rosters')
        .update({ shift_code: roster_shift })
        .eq('nrp', nrp).eq('tanggal', tanggal)
    } else {
      const periode = new Date(tanggal).toLocaleDateString('id-ID', {
        month: 'long', year: 'numeric'
      }).toUpperCase()
      await supabaseAdmin.from('rosters').insert({
        nrp, tanggal, shift_code: roster_shift, periode
      })
    }
    updated.roster = roster_shift
  }

  // 2. Update attendance
  if (status !== undefined || clock_in !== undefined || clock_out !== undefined) {
    const { data: existing } = await supabaseAdmin
      .from('attendance').select('*')
      .eq('nrp', nrp).eq('tanggal', tanggal).limit(1)

    // Hitung jam kerja & terlambat
    let jam_kerja_menit = 0
    let terlambat_menit = 0
    if (clock_in && clock_out) {
      const cIn  = new Date(clock_in).getTime()
      const cOut = new Date(clock_out).getTime()
      jam_kerja_menit = Math.floor((cOut - cIn) / 60000)
    }

    // Ambil site dari employee
    const { data: emp } = await supabaseAdmin
      .from('employees').select('site').eq('nrp', nrp).single()

    const payload: any = {
      nrp,
      tanggal,
      site: emp?.site || null,
      updated_at: new Date().toISOString()
    }
    if (status !== undefined)    payload.status = status
    if (clock_in !== undefined)  payload.clock_in = clock_in
    if (clock_out !== undefined) payload.clock_out = clock_out
    if (shift !== undefined)     payload.shift = shift
    if (keterangan !== undefined) payload.keterangan = keterangan
    if (jam_kerja_menit > 0)     payload.jam_kerja_menit = jam_kerja_menit
    if (terlambat_menit > 0)     payload.terlambat_menit = terlambat_menit

    if (existing && existing.length > 0) {
      await supabaseAdmin
        .from('attendance').update(payload)
        .eq('nrp', nrp).eq('tanggal', tanggal)
    } else {
      await supabaseAdmin.from('attendance').insert(payload)
    }
    updated.attendance = payload
  }

  // 3. Log
  const keteranganBaru = `[Kelola by ${session.nrp} @ ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' })}] ${keterangan || ''}`.trim()

  return NextResponse.json({
    ok: true,
    message: 'Berhasil diupdate',
    updated,
    logged_by: session.nrp
  })
}