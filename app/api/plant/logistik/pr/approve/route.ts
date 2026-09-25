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
    const { pr_id, action, approver_nrp, approver_name, approver_role = "", reason = "" } = body;

    if (!pr_id || !action) {
      return NextResponse.json({ success: false, error: "pr_id dan action wajib diisi." }, { status: 400 });
    }

    const { data: pr, error: fetchErr } = await supabase
      .from("purchase_requests")
      .select("*")
      .eq("id", pr_id)
      .single();

    if (fetchErr || !pr) {
      return NextResponse.json({ success: false, error: "Data PR tidak ditemukan." }, { status: 404 });
    }

    const nowIso = new Date().toISOString();
    const cleanRole = String(approver_role).toLowerCase();
    let updatePayload: any = { updated_at: nowIso };
    let nextStatus = pr.status;
    let notifyTitle = "";
    let notifyMessage = "";
    let nextTargetRoles: string[] = [];

    if (action === "REJECT") {
      nextStatus = "REJECTED";
      updatePayload.status = "REJECTED";
      updatePayload.rejection_reason = reason || "Ditolak oleh " + approver_name;
      notifyTitle = "PR DITOLAK: " + pr.nomor_pr;
      notifyMessage = "Permintaan barang Anda (" + pr.nama_barang + ") telah ditolak oleh " + approver_name + ". Alasan: " + (reason || "Tidak disetujui.");
    } else if (action === "APPROVE") {
      if (cleanRole.includes("gl") || cleanRole.includes("pengawas")) {
        nextStatus = "PENDING_PJO";
        updatePayload.approval_gl_nrp = approver_nrp;
        updatePayload.approval_gl_name = approver_name;
        updatePayload.approval_gl_at = nowIso;
        updatePayload.approval_gl_status = "APPROVED";
        updatePayload.status = nextStatus;
        nextTargetRoles = ["pjo", "admin"];
        notifyTitle = "PR Disetujui GL: " + pr.nomor_pr;
        notifyMessage = "PR " + pr.nomor_pr + " (" + pr.nama_barang + ") telah disetujui GL " + approver_name + " dan menunggu persetujuan PJO.";
      } else if (cleanRole.includes("pjo") || cleanRole.includes("project_manager")) {
        nextStatus = "PENDING_HO";
        updatePayload.approval_pjo_nrp = approver_nrp;
        updatePayload.approval_pjo_name = approver_name;
        updatePayload.approval_pjo_at = nowIso;
        updatePayload.approval_pjo_status = "APPROVED";
        updatePayload.status = nextStatus;
        nextTargetRoles = ["ho", "superadmin", "purchasing"];
        notifyTitle = "PR Disetujui PJO: " + pr.nomor_pr;
        notifyMessage = "PR " + pr.nomor_pr + " (" + pr.nama_barang + ") telah disetujui PJO " + approver_name + " dan diteruskan ke Head Office (HO).";
      } else if (cleanRole.includes("ho") || cleanRole.includes("superadmin") || cleanRole.includes("admin")) {
        nextStatus = "APPROVED";
        updatePayload.approval_ho_nrp = approver_nrp;
        updatePayload.approval_ho_name = approver_name;
        updatePayload.approval_ho_at = nowIso;
        updatePayload.approval_ho_status = "APPROVED";
        updatePayload.status = nextStatus;
        notifyTitle = "PR FINAL APPROVED: " + pr.nomor_pr;
        notifyMessage = "PR " + pr.nomor_pr + " (" + pr.nama_barang + ") telah disetujui FINAL oleh HO. Pengadaan & PO akan segera diproses.";
      }
    } else if (action === "REVISE_RESUBMIT") {
      nextStatus = "PENDING_GL";
      updatePayload.status = "PENDING_GL";
      updatePayload.rejection_reason = null;
      notifyTitle = "PR Direvisi & Dikirim Ulang: " + pr.nomor_pr;
      notifyMessage = "Mekanik " + (pr.requester_name || "Pemohon") + " telah merevisi PR " + pr.nomor_pr + " dan mengajukan kembali untuk approval.";
      nextTargetRoles = ["gl_plant", "plant_admin", "admin"];
    }

    const { data: updatedPr, error: updateErr } = await supabase
      .from("purchase_requests")
      .update(updatePayload)
      .eq("id", pr_id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
    }

    // Notify Requester
    if (pr.requester_nrp) {
      await supabase.from("notifications").insert([{
        nrp: pr.requester_nrp,
        title: notifyTitle,
        message: notifyMessage,
        type: "pr_status",
        is_read: false,
        created_at: nowIso
      }]);
    }

    // Notify Next Approvers if any
    if (nextTargetRoles.length > 0) {
      const { data: nextUsers } = await supabase
        .from("roles")
        .select("nrp, role")
        .in("role", nextTargetRoles);
      if (nextUsers && nextUsers.length > 0) {
        const uniqueTarget = Array.from(new Set(nextUsers.map(function(u: any) { return u.nrp; })));
        const approverNotifs = uniqueTarget.map(function(tNrp) {
          return {
            nrp: tNrp,
            title: "Approval Dibutuhkan: " + pr.nomor_pr,
            message: "PR " + pr.nomor_pr + " memerlukan tindakan persetujuan Anda.",
            type: "pr_approval",
            is_read: false,
            created_at: nowIso
          };
        });
        await supabase.from("notifications").insert(approverNotifs);
      }
    }

    return NextResponse.json({ success: true, data: updatedPr, message: "Status PR berhasil diperbarui ke " + nextStatus });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 });
  }
}
