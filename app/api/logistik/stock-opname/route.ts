import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSession } from "@/app/lib/auth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Ambil history penyesuaian stok / stock opname
export async function GET(req: NextRequest) {
  try {
    const warehouse = req.nextUrl.searchParams.get("warehouse_code");
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50", 10);

    let query = supabaseAdmin
      .from("stock_movements")
      .select("*, master_part(part_name, satuan, kategori)")
      .eq("movement_type", "ADJUST")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (warehouse && warehouse !== "ALL") {
      query = query.eq("warehouse_code", warehouse);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, history: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Eksekusi Stock Opname & Penyesuaian Fisik vs Sistem
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("session_token")?.value;
    const session = token ? await getSession(token) : null;
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      warehouse_code,
      part_number,
      qty_fisik,
      rak_lokasi,
      keterangan = "Stock Opname Fisik",
    } = body;

    if (!warehouse_code || !part_number || qty_fisik === undefined || qty_fisik === null) {
      return NextResponse.json(
        { error: "Warehouse, Part Number, dan Qty Fisik wajib diisi" },
        { status: 400 }
      );
    }

    const qtyFisikNum = Math.max(0, parseInt(qty_fisik, 10));

    // 1. Ambil stok saat ini di stock_barang
    const { data: currentStock } = await supabaseAdmin
      .from("stock_barang")
      .select("*")
      .eq("warehouse_code", warehouse_code)
      .eq("part_number", part_number)
      .single();

    const qtyBefore = currentStock ? Number(currentStock.qty_tersedia || 0) : 0;
    const qtyChange = qtyFisikNum - qtyBefore;
    const nowIso = new Date().toISOString();
    const dateStr = nowIso.slice(0, 10).replace(/-/g, "");
    const soRef = "SO-" + warehouse_code + "-" + dateStr + "-" + Math.floor(1000 + Math.random() * 9000);

    // 2. Update atau Insert ke stock_barang
    if (currentStock) {
      const updatePayload: Record<string, any> = {
        qty_tersedia: qtyFisikNum,
        last_movement_at: nowIso,
        updated_at: nowIso,
      };
      if (rak_lokasi) updatePayload.rak_lokasi = rak_lokasi;

      const { error: updErr } = await supabaseAdmin
        .from("stock_barang")
        .update(updatePayload)
        .eq("id", currentStock.id);

      if (updErr) throw updErr;
    } else {
      const { error: insErr } = await supabaseAdmin
        .from("stock_barang")
        .insert({
          warehouse_code,
          part_number,
          qty_tersedia: qtyFisikNum,
          rak_lokasi: rak_lokasi || "UNASSIGNED",
          last_movement_at: nowIso,
          updated_at: nowIso,
        });

      if (insErr) throw insErr;
    }

    // 3. Catat audit trail di stock_movements
    const { error: logErr } = await supabaseAdmin
      .from("stock_movements")
      .insert({
        warehouse_code,
        part_number,
        movement_type: "ADJUST",
        reference_type: "STOCK_OPNAME",
        reference_id: soRef,
        qty_change: qtyChange,
        qty_before: qtyBefore,
        qty_after: qtyFisikNum,
        actor_nrp: session.nrp || "ADMIN",
        actor_nama: session.nama || "Logistik Officer",
        keterangan: keterangan + (qtyChange !== 0 ? " (Selisih: " + (qtyChange > 0 ? "+" : "") + qtyChange + ")" : " (Sesuai)"),
      });

    if (logErr) throw logErr;

    return NextResponse.json({
      success: true,
      message: "Penyesuaian stok berhasil disimpan.",
      so_number: soRef,
      qty_before: qtyBefore,
      qty_after: qtyFisikNum,
      selisih: qtyChange,
    });
  } catch (err: any) {
    console.error("Stock Opname error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
