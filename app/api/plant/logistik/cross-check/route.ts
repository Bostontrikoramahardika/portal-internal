import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/app/lib/auth";
import { canManageStock, resolveAllowedSites } from "@/app/lib/site-scope";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

// Status PR yang boleh di-cross-check (barang sudah disetujui / dipesan).
const CROSSCHECK_ALLOWED_STATUS = ["APPROVED", "PO_ISSUED", "IN_PAYMENT"];

// ════════════════════════════════════════════════════════════════
// POST — cross-check fisik & tandai PR sebagai BARANG_READY.
// Hanya role logistik/approver. Team Plant TIDAK BOLEH.
// ════════════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
    }
    const session: any = auth.session;

    if (!canManageStock(session)) {
      return NextResponse.json(
        { success: false, error: "Akses ditolak. Cross-check barang hanya boleh dilakukan tim logistik/gudang." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { pr_id, notes } = body;

    if (!pr_id) {
      return NextResponse.json({ success: false, error: "pr_id wajib disertakan." }, { status: 400 });
    }

    const { data: pr, error: fetchErr } = await supabase
      .from("purchase_requests")
      .select("*")
      .eq("id", pr_id)
      .single();

    if (fetchErr || !pr) {
      return NextResponse.json({ success: false, error: "Data PR tidak ditemukan." }, { status: 404 });
    }

    if (!CROSSCHECK_ALLOWED_STATUS.includes(String(pr.status || "").toUpperCase())) {
      return NextResponse.json(
        { success: false, error: "PR dengan status " + pr.status + " belum bisa di-cross-check." },
        { status: 400 }
      );
    }

    // Pastikan PR berada dalam scope site user (kalau user dibatasi scope).
    const { sites, restricted } = await resolveAllowedSites(session, null);
    if (restricted && sites.length > 0 && pr.site && !sites.includes(String(pr.site))) {
      return NextResponse.json({ success: false, error: "PR ini berada di luar site Anda." }, { status: 403 });
    }

    const verifiedBy = (session.nama || session.nrp) + " (" + (session.primaryRole || "logistik") + ")";
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

    // Kirim notifikasi konfirmasi ke pemohon
    if (updatedPr.requester_nrp) {
      await supabase.from("notifications").insert([{
        nrp: updatedPr.requester_nrp,
        title: "BARANG READY DI GUDANG: " + updatedPr.nomor_pr,
        message: "Barang yang Anda minta (" + updatedPr.nama_barang + " - " + updatedPr.jumlah + " " + updatedPr.satuan + ") telah tiba di gudang dan lolos cross-check fisik oleh tim Logistik (" + verifiedBy + "). Silakan ambil di gudang." + (notes ? " Catatan: " + notes : ""),
        type: "pr_ready",
        is_read: false,
        created_at: nowIso
      }]);
    }

    return NextResponse.json({
      success: true,
      data: updatedPr,
      message: "PR " + updatedPr.nomor_pr + " berhasil diverifikasi dan diset BARANG READY. Notifikasi telah terkirim ke pemohon."
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 });
  }
}
