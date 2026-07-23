import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'

const RESIGN_ROLES = ['super_admin','hr_ho','hr_site','pjo_site']

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const session = auth.session

  const canResign = session.is_super_admin || RESIGN_ROLES.includes(session.role)
  if (!canResign) {
    return NextResponse.json({ error: 'Tidak punya izin' }, { status: 403 })
  }

  const body = await req.json()
  const { nrp, tanggal_resign, alasan_resign } = body

  if (!nrp || !tanggal_resign) {
    return NextResponse.json({ error: 'NRP dan tanggal resign wajib' }, { status: 400 })
  }

  // Cek scope
  if (['hr_site','pjo_site'].includes(session.role)) {
    const { data: emp } = await supabaseAdmin
      .from('employees').select('site').eq('nrp', nrp).single()
    if (!emp || emp.site !== session.site) {
      return NextResponse.json({ error: 'Karyawan bukan site Anda' }, { status: 403 })
    }
  }

  const { error } = await supabaseAdmin
    .from('employees')
    .update({
      status_karyawan: 'Resign',
      tanggal_resign,
      alasan_resign: alasan_resign || null,
      resign_by: session.nrp,
      updated_at: new Date().toISOString()
    })
    .eq('nrp', nrp)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    message: `Karyawan ${nrp} berhasil di-set Resign per ${tanggal_resign}`
  })
}

// Batalkan resign (aktifkan kembali)
export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const session = auth.session

  if (!session.is_super_admin && !['hr_ho','hr_site','pjo_site'].includes(session.role)) {
    return NextResponse.json({ error: 'Tidak punya izin' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const nrp = searchParams.get('nrp')
  if (!nrp) return NextResponse.json({ error: 'NRP wajib' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('employees')
    .update({
      status_karyawan: 'Aktif',
      tanggal_resign: null,
      alasan_resign: null,
      resign_by: null,
      updated_at: new Date().toISOString()
    })
    .eq('nrp', nrp)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, message: 'Karyawan diaktifkan kembali' })
}