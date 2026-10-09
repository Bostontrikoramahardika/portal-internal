import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase-admin";
import { requireAuth } from "@/app/lib/auth";
import { resolveAllowedSites, resolvePrimarySiteValue } from "@/app/lib/site-scope";

// ════════════════════════════════════════════════════════════════
// GET — riwayat inspeksi P2H. Wajib login, dibatasi scope site.
// ════════════════════════════════════════════════════════════════
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
    }
    const session: any = auth.session;

    const { searchParams } = new URL(request.url);
    const requestedSite = searchParams.get("site");
    const { sites, restricted } = await resolveAllowedSites(session, requestedSite);

    let query = supabaseAdmin
      .from("inspeksi_unit")
      .select("*")
      .order("created_at", { ascending: false });

    if (restricted) {
      if (sites.length === 0) {
        return NextResponse.json({ success: true, data: [] });
      }
      query = query.in("site", sites);
    } else if (requestedSite && requestedSite !== "ALL") {
      query = query.eq("site", requestedSite);
    }

    const { data, error } = await query.limit(100);
    if (error) throw error;
    return NextResponse.json({ success: true, data: data || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ════════════════════════════════════════════════════════════════
// POST — simpan inspeksi P2H + auto-create PR untuk item backlog.
// Identitas inspector & site diambil dari session (tidak dari browser).
// ════════════════════════════════════════════════════════════════
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
    }
    const session: any = auth.session;

    const body = await request.json();

    const inspectorNrp = session.nrp;
    const inspectorNama = session.nama || session.nrp;
    const requesterRole = session.primaryRole || (Array.isArray(session.roles) ? session.roles[0] : "") || "karyawan";
    const site = (await resolvePrimarySiteValue(session)) || body.site || "MLP";

    // HM: UI mengirim hm_actual (versi lama memakai hm_awal).
    const hmValue = parseFloat(body.hm_actual ?? body.hm_awal) || 0;

    const { data: inspeksiData, error } = await supabaseAdmin.from("inspeksi_unit").insert({
      no_unit: body.no_unit,
      shift: body.shift,
      site,
      inspector_nrp: inspectorNrp,
      inspector_nama: inspectorNama,
      operator: body.operator || "",
      hm_km: hmValue,
      hm_akhir: parseFloat(body.hm_akhir ?? body.hm_actual) || 0,
      type_breaker: body.type_breaker || "",
      type_chisel: body.type_chisel || "",
      status_kelayakan: body.status_kelayakan || "READY",
      checklist: body.checklist || {},
      temuan_tindakan: body.temuan_tindakan || [],
      jenis_unit: body.jenis_unit || "EXCAVATOR & BREAKER"
    }).select().single();

    if (error) throw error;

    // ── Auto-create Purchase Request untuk item backlog ──
    const backlogItems: any[] = Array.isArray(body.backlog_items) ? body.backlog_items : [];

    // UI baru memakai field `part_name`; versi lama `nama_barang`.
    const validBacklogs = backlogItems
      .map((b: any) => ({
        part_name: String(b.part_name || b.nama_barang || "").trim(),
        part_number: String(b.part_number || "").trim(),
        qty: parseInt(b.qty) || 1,
        satuan: b.satuan || "PCS",
        keterangan: b.keterangan || "Temuan Backlog",
      }))
      .filter((b) => b.part_name !== "");

    let createdPrNumbers: string[] = [];

    if (validBacklogs.length > 0) {
      const nowIso = new Date().toISOString();
      const baseStamp = Date.now().toString().slice(-6);

      const prRows = validBacklogs.map((b, index) => {
        const nomorPr = "PR-" + site + "-" + baseStamp + String(index + 1);
        createdPrNumbers.push(nomorPr);
        return {
          nomor_pr: nomorPr,
          requester_nrp: inspectorNrp,
          requester_name: inspectorNama,
          requester_role: requesterRole,
          site,
          unit_code: body.no_unit || "UMUM",
          nama_barang: b.part_name,
          part_number: b.part_number || "PN-BACKLOG",
          jumlah: b.qty,
          satuan: b.satuan,
          kriteria: "BACKLOG",
          keterangan: "Auto-generated dari P2H Unit " + (body.no_unit || "-") + " (" + b.keterangan + ")",
          status: "PENDING_GL",
          created_at: nowIso,
          updated_at: nowIso,
        };
      });

      const { error: prErr } = await supabaseAdmin.from("purchase_requests").insert(prRows);
      if (prErr) {
        // Inspeksi tetap tersimpan; laporkan kegagalan pembuatan PR.
        return NextResponse.json({
          success: true,
          data: inspeksiData,
          warning: "Inspeksi tersimpan, tetapi PR backlog gagal dibuat: " + prErr.message
        });
      }
    }

    return NextResponse.json({ success: true, data: inspeksiData, pr_numbers: createdPrNumbers });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
