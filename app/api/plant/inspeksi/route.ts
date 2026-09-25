import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase-admin";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const site = searchParams.get("site");
    let query = supabaseAdmin.from("inspeksi_unit").select("*").order("created_at", { ascending: false });
    if (site && site !== "ALL") query = query.eq("site", site);
    const { data, error } = await query.limit(100);
    if (error) throw error;
    return NextResponse.json({ success: true, data: data || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data: inspeksiData, error } = await supabaseAdmin.from("inspeksi_unit").insert({
      no_unit: body.no_unit,
      shift: body.shift,
      site: body.site,
      inspector_nrp: body.inspector_nrp,
      inspector_nama: body.inspector_nama,
      operator: body.operator || "",
      hm_km: parseFloat(body.hm_awal) || 0,
      hm_akhir: parseFloat(body.hm_akhir) || 0,
      type_breaker: body.type_breaker || "",
      type_chisel: body.type_chisel || "",
      status_kelayakan: body.status_kelayakan || "READY",
      checklist: body.checklist || {},
      temuan_tindakan: body.temuan_tindakan || [],
      jenis_unit: body.jenis_unit || "EXCAVATOR & BREAKER"
    }).select().single();

    if (error) throw error;

    // AUTO-CREATE PURCHASE REQUEST (PR) KHUSUS BACKLOG
    if (Array.isArray(body.backlog_items) && body.backlog_items.length > 0) {
      const validBacklogs = body.backlog_items.filter((b: any) => b.nama_barang && b.nama_barang.trim() !== "");
      if (validBacklogs.length > 0) {
        const prRows = validBacklogs.map((b: any) => ({
          no_unit: body.no_unit,
          part_number: b.part_number ? b.part_number.trim() : "PN-BACKLOG",
          nama_barang: b.nama_barang.trim(),
          qty: parseInt(b.qty) || 1,
          satuan: b.satuan || "PCS",
          prioritas: "BACKLOG",
          status: "PENDING",
          site: body.site || "MLP",
          created_by: body.inspector_nama || "MEKANIK",
          keterangan: "Auto-generated dari P2H Unit " + body.no_unit + " (" + (b.keterangan || "Temuan Backlog") + ")"
        }));
        await supabaseAdmin.from("purchase_requests").insert(prRows);
      }
    }

    return NextResponse.json({ success: true, data: inspeksiData });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
