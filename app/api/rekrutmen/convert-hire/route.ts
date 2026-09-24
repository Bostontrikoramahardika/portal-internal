import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSession } from "@/app/lib/auth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("session_token")?.value;
    const session = token ? await getSession(token) : null;
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      applicant_id,
      site = "PPA-MLP",
      department = "OPERATIONAL",
      jabatan,
      status_kerja = "PKWT",
      tanggal_masuk,
      custom_nrp,
    } = body;

    if (!applicant_id) {
      return NextResponse.json(
        { error: "Applicant ID wajib diisi" },
        { status: 400 }
      );
    }

    // 1. Ambil data pelamar
    const { data: applicant, error: appErr } = await supabaseAdmin
      .from("applicants")
      .select("*")
      .eq("id", applicant_id)
      .single();

    if (appErr || !applicant) {
      return NextResponse.json(
        { error: "Data pelamar tidak ditemukan" },
        { status: 404 }
      );
    }

    // 2. Tentukan NRP Baru
    let finalNrp = (custom_nrp || "").trim();

    if (!finalNrp) {
      const yearPrefix = new Date().getFullYear().toString().slice(-2); // "26"
      const { data: existingKaryawan } = await supabaseAdmin
        .from("employees")
        .select("nrp")
        .ilike("nrp", yearPrefix + "%")
        .order("nrp", { ascending: false })
        .limit(1);

      if (existingKaryawan && existingKaryawan.length > 0) {
        const lastNrp = existingKaryawan[0].nrp;
        const numericPart = parseInt(lastNrp.slice(2), 10);
        const nextNum = isNaN(numericPart) ? 1 : numericPart + 1;
        finalNrp = yearPrefix + String(nextNum).padStart(5, "0");
      } else {
        finalNrp = yearPrefix + "00001";
      }
    }

    // Cek duplikasi NRP di employees
    const { data: dupNrp } = await supabaseAdmin
      .from("employees")
      .select("nrp")
      .eq("nrp", finalNrp)
      .single();

    if (dupNrp) {
      return NextResponse.json(
        { error: "NRP " + finalNrp + " sudah terdaftar di sistem. Gunakan NRP lain." },
        { status: 400 }
      );
    }

    const tglMasuk =
      tanggal_masuk || new Date().toISOString().split("T")[0];
    const namaKandidat = applicant.nama_lengkap || applicant.nama;
    const posisiFinal =
      jabatan || applicant.posisi_dilamar || "OPERATOR";

    // 3. Insert ke master tabel employees
    const newEmployeeData = {
      nrp: finalNrp,
      nama: namaKandidat,
      jabatan: posisiFinal,
      department: department,
      site: site,
      status_kerja: status_kerja,
      tanggal_masuk: tglMasuk,
      telepon: applicant.no_hp || applicant.telepon || "",
      email: applicant.email || "",
      perusahaan: "PT. BOSTON PPA - MLP",
      is_active: true,
    };

    const { error: insertKaryawanErr } = await supabaseAdmin
      .from("employees")
      .insert(newEmployeeData);

    if (insertKaryawanErr) {
      console.error("Gagal insert employees:", insertKaryawanErr);
      return NextResponse.json(
        { error: "Gagal membuat data karyawan: " + insertKaryawanErr.message },
        { status: 500 }
      );
    }

    // 4. Insert default role ke tabel roles
    await supabaseAdmin.from("roles").insert({
      nrp: finalNrp,
      role: "karyawan",
    });

    // 5. Update data applicant jadi 'HIRED'
    await supabaseAdmin
      .from("applicants")
      .update({
        status: "HIRED",
        hired_nrp: finalNrp,
        hired_at: new Date().toISOString(),
      })
      .eq("id", applicant_id);

    // 6. Buat notifikasi ke user yang baru di-hire
    await supabaseAdmin.from("notifications").insert({
      nrp: finalNrp,
      title: "Selamat Datang di PT. Boston PPA MLP!",
      message:
        "Akun portal kamu sudah aktif dengan NRP: " +
        finalNrp +
        ". Selamat bergabung!",
      type: "general",
      is_read: false,
    });

    return NextResponse.json({
      success: true,
      message: "Pelamar berhasil dikonversi menjadi Karyawan!",
      employee: {
        nrp: finalNrp,
        nama: namaKandidat,
        jabatan: posisiFinal,
        site: site,
        department: department,
      },
    });
  } catch (err: any) {
    console.error("Convert hire error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
