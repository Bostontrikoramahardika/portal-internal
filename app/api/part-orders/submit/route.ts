import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabase'
import { requireAuth } from '@/app/lib/auth'

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const session = auth.session
  const body = await req.json()

  const { part_number, part_name, assembly_name, unit_code, machine_unit, qty, keterangan, prioritas } = body

  if (!part_number || !part_name || !unit_code || !machine_unit || !qty) {
    return NextResponse.json({ error: 'Field wajib tidak lengkap' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('part_orders')
    .insert({
      part_number,
      part_name,
      assembly_name: assembly_name || '',
      unit_code,
      machine_unit,
      qty: parseInt(qty),
      keterangan: keterangan || '',
      prioritas: prioritas || 'Normal',
      requester_id: null, // session pakai custom, bukan auth.users
      requester_nrp: session.nrp, // agar order baru muncul di daftar "My Orders"
      requester_name: session.nama || session.nrp,
      requester_role: session.primaryRole || 'karyawan',
      status: 'Pending'
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, data })
}