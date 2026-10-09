import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/app/lib/auth";
import { resolveAllowedSites } from "@/app/lib/site-scope";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

// ════════════════════════════════════════════════════════════════
// GET — stok gudang. Wajib login; site dibatasi scope user
// (Team Plant hanya melihat stok site-nya, baca-saja).
// ════════════════════════════════════════════════════════════════
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
    }
    const session: any = auth.session;

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";

    const { sites, restricted } = await resolveAllowedSites(session, searchParams.get("site"));

    let query = supabase
      .from("stock_barang")
      .select("*")
      .order("nama_barang", { ascending: true });

    if (restricted) {
      if (sites.length === 0) {
        return NextResponse.json({ success: true, data: [] });
      }
      query = query.in("site", sites);
    }

    if (q) {
      query = query.or("nama_barang.ilike.%" + q + "%,part_number.ilike.%" + q + "%,kode_barang.ilike.%" + q + "%");
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
