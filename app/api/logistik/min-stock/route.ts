import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export async function GET() {
  try {
    const { data: items, error } = await supabaseAdmin
      .from("stock_barang")
      .select("*")
      .order("stok", { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const lowStockItems = (items || []).filter(function(it: any) {
      const min = Number(it.min_stok || 0);
      const current = Number(it.stok || 0);
      return current <= min;
    }).map(function(it: any) {
      const min = Number(it.min_stok || 0);
      const current = Number(it.stok || 0);
      return {
        ...it,
        status_level: current <= 0 ? "OUT_OF_STOCK" : "LOW_STOCK",
        deficit: Math.max(0, min - current)
      };
    });

    return NextResponse.json({
      success: true,
      total_low_stock: lowStockItems.length,
      critical_count: lowStockItems.filter(function(x: any) { return x.status_level === "OUT_OF_STOCK"; }).length,
      warning_count: lowStockItems.filter(function(x: any) { return x.status_level === "LOW_STOCK"; }).length,
      items: lowStockItems
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(function() { return {}; });
    const triggeredBy = body.triggered_by || "System Automated Check";

    const { data: items, error } = await supabaseAdmin
      .from("stock_barang")
      .select("*")
      .order("stok", { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const critical = (items || []).filter(function(it: any) {
      return Number(it.stok || 0) <= Number(it.min_stok || 0);
    });

    if (critical.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Seluruh stok saat ini dalam kondisi aman (di atas batas minimum).",
        dispatched: 0
      });
    }

    let summaryNames = critical.slice(0, 3).map(function(c: any) { return c.nama_barang + " (" + c.stok + " " + (c.satuan || "PCS") + ")"; }).join(", ");
    if (critical.length > 3) {
      summaryNames += " + " + (critical.length - 3) + " item lainnya";
    }

    const { data: targetUsers } = await supabaseAdmin
      .from("roles")
      .select("nrp, role")
      .in("role", ["logistik", "admin_logistik", "pjo", "plant_admin", "admin", "superadmin"]);

    let notificationsToInsert: any[] = [];
    const nowIso = new Date().toISOString();

    if (targetUsers && targetUsers.length > 0) {
      const uniqueNrps = Array.from(new Set(targetUsers.map(function(u: any) { return u.nrp; })));
      notificationsToInsert = uniqueNrps.map(function(targetNrp) {
        return {
          nrp: targetNrp,
          title: "PERINGATAN STOK MINIMUM: " + critical.length + " Part Menipis",
          message: "Perhatian Logistik: Item " + summaryNames + " telah mencapai atau berada di bawah batas minimum stok. Segera proses Purchase Request (PR).",
          type: "alert",
          is_read: false,
          created_at: nowIso
        };
      });

      await supabaseAdmin.from("notifications").insert(notificationsToInsert);
    }

    return NextResponse.json({
      success: true,
      message: "Berhasil mengirimkan " + notificationsToInsert.length + " peringatan stok minimum ke tim Logistik & Manajemen.",
      critical_items_count: critical.length,
      dispatched: notificationsToInsert.length
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 });
  }
}
