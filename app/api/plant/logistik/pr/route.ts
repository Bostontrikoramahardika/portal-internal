import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const requesterNrp = searchParams.get("requester_nrp");
    const site = searchParams.get("site");
    const role = searchParams.get("role") || "";
    const viewAll = searchParams.get("view_all") === "true";

    let query = supabase.from("purchase_requests").select("*").order("created_at", { ascending: false });

    if (!viewAll && requesterNrp) {
      query = query.eq("requester_nrp", requesterNrp);
    } else if (role.toLowerCase() !== "ho" && role.toLowerCase() !== "superadmin" && site) {
      query = query.eq("site", site);
    }

    const { data, error } = await query;
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
      requester_nrp,
      requester_name,
      requester_role = "mekanik",
      site = "MLP",
      unit_code,
      nama_barang,
      part_number,
      jumlah,
      satuan = "PCS",
      kriteria = "OTHER",
      keterangan,
      foto_url
    } = body;

    if (!nama_barang || !jumlah) {
      return NextResponse.json({ success: false, error: "Nama barang dan jumlah wajib diisi." }, { status: 400 });
    }

    const autoNomorPr = "PR-" + (site || "MLP") + "-" + Date.now().toString().slice(-6);
    const cleanRole = String(requester_role).toLowerCase();

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
        requester_nrp,
        requester_name,
        requester_role,
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
      const uniqueNrps = Array.from(new Set(approvers.map(function(a: any) { return a.nrp; })));
      const notifs = uniqueNrps.map(function(targetNrp) {
        return {
          nrp: targetNrp,
          title: "PR Baru: " + autoNomorPr + " (" + (kriteria || "OTHER") + ")",
          message: "Permintaan dari " + (requester_name || "Mekanik") + " untuk unit " + (unit_code || "-") + ": " + nama_barang + " (" + jumlah + " " + satuan + ") membutuhkan persetujuan Anda.",
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
