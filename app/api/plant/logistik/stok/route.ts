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
    const site = searchParams.get("site");
    const q = searchParams.get("q") || "";

    let query = supabase.from("stock_barang").select("*").order("nama_barang", { ascending: true });
    if (site) {
      query = query.eq("site", site);
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
