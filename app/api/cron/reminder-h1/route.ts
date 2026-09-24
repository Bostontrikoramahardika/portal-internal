import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const secret =
    req.headers.get("x-cron-secret") ||
    req.nextUrl.searchParams.get("secret");

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const { data: rosters, error: rosterErr } = await supabaseAdmin
      .from("rosters")
      .select("nrp, shift, tanggal")
      .eq("tanggal", tomorrowStr);

    if (rosterErr) throw rosterErr;
    if (!rosters || rosters.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No roster for tomorrow",
        date: tomorrowStr,
      });
    }

    const nrps = [...new Set(rosters.map((r: any) => r.nrp))];

    const { data: karyawan } = await supabaseAdmin
      .from("karyawan")
      .select("nrp, nama")
      .in("nrp", nrps);

    const karyawanMap = new Map(
      (karyawan || []).map((k: any) => [k.nrp, k.nama])
    );

    const { data: subs } = await supabaseAdmin
      .from("push_subscriptions")
      .select("nrp, endpoint, p256dh, auth")
      .in("nrp", nrps);

    let sentCount = 0;

    if (subs && subs.length > 0) {
      try {
        const webpush = await import("web-push");
        webpush.default.setVapidDetails(
          process.env.VAPID_SUBJECT || "mailto:absensippa@gmail.com",
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
          process.env.VAPID_PRIVATE_KEY!
        );

        for (const sub of subs) {
          const nama = karyawanMap.get(sub.nrp) || sub.nrp;
          const roster = rosters.find((r: any) => r.nrp === sub.nrp);
          const shiftRaw = (roster?.shift || "").toUpperCase();
          const shiftLabel =
            shiftRaw === "MALAM"
              ? "Malam (18:00-05:00)"
              : "Siang (06:00-17:00)";

          const payload = JSON.stringify({
            title: "Reminder Shift Besok",
            body:
              nama +
              ", besok kamu shift " +
              shiftLabel +
              ". Clock-in tepat waktu!",
            url: "/dashboard",
          });

          try {
            await webpush.default.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth },
              },
              payload
            );
            sentCount++;
          } catch (pushErr) {
            console.error("Push failed for " + sub.nrp, pushErr);
          }
        }
      } catch (wpErr) {
        console.error("web-push module error", wpErr);
      }
    }

    let notifCount = 0;
    for (const nrp of nrps) {
      const nama = karyawanMap.get(nrp) || nrp;
      const roster = rosters.find((r: any) => r.nrp === nrp);
      const shiftRaw = (roster?.shift || "").toUpperCase();
      const shiftLabel = shiftRaw === "MALAM" ? "Malam" : "Siang";

      await supabaseAdmin.from("notifications").insert({
        nrp: nrp,
        title: "Reminder Shift Besok",
        message:
          "Besok kamu shift " +
          shiftLabel +
          " (" +
          tomorrowStr +
          "). Clock-in tepat waktu!",
        type: "reminder",
        is_read: false,
      });
      notifCount++;
    }

    return NextResponse.json({
      success: true,
      date: tomorrowStr,
      total_roster: rosters.length,
      unique_employees: nrps.length,
      push_sent: sentCount,
      notifications_created: notifCount,
    });
  } catch (err: any) {
    console.error("Cron reminder error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
