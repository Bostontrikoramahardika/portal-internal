import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase-admin";
import { requireAuth } from "@/app/lib/auth";
import { resolveAllowedSites, resolvePrimarySiteValue } from "@/app/lib/site-scope";

// ════════════════════════════════════════════════════════════════
// GET — daftar closing/tindak lanjut temuan inspeksi.
// Wajib login, dibatasi scope site (sama seperti GET inspeksi).
// ════════════════════════════════════════════════════════════════
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
    }
    const session = auth.session as unknown as { nrp: string; nama?: string };

    const { searchParams } = new URL(request.url);
    const requestedSite = searchParams.get("site");
    const { sites, restricted } = await resolveAllowedSites(session, requestedSite);

    let query = supabaseAdmin
      .from("inspeksi_tindak_lanjut")
      .select("*")
      .order("updated_at", { ascending: false });

    if (restricted) {
      if (sites.length === 0) {
        return NextResponse.json({ success: true, data: [] });
      }
      query = query.in("site", sites);
    } else if (requestedSite && requestedSite !== "ALL") {
      query = query.eq("site", requestedSite);
    }

    const { data, error } = await query.limit(500);
    if (error) throw error;
    return NextResponse.json({ success: true, data: data || [] });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}

// ════════════════════════════════════════════════════════════════
// POST — simpan/update closing satu temuan (upsert per inspeksi+item).
// Identitas pencatat & site diambil dari session.
// ════════════════════════════════════════════════════════════════
const STATUS_VALID = ["SELESAI", "MENUNGGU_PART", "BELUM_DILAKSANAKAN"];

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
    }
    const session = auth.session as unknown as { nrp: string; nama?: string };
    const body = await request.json();

    const status = String(body.status_closing || "").toUpperCase();
    if (!STATUS_VALID.includes(status)) {
      return NextResponse.json({ success: false, error: "status_closing tidak valid" }, { status: 400 });
    }
    if (!body.inspeksi_id || !body.item) {
      return NextResponse.json({ success: false, error: "inspeksi_id & item wajib diisi" }, { status: 400 });
    }
    // Belum selesai wajib jelas sumber masalahnya.
    if (status !== "SELESAI" && !body.sumber_masalah) {
      return NextResponse.json({ success: false, error: "Sumber masalah wajib dipilih bila belum selesai" }, { status: 400 });
    }
    if (status === "SELESAI" && !body.tindakan) {
      return NextResponse.json({ success: false, error: "Tindakan perbaikan wajib diisi bila selesai" }, { status: 400 });
    }

    const site = body.site || (await resolvePrimarySiteValue(session)) || "MLP";

    const payload = {
      inspeksi_id: String(body.inspeksi_id),
      no_unit: String(body.no_unit || "-"),
      site,
      section: String(body.section || "UMUM"),
      item: String(body.item),
      status_closing: status,
      sumber_masalah: status === "SELESAI" ? null : String(body.sumber_masalah),
      tindakan: body.tindakan || null,
      part_terpakai: body.part_terpakai || null,
      nomor_pr: body.nomor_pr || null,
      mekanik: body.mekanik || null,
      tanggal_perbaikan: body.tanggal_perbaikan || null,
      catatan: body.catatan || null,
      dicatat_oleh_nrp: session.nrp,
      dicatat_oleh_nama: session.nama || session.nrp,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("inspeksi_tindak_lanjut")
      .upsert(payload, { onConflict: "inspeksi_id,section,item" })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Server error' }, { status: 500 });
  }
}
