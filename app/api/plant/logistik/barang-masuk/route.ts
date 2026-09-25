import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export async function GET(req: Request) {
  try {
    const { data: receipts, error } = await supabase
      .from("stock_movements")
      .select("*")
      .eq("movement_type", "IN")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Ambil juga daftar PR yang APPROVED dan belum READY untuk cross-check queue
    const { data: pendingPrs } = await supabase
      .from("purchase_requests")
      .select("*")
      .in("status", ["APPROVED", "PO_ISSUED", "IN_PAYMENT"])
      .eq("is_ready", false);

    return NextResponse.json({
      success: true,
      receipts: receipts || [],
      pending_crosscheck_prs: pendingPrs || []
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      nomor_lpb,
      nomor_po,
      nama_barang,
      part_number,
      jumlah_diterima,
      satuan = "PCS",
      kondisi = "BAIK",
      lokasi_simpan = "Gudang Utama",
      penerima,
      operator_nrp,
      site = "MLP",
      keterangan
    } = body;

    const inQty = Number(jumlah_diterima || 1);
    if (!nama_barang || inQty <= 0) {
      return NextResponse.json({ success: false, error: "Nama barang dan kuantitas barang masuk wajib diisi valid." }, { status: 400 });
    }

    const autoLpb = nomor_lpb || ("LPB-" + site + "-" + Date.now().toString().slice(-6));
    const nowIso = new Date().toISOString();

    // 1. Cari atau buat master stock barang
    let itemQuery = supabase.from("stock_barang").select("*");
    if (part_number) {
      itemQuery = itemQuery.eq("part_number", part_number);
    } else {
      itemQuery = itemQuery.ilike("nama_barang", nama_barang);
    }

    const { data: existingItems } = await itemQuery;
    let currentStock = 0;
    let itemId = null;

    if (existingItems && existingItems.length > 0) {
      const item = existingItems[0];
      itemId = item.id;
      currentStock = Number(item.stok || 0);
      const newStock = currentStock + inQty;
      await supabase.from("stock_barang").update({ stok: newStock, lokasi_rak: lokasi_simpan, updated_at: nowIso }).eq("id", item.id);
    } else {
      const { data: createdItem } = await supabase.from("stock_barang").insert([{
        kode_barang: "BRG-" + Date.now().toString().slice(-6),
        part_number: part_number || "",
        nama_barang,
        kategori: "SPAREPART",
        stok: inQty,
        min_stok: 1,
        satuan,
        lokasi_rak: lokasi_simpan,
        site,
        created_at: nowIso,
        updated_at: nowIso
      }]).select().single();
      if (createdItem) itemId = createdItem.id;
    }

    // 2. Insert ke stock movements
    const { data: movement, error: moveErr } = await supabase.from("stock_movements").insert([{
      barang_id: itemId,
      kode_barang: nomor_po || "",
      part_number: part_number || "",
      nama_barang,
      movement_type: "IN",
      qty: inQty,
      stock_before: currentStock,
      stock_after: currentStock + inQty,
      reference_type: "LPB",
      reference_no: autoLpb,
      tujuan_unit: lokasi_simpan,
      penerima_mekanik: penerima || "Staff Gudang",
      operator_nrp: operator_nrp || "SYSTEM",
      operator_name: penerima || "Logistik Checker",
      site,
      keterangan: (keterangan || "") + " [Kondisi: " + kondisi + ", Ref PO: " + (nomor_po || "-") + "]",
      created_at: nowIso
    }]).select().single();

    if (moveErr) {
      return NextResponse.json({ success: false, error: moveErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: movement,
      lpb_number: autoLpb,
      message: "Barang masuk berhasil dicatat (" + autoLpb + ") dan stok fisik gudang bertambah +" + inQty + " " + satuan
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 });
  }
}
