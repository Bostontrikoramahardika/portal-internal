import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabase'
import { requireAuth } from '@/app/lib/auth'

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const session = auth.session
  const body = await req.json()
  const { pr_id, action, assigned_warehouse_code, do_number, rejected_reason } = body

  if (!pr_id || !action) {
    return NextResponse.json({ error: 'pr_id dan action wajib disertakan' }, { status: 400 })
  }

  const { data: pr, error: fetchErr } = await supabaseAdmin
    .from('purchase_requisitions')
    .select('*, pr_items (*)')
    .eq('id', pr_id)
    .single()

  if (fetchErr || !pr) {
    return NextResponse.json({ error: 'Data PR tidak ditemukan' }, { status: 404 })
  }

  const now = new Date().toISOString()
  let updatePayload: any = { updated_at: now }

  // 1. APPROVE STAGE 1: GL PLANT
  if (action === 'APPROVE_GL_PLANT') {
    updatePayload.status = 'PENDING_PJO'
    updatePayload.approved_gl_plant_by = session.nrp
    updatePayload.approved_gl_plant_name = session.nama || session.nrp
    updatePayload.approved_gl_plant_at = now
  }

  // 2. APPROVE STAGE 2: PJO SITE
  else if (action === 'APPROVE_PJO') {
    updatePayload.status = 'PENDING_HO'
    updatePayload.approved_pjo_by = session.nrp
    updatePayload.approved_pjo_name = session.nama || session.nrp
    updatePayload.approved_pjo_at = now
  }

  // 3. APPROVE STAGE 3: HO LOGISTIK (Assign Gudang)
  else if (action === 'APPROVE_HO') {
    if (!assigned_warehouse_code) {
      return NextResponse.json({ error: 'HO Logistik wajib menentukan Gudang Pemenuhan' }, { status: 400 })
    }
    updatePayload.status = 'APPROVED_READY_ISSUE'
    updatePayload.assigned_warehouse_code = assigned_warehouse_code
    updatePayload.approved_ho_by = session.nrp
    updatePayload.approved_ho_name = session.nama || session.nrp
    updatePayload.approved_ho_at = now
  }

  // 4. STAGE 4: GUDANG ISSUE / FULFILLMENT (Pengeluaran Barang & Potong Stok)
  else if (action === 'FULFILL_WAREHOUSE') {
    const whCode = pr.assigned_warehouse_code || assigned_warehouse_code
    if (!whCode) {
      return NextResponse.json({ error: 'Gudang pengeluaran belum ditentukan' }, { status: 400 })
    }

    updatePayload.status = 'FULFILLED'
    updatePayload.fulfilled_by = session.nrp
    updatePayload.fulfilled_name = session.nama || session.nrp
    updatePayload.fulfilled_at = now
    updatePayload.do_number = do_number || ('DO-' + Date.now())

    // Eksekusi potong stok fisik dan catat kartu stok untuk setiap item
    if (pr.pr_items && pr.pr_items.length > 0) {
      for (const itm of pr.pr_items) {
        const qtyOut = itm.qty_approved || itm.qty_request || 1

        // Ambil saldo saat ini
        const { data: curStock } = await supabaseAdmin
          .from('stock_barang')
          .select('qty_tersedia')
          .eq('warehouse_code', whCode)
          .eq('part_number', itm.part_number)
          .maybeSingle()

        const qtyBefore = curStock ? curStock.qty_tersedia : 0
        const qtyAfter = Math.max(0, qtyBefore - qtyOut)

        // Upsert stok barang
        await supabaseAdmin
          .from('stock_barang')
          .upsert({
            warehouse_code: whCode,
            part_number: itm.part_number,
            qty_tersedia: qtyAfter,
            updated_at: now
          }, { onConflict: 'warehouse_code,part_number' })

        // Catat mutasi kartu stok
        await supabaseAdmin
          .from('stock_movements')
          .insert({
            warehouse_code: whCode,
            part_number: itm.part_number,
            movement_type: 'OUT',
            reference_type: 'DO_PERMINTAAN',
            reference_id: pr.pr_number,
            qty_change: -qtyOut,
            qty_before: qtyBefore,
            qty_after: qtyAfter,
            actor_nrp: session.nrp,
            actor_nama: session.nama || session.nrp,
            keterangan: 'Pengeluaran untuk unit ' + pr.unit_code + ' (PR: ' + pr.pr_number + ')',
            created_at: now
          })
      }
    }
  }

  // REJECT ACTION
  else if (action === 'REJECT') {
    updatePayload.status = 'REJECTED'
    updatePayload.rejected_by = session.nrp
    updatePayload.rejected_name = session.nama || session.nrp
    updatePayload.rejected_at = now
    updatePayload.rejected_reason = rejected_reason || 'Ditolak tanpa catatan'
    updatePayload.rejected_at_stage = pr.status
  }

  else {
    return NextResponse.json({ error: 'Aksi tidak dikenali' }, { status: 400 })
  }

  const { data: updatedPr, error: updateErr } = await supabaseAdmin
    .from('purchase_requisitions')
    .update(updatePayload)
    .eq('id', pr_id)
    .select()
    .single()

  if (updateErr) {
    return NextResponse.json({ error: 'Gagal memperbarui status PR: ' + updateErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, pr: updatedPr })
}