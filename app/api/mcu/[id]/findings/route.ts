// app/api/mcu/[id]/findings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'

// GET: List temuan per MCU
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from('mcu_findings')
    .select('*')
    .eq('mcu_id', id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, data: data || [] })
}

// POST: Tambah temuan baru
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const session = auth.session!
  const { id } = await params

  const editRoles = ['super_admin','hr_site','she_site','pjo_site']
  const userRoles: string[] = session.roles || []
  if (!userRoles.some(r => editRoles.includes(r))) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  const body = await req.json()
  const { jenis_temuan, keterangan_temuan } = body

  if (!jenis_temuan) return NextResponse.json({ error: 'Jenis temuan wajib diisi' }, { status: 400 })

  // Ambil nrp dari MCU
  const { data: mcu } = await supabaseAdmin.from('mcu').select('nrp').eq('id', id).single()
  if (!mcu) return NextResponse.json({ error: 'MCU tidak ditemukan' }, { status: 404 })

  const { data: finding, error } = await supabaseAdmin
    .from('mcu_findings')
    .insert({
      mcu_id: id,
      nrp: mcu.nrp,
      jenis_temuan,
      keterangan_temuan,
      status_followup: 'BELUM_FU',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update status_mcu & butuh_followup di tabel mcu
  await supabaseAdmin
    .from('mcu')
    .update({ status_mcu: 'OPEN', butuh_followup: true, updated_by: session.nrp })
    .eq('id', id)

  // Audit log
  await supabaseAdmin.from('mcu_audit_log').insert({
    mcu_id: id,
    finding_id: finding.id,
    action: 'ADD_FINDING',
    actor_nrp: session.nrp,
    actor_name: session.nama,
    actor_role: userRoles[0],
    after_data: finding,
    note: `Tambah temuan: ${jenis_temuan}`,
  })

  return NextResponse.json({ ok: true, data: finding })
}

// DELETE: Hapus temuan
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const session = auth.session!
  const { id } = await params

  const { searchParams } = new URL(req.url)
  const findingId = searchParams.get('findingId')
  if (!findingId) return NextResponse.json({ error: 'findingId required' }, { status: 400 })

  const editRoles = ['super_admin','hr_site','she_site','pjo_site']
  const userRoles: string[] = session.roles || []
  if (!userRoles.some(r => editRoles.includes(r))) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  const { data: finding } = await supabaseAdmin
    .from('mcu_findings')
    .select('jenis_temuan')
    .eq('id', findingId)
    .single()

  await supabaseAdmin.from('mcu_findings').delete().eq('id', findingId)

  // Cek apakah masih ada temuan lain
  const { count } = await supabaseAdmin
    .from('mcu_findings')
    .select('id', { count: 'exact' })
    .eq('mcu_id', id)

  if (!count || count === 0) {
    await supabaseAdmin
      .from('mcu')
      .update({ status_mcu: 'FIT', butuh_followup: false, updated_by: session.nrp })
      .eq('id', id)
  }

  await supabaseAdmin.from('mcu_audit_log').insert({
    mcu_id: id,
    action: 'DELETE_FINDING',
    actor_nrp: session.nrp,
    actor_name: session.nama,
    actor_role: userRoles[0],
    note: `Hapus temuan: ${finding?.jenis_temuan}`,
  })

  return NextResponse.json({ ok: true })
}