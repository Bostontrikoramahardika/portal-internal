import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabase'
import { requireAuth } from '@/app/lib/auth'

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const session = auth.session
  const body = await req.json()

  const { unit_code, site_code, prioritas, keterangan, items } = body

  if (!unit_code || !items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Kode unit dan minimal 1 item part wajib diisi' }, { status: 400 })
  }

  const site = site_code || session.site || 'PPA-MLP'
  const ym = new Date().toISOString().slice(0, 7).replace('-', '')
  const randomDigit = Math.floor(1000 + Math.random() * 9000)
  const pr_number = 'PR-' + site.toUpperCase().replace(/[^A-Z0-9]/g, '') + '-' + ym + '-' + randomDigit

  // 1. Insert PR Header
  const { data: prData, error: prErr } = await supabaseAdmin
    .from('purchase_requisitions')
    .insert({
      pr_number,
      requester_nrp: session.nrp,
      requester_name: session.nama || session.nrp,
      requester_role: session.primaryRole || 'karyawan',
      site_code: site,
      unit_code: String(unit_code).trim().toUpperCase(),
      prioritas: prioritas || 'NORMAL',
      keterangan: keterangan || '',
      status: 'PENDING_GL_PLANT',
      created_at: new Date().toISOString()
    })
    .select()
    .single()

  if (prErr) {
    return NextResponse.json({ error: 'Gagal membuat tiket PR: ' + prErr.message }, { status: 500 })
  }

  // 2. Insert PR Items
  const itemsPayload = items.map((item: any) => ({
    pr_id: prData.id,
    part_number: String(item.part_number).trim().toUpperCase(),
    part_name: String(item.part_name).trim(),
    qty_request: parseInt(item.qty_request) || 1,
    qty_approved: parseInt(item.qty_request) || 1,
    qty_fulfilled: 0,
    satuan: item.satuan || 'Pcs',
    keterangan: item.keterangan || '',
    created_at: new Date().toISOString()
  }))

  const { error: itemsErr } = await supabaseAdmin
    .from('pr_items')
    .insert(itemsPayload)

  if (itemsErr) {
    return NextResponse.json({ error: 'Gagal menyimpan detail part: ' + itemsErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, pr_number, pr: prData })
}