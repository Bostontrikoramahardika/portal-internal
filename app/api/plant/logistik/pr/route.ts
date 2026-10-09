import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/app/lib/auth";
import {
  canApprovePurchaseRequest,
  isCrossSiteUser,
  normalizeSiteValue,
  resolveAllowedSites,
  resolvePrimarySiteValue,
} from "@/app/lib/site-scope";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

// ════════════════════════════════════════════════════════════════
// GET — daftar PR
//   ?view=mine        → PR milik user yang login
//   ?view=all         → monitoring PR (dibatasi scope site user)
//   ?view_all=true    → bentuk lama, diperlakukan sama seperti view=all
//   ?requester_nrp=x  → diabaikan; identitas selalu dari session
// ════════════════════════════════════════════════════════════════
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
    }
    const session: any = auth.session;

    const { searchParams } = new URL(req.url);
    const requestedView = (searchParams.get("view") || "").toLowerCase();
    const legacyViewAll = searchParams.get("view_all") === "true";
    const viewAll = requestedView === "all" || legacyViewAll;

    let query = supabase
      .from("purchase_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (!viewAll) {
      // PR milik sendiri — NRP dari session, bukan dari browser.
      query = query.eq("requester_nrp", session.nrp);
    } else {
      // Monitoring: batasi ke scope site user (HO / super admin bebas).
      const { sites, restricted } = await resolveAllowedSites(
        session,
        searchParams.get("site")
      );
      if (restricted) {
        if (sites.length === 0) {
          return NextResponse.json({ success: true, data: [] });
        }
        query = query.in("site", sites);
      }
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      can_approve: canApprovePurchaseRequest(session),
      read_only: !canApprovePurchaseRequest(session),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 });
  }
}

// ════════════════════════════════════════════════════════════════
// POST — buat PR baru. Identitas & site diambil dari session server.
// Team Plant (plant_team) boleh mengajukan, status awal PENDING_GL.
// ════════════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
    }
    const session: any = auth.session;

    const body = await req.json();
    const {
      unit_code,
      nama_barang,
      part_number,
      jumlah,
      satuan = "PCS",
      kriteria = "OTHER",
      keterangan,
      foto_url,
    } = body;

    if (!nama_barang || !jumlah) {
      return NextResponse.json({ success: false, error: "Nama barang dan jumlah wajib diisi." }, { status: 400 });
    }

    const requesterNrp = session.nrp;
    const requesterName = session.nama || session.nrp;
    const requesterRole = session.primaryRole || (Array.isArray(session.roles) ? session.roles[0] : "") || "karyawan";
    const site = (await resolvePrimarySiteValue(session)) || normalizeSiteValue(body.site) || "MLP";

    const autoNomorPr = "PR-" + site + "-" + Date.now().toString().slice(-6);
    const cleanRole = String(requesterRole).toLowerCase();

    let initialStatus = "PENDING_GL";
    let targetNotifyRoles = ["gl_plant", "plant_admin", "admin"];

    if (cleanRole.includes("gl") || cleanRole.includes("pengawas")) {
      initialStatus = "PENDING_PJO";
      targetNotifyRoles = ["pjo", "admin"];
    } else if (cleanRole.includes("pjo") || cleanRole.includes("project_manager")) {
      initialStatus = "PENDING_HO";
      targetNotifyRoles = ["ho", "superadmin", "purchasing"];
    } else if (cleanRole.includes("ho") || cleanRole.includes("superadmin")) {
      initialStatus = "APPROVED";
      targetNotifyRoles = ["logistik", "admin_logistik"];
    }

    const { data: newPr, error: insertErr } = await supabase
      .from("purchase_requests")
      .insert([{
        nomor_pr: autoNomorPr,
        requester_nrp: requesterNrp,
        requester_name: requesterName,
        requester_role: requesterRole,
        site,
        unit_code: unit_code || "UMUM",
        nama_barang,
        part_number: part_number || "",
        jumlah: Number(jumlah),
        satuan,
        kriteria,
        keterangan: keterangan || "",
        foto_url: foto_url || "",
        status: initialStatus,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (insertErr) {
      return NextResponse.json({ success: false, error: insertErr.message }, { status: 500 });
    }

    // Dispatch In-App Notification to Target Approvers
    const { data: approvers } = await supabase
      .from("roles")
      .select("nrp, role")
      .in("role", targetNotifyRoles);

    if (approvers && approvers.length > 0) {
      const uniqueNrps = Array.from(new Set(approvers.map(function (a: any) { return a.nrp; })));
      const notifs = uniqueNrps.map(function (targetNrp) {
        return {
          nrp: targetNrp,
          title: "PR Baru: " + autoNomorPr + " (" + (kriteria || "OTHER") + ")",
          message: "Permintaan dari " + requesterName + " untuk unit " + (unit_code || "-") + ": " + nama_barang + " (" + jumlah + " " + satuan + ") membutuhkan persetujuan Anda.",
          type: "pr_approval",
          is_read: false,
          created_at: new Date().toISOString()
        };
      });
      await supabase.from("notifications").insert(notifs);
    }

    return NextResponse.json({ success: true, data: newPr, message: "Purchase Request berhasil diajukan dengan nomor " + autoNomorPr });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 });
  }
}
