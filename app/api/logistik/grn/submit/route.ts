import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabase'
import { requireAuth } from '@/app/lib/auth'

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const session = auth.session
  const body = await req.json()
  const { po_id, warehouse_code, surat_jalan_no, catatan, items } = body

  if (!warehouse_code || !items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Gudang tujuan dan minimal 1 item fisik wajib diisi' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const ym = now.slice(0, 7).replace('-', '')
  const randomDigit = Math.floor(1000 + Math.random() * 9000)
  const grn_number = 'GRN-' + warehouse_code.replace(/[^A-Z0-9]/g, '') + '-' + ym + '-' + randomDigit

  // 1. Insert GRN Header
  const { data: grnData, error: grnErr } = await supabaseAdmin
    .from('goods_receipts')
    .insert({
      grn_number,
      po_id: po_id || null,
      warehouse_code,
      surat_jalan_no: surat_jalan_no || '',
      received_by: session.nrp,
      received_name: session.nama || session.nrp,
      received_at: now,
      catatan: catatan || '',
      created_at: now
    })
    .select()
    .single()

  if (grnErr) {
    return NextResponse.json({ error: 'Gagal membuat GRN: ' + grnErr.message }, { status: 500 })
  }

  // 2. Insert GRN Items & INFLOW STOK FISIK + KARTU STOK
  for (const it of items) {
    const partNumber = String(it.part_number).trim().toUpperCase()
    const qtyIn = parseInt(it.qty_received) || 0
    if (qtyIn <= 0) continue

    // Simpan detail item GRN
    await supabaseAdmin
      .from('grn_items')
      .insert({
        grn_id: grnData.id,
        part_number: partNumber,
        qty_received: qtyIn,
        created_at: now
      })

    // Ambil saldo stok saat ini
    const { data: curStock } = await supabaseAdmin
      .from('stock_barang')
      .select('qty_tersedia')
      .eq('warehouse_code', warehouse_code)
      .eq('part_number', partNumber)
      .maybeSingle()

    const qtyBefore = curStock ? curStock.qty_tersedia : 0
    const qtyAfter = qtyBefore + qtyIn

    // Upsert Stok Barang (+qty)
    await supabaseAdmin
      .from('stock_barang')
      .upsert({
        warehouse_code,
        part_number: partNumber,
        qty_tersedia: qtyAfter,
        last_movement_at: now,
        updated_at: now
      }, { onConflict: 'warehouse_code,part_number' })

    // Catat Kartu Mutasi Stok Masuk (IN)
    await supabaseAdmin
      .from('stock_movements')
      .insert({
        warehouse_code,
        part_number: partNumber,
        movement_type: 'IN',
        reference_type: po_id ? 'GRN_PO' : 'GRN_DIRECT',
        reference_id: grn_number,
        qty_change: qtyIn,
        qty_before: qtyBefore,
        qty_after: qtyAfter,
        actor_nrp: session.nrp,
        actor_nama: session.nama || session.nrp,
        keterangan: 'Penerimaan barang Surat Jalan: ' + (surat_jalan_no || '-') + (po_id ? ' (Ref PO ID: ' + po_id + ')' : ''),
        created_at: now
      })

    // Update Qty Received pada PO Item jika terhubung ke PO
    if (po_id) {
      const { data: poItem } = await supabaseAdmin
        .from('po_items')
        .select('id, qty_received, qty_ordered')
        .eq('po_id', po_id)
        .eq('part_number', partNumber)
        .maybeSingle()

      if (poItem) {
        const newQtyRec = (poItem.qty_received || 0) + qtyIn
        await supabaseAdmin
          .from('po_items')
          .update({ qty_received: newQtyRec })
          .eq('id', poItem.id)
      }
    }
  }

  // 3. Update Status PO (jika ada PO terkait)
  if (po_id) {
    const { data: allPoItems } = await supabaseAdmin
      .from('po_items')
      .select('qty_ordered, qty_received')
      .eq('po_id', po_id)

    if (allPoItems && allPoItems.length > 0) {
      const isAllReceived = allPoItems.every(i => (i.qty_received || 0) >= (i.qty_ordered || 1))
      await supabaseAdmin
        .from('purchase_orders')
        .update({
          status: isAllReceived ? 'RECEIVED' : 'PARTIAL',
          updated_at: now
        })
        .eq('id', po_id)
    }
  }

  return NextResponse.json({ success: true, grn_number, grn: grnData })
}