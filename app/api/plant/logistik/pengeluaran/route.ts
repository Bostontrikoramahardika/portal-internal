import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export async function GET(req: Request) {
  try {
    const { data, error } = await supabase
      .from("stock_movements")
      .select("*")
      .eq("movement_type", "OUT")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, data: data || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      barang_id,
      part_number,
      nama_barang,
      qty,
      tujuan_unit,
      penerima_mekanik,
      operator_nrp,
      operator_name,
      keterangan,
      is_scan = false
    } = body;

    const issueQty = Number(qty || 1);
    if (issueQty <= 0) {
      return NextResponse.json({ success: false, error: "Jumlah pengeluaran harus lebih dari 0." }, { status: 400 });
    }

    let itemQuery = supabase.from("stock_barang").select("*");
    if (barang_id) {
      itemQuery = itemQuery.eq("id", barang_id);
    } else if (part_number) {
      itemQuery = itemQuery.eq("part_number", part_number);
    } else if (nama_barang) {
      itemQuery = itemQuery.ilike("nama_barang", nama_barang);
    } else {
      return NextResponse.json({ success: false, error: "Spesifikasi barang tidak ditemukan." }, { status: 400 });
    }

    const { data: stockItems, error: findErr } = await itemQuery;
    if (findErr || !stockItems || stockItems.length === 0) {
      return NextResponse.json({ success: false, error: "Part / Barang tidak terdaftar di master inventaris gudang." }, { status: 404 });
    }

    const item = stockItems[0];
    const currentStock = Number(item.stok || 0);

    if (currentStock < issueQty) {
      return NextResponse.json({
        success: false,
        error: "Stok tidak mencukupi! Stok saat ini: " + currentStock + " " + (item.satuan || "PCS") + ", diminta: " + issueQty + " " + (item.satuan || "PCS")
      }, { status: 400 });
    }

    const newStock = currentStock - issueQty;
    const nowIso = new Date().toISOString();

    const { error: stockUpdateErr } = await supabase
      .from("stock_barang")
      .update({ stok: newStock, updated_at: nowIso })
      .eq("id", item.id);

    if (stockUpdateErr) {
      return NextResponse.json({ success: false, error: stockUpdateErr.message }, { status: 500 });
    }

    const { data: movement, error: moveErr } = await supabase
      .from("stock_movements")
      .insert([{
        barang_id: item.id,
        kode_barang: item.kode_barang || "",
        part_number: item.part_number || part_number || "",
        nama_barang: item.nama_barang,
        movement_type: "OUT",
        qty: issueQty,
        stock_before: currentStock,
        stock_after: newStock,
        reference_type: is_scan ? "SCAN" : "ISSUE",
        reference_no: "OUT-" + Date.now().toString().slice(-6),
        tujuan_unit: tujuan_unit || "WORKSHOP",
        penerima_mekanik: penerima_mekanik || "Mekanik Site",
        operator_nrp: operator_nrp || "SYSTEM",
        operator_name: operator_name || "Logistik Officer",
        site: item.site || "MLP",
        keterangan: keterangan || (is_scan ? "Pengeluaran via Barcode Scan" : "Pengeluaran Part Manual"),
        created_at: nowIso
      }])
      .select()
      .single();

    return NextResponse.json({
      success: true,
      data: movement,
      remaining_stock: newStock,
      message: "Berhasil mengeluarkan " + issueQty + " " + (item.satuan || "PCS") + " " + item.nama_barang + ". Sisa stok: " + newStock
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 });
  }
}
