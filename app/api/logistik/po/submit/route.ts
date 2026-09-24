import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabase'
import { requireAuth } from '@/app/lib/auth'

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const session = auth.session
  const body = await req.json()
  const { vendor_code, site_code, catatan, items } = body

  if (!vendor_code || !items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Pilih Vendor dan minimal 1 item part' }, { status: 400 })
  }

  const site = site_code || session.site || 'HO Pusat'
  const ym = new Date().toISOString().slice(0, 7).replace('-', '')
  const randomDigit = Math.floor(1000 + Math.random() * 9000)
  const po_number = 'PO-BTM-' + ym + '-' + randomDigit

  let totalAmount = 0
  items.forEach((it: any) => {
    const q = parseInt(it.qty_ordered) || 1
    const p = parseFloat(it.unit_price) || 0
    totalAmount += (q * p)
  })

  // 1. Insert PO Header
  const { data: poData, error: poErr } = await supabaseAdmin
    .from('purchase_orders')
    .insert({
      po_number,
      vendor_code,
      site_code: site,
      status: 'SENT',
      total_amount: totalAmount,
      catatan: catatan || '',
      created_by_nrp: session.nrp,
      created_by_name: session.nama || session.nrp,
      created_at: new Date().toISOString()
    })
    .select()
    .single()

  if (poErr) {
    return NextResponse.json({ error: 'Gagal membuat PO: ' + poErr.message }, { status: 500 })
  }

  // 2. Insert PO Items
  const poItemsPayload = items.map((it: any) => {
    const q = parseInt(it.qty_ordered) || 1
    const p = parseFloat(it.unit_price) || 0
    return {
      po_id: poData.id,
      part_number: String(it.part_number).trim().toUpperCase(),
      qty_ordered: q,
      qty_received: 0,
      unit_price: p,
      total_price: (q * p),
      created_at: new Date().toISOString()
    }
  })

  const { error: itemsErr } = await supabaseAdmin
    .from('po_items')
    .insert(poItemsPayload)

  if (itemsErr) {
    return NextResponse.json({ error: 'Gagal menyimpan detail PO item: ' + itemsErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, po_number, po: poData })
}