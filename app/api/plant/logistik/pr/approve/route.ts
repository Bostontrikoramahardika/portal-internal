import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/app/lib/auth";
import { canApprovePurchaseRequest, getSessionRoles, isPlantTeam } from "@/app/lib/site-scope";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

// Role yang berhak pada setiap tahap pipeline PR.
const STAGE_ROLES: Record<string, string[]> = {
  PENDING_GL: ["gl_plant", "gl_produksi", "admin_plant", "pjo_site", "pjo"],
  PENDING_PJO: ["pjo_site", "pjo", "manager_ops", "director_ops"],
  PENDING_HO: ["hr_ho", "spv_she_ho", "manager_ops", "director_ops", "business_dev", "super_admin"],
};

function roleAllowedForStage(session: any, status: string): boolean {
  if (session?.is_super_admin) return true;
  const allowed = STAGE_ROLES[String(status || "").toUpperCase()];
  if (!allowed) return false;
  const mine = getSessionRoles(session);
  return mine.some((r) => allowed.includes(r));
}

// ════════════════════════════════════════════════════════════════
// POST — approve / reject / kirim ulang PR.
// Team Plant (plant_team) TIDAK BOLEH approve/reject; hanya boleh
// mengirim ulang PR miliknya sendiri saat status menunggu revisi.
// ════════════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
    }
    const session: any = auth.session;

    const body = await req.json();
    const { pr_id, action, reason = "" } = body;

    if (!pr_id || !action) {
      return NextResponse.json({ success: false, error: "pr_id dan action wajib diisi." }, { status: 400 });
    }

    const actionUpper = String(action).toUpperCase();

    // ── Guard 1: Team Plant tidak boleh approve / reject ──
    if ((actionUpper === "APPROVE" || actionUpper === "REJECT") && isPlantTeam(session)) {
      return NextResponse.json(
        { success: false, error: "Role Team Plant tidak berwenang menyetujui atau menolak PR." },
        { status: 403 }
      );
    }

    const { data: pr, error: fetchErr } = await supabase
      .from("purchase_requests")
      .select("*")
      .eq("id", pr_id)
      .single();

    if (fetchErr || !pr) {
      return NextResponse.json({ success: false, error: "Data PR tidak ditemukan." }, { status: 404 });
    }

    // ── Kirim ulang PR (revisi) hanya oleh pemohon sendiri ──
    if (actionUpper === "REVISE_RESUBMIT") {
      if (String(pr.requester_nrp || "") !== String(session.nrp)) {
        return NextResponse.json({ success: false, error: "Hanya pemohon yang dapat mengirim ulang PR ini." }, { status: 403 });
      }
    } else {
      // ── Guard 2: hanya role approver & hanya pada tahap yang sesuai ──
      if (!canApprovePurchaseRequest(session)) {
        return NextResponse.json({ success: false, error: "Akses ditolak. Anda tidak berwenang menyetujui PR." }, { status: 403 });
      }
      if (!roleAllowedForStage(session, pr.status)) {
        return NextResponse.json(
          { success: false, error: "PR ini tidak sedang menunggu persetujuan Anda (tahap: " + pr.status + ")." },
          { status: 403 }
        );
      }
    }

    const approverNrp = session.nrp;
    const approverName = session.nama || session.nrp;
    const approverRole = session.primaryRole || (Array.isArray(session.roles) ? session.roles[0] : "") || "";
    const cleanRole = String(approverRole).toLowerCase();

    const nowIso = new Date().toISOString();
    let updatePayload: any = { updated_at: nowIso };
    let nextStatus = pr.status;
    let notifyTitle = "";
    let notifyMessage = "";
    let nextTargetRoles: string[] = [];

    if (actionUpper === "REJECT") {
      nextStatus = "REJECTED";
      updatePayload.status = "REJECTED";
      updatePayload.rejection_reason = reason || "Ditolak oleh " + approverName;
      notifyTitle = "PR DITOLAK: " + pr.nomor_pr;
      notifyMessage = "Permintaan barang Anda (" + pr.nama_barang + ") telah ditolak oleh " + approverName + ". Alasan: " + (reason || "Tidak disetujui.");
    } else if (actionUpper === "APPROVE") {
      if (cleanRole.includes("gl") || cleanRole.includes("pengawas")) {
        nextStatus = "PENDING_PJO";
        updatePayload.approval_gl_nrp = approverNrp;
        updatePayload.approval_gl_name = approverName;
        updatePayload.approval_gl_at = nowIso;
        updatePayload.approval_gl_status = "APPROVED";
        updatePayload.status = nextStatus;
        nextTargetRoles = ["pjo", "admin"];
        notifyTitle = "PR Disetujui GL: " + pr.nomor_pr;
        notifyMessage = "PR " + pr.nomor_pr + " (" + pr.nama_barang + ") telah disetujui GL " + approverName + " dan menunggu persetujuan PJO.";
      } else if (cleanRole.includes("pjo") || cleanRole.includes("project_manager")) {
        nextStatus = "PENDING_HO";
        updatePayload.approval_pjo_nrp = approverNrp;
        updatePayload.approval_pjo_name = approverName;
        updatePayload.approval_pjo_at = nowIso;
        updatePayload.approval_pjo_status = "APPROVED";
        updatePayload.status = nextStatus;
        nextTargetRoles = ["ho", "superadmin", "purchasing"];
        notifyTitle = "PR Disetujui PJO: " + pr.nomor_pr;
        notifyMessage = "PR " + pr.nomor_pr + " (" + pr.nama_barang + ") telah disetujui PJO " + approverName + " dan diteruskan ke Head Office (HO).";
      } else if (cleanRole.includes("ho") || cleanRole.includes("superadmin") || cleanRole.includes("admin")) {
        nextStatus = "APPROVED";
        updatePayload.approval_ho_nrp = approverNrp;
        updatePayload.approval_ho_name = approverName;
        updatePayload.approval_ho_at = nowIso;
        updatePayload.approval_ho_status = "APPROVED";
        updatePayload.status = nextStatus;
        notifyTitle = "PR FINAL APPROVED: " + pr.nomor_pr;
        notifyMessage = "PR " + pr.nomor_pr + " (" + pr.nama_barang + ") telah disetujui FINAL oleh HO. Pengadaan & PO akan segera diproses.";
      } else {
        return NextResponse.json(
          { success: false, error: "Role Anda tidak dikenali untuk tahap approval ini." },
          { status: 403 }
        );
      }
    } else if (actionUpper === "REVISE_RESUBMIT") {
      nextStatus = "PENDING_GL";
      updatePayload.status = "PENDING_GL";
      updatePayload.rejection_reason = null;
      notifyTitle = "PR Direvisi & Dikirim Ulang: " + pr.nomor_pr;
      notifyMessage = "Pemohon " + (pr.requester_name || "Pemohon") + " telah merevisi PR " + pr.nomor_pr + " dan mengajukan kembali untuk approval.";
      nextTargetRoles = ["gl_plant", "plant_admin", "admin"];
    } else {
      return NextResponse.json({ success: false, error: "Action tidak dikenali." }, { status: 400 });
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
        const uniqueTarget = Array.from(new Set(nextUsers.map(function (u: any) { return u.nrp; })));
        const approverNotifs = uniqueTarget.map(function (tNrp) {
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
