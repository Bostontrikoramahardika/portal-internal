import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { pr_id, verified_by, notes } = body;

    if (!pr_id) {
      return NextResponse.json({ success: false, error: "pr_id wajib disertakan." }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const { data: updatedPr, error } = await supabase
      .from("purchase_requests")
      .update({
        status: "BARANG_READY",
        is_ready: true,
        received_at: nowIso,
        updated_at: nowIso
      })
      .eq("id", pr_id)
      .select()
      .single();

    if (error || !updatedPr) {
      return NextResponse.json({ success: false, error: error?.message || "Gagal verifikasi PR" }, { status: 500 });
    }

    // Kirim notifikasi konfirmasi ke Mekanik pemohon
    if (updatedPr.requester_nrp) {
      await supabase.from("notifications").insert([{
        nrp: updatedPr.requester_nrp,
        title: "BARANG READY DI GUDANG: " + updatedPr.nomor_pr,
        message: "Barang yang Anda minta (" + updatedPr.nama_barang + " - " + updatedPr.jumlah + " " + updatedPr.satuan + ") telah tiba di gudang dan lolos cross-check fisik oleh tim Logistik (" + (verified_by || "Gudang") + "). Silakan ambil di gudang.",
        type: "pr_ready",
        is_read: false,
        created_at: nowIso
      }]);
    }

    return NextResponse.json({
      success: true,
      data: updatedPr,
      message: "PR " + updatedPr.nomor_pr + " berhasil diverifikasi dan diset BARANG READY. Notifikasi telah terkirim ke Mekanik."
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 });
  }
}
