import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('recruitment_positions')
      .select('id, jabatan')
      .eq('is_open', true)
      .order('jabatan', { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      positions: data || []
    });
  } catch (err: any) {
    console.error('Error GET /api/rekrutmen:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const posisi_dilamar = formData.get('posisi_dilamar') as string;
    const nama_lengkap = formData.get('nama_lengkap') as string;
    const domisili = formData.get('domisili') as string;
    const alamat_lengkap = formData.get('alamat_lengkap') as string;
    const desa = formData.get('desa') as string;
    const kecamatan = formData.get('kecamatan') as string;
    const kabupaten = formData.get('kabupaten') as string;
    const provinsi = formData.get('provinsi') as string;
    const no_hp = formData.get('no_hp') as string;
    const email = formData.get('email') as string;

    const ktpFile = formData.get('ktp_file') as File | null;
    const cvFile = formData.get('cv_file') as File | null;

    if (!posisi_dilamar || !nama_lengkap || !no_hp) {
      return NextResponse.json({
        success: false,
        message: 'Posisi, Nama Lengkap, dan No. HP wajib diisi'
      }, { status: 400 });
    }

    const timestamp = Date.now();
    const cleanName = nama_lengkap.toLowerCase().replace(/[^a-z0-9]/g, '_');

    let foto_ktp_url = '';
    let cv_url = '';

    if (ktpFile && ktpFile.size > 0) {
      const ext = ktpFile.name.split('.').pop() || 'jpg';
      const path = `ktp/${cleanName}_${timestamp}.${ext}`;
      const buffer = Buffer.from(await ktpFile.arrayBuffer());

      const { error: uploadError } = await supabaseAdmin.storage
        .from('recruitment')
        .upload(path, buffer, {
          contentType: ktpFile.type,
          upsert: true
        });

      if (!uploadError) {
        const { data: publicUrlData } = supabaseAdmin.storage
          .from('recruitment')
          .getPublicUrl(path);
        foto_ktp_url = publicUrlData.publicUrl;
      }
    }

    if (cvFile && cvFile.size > 0) {
      const ext = cvFile.name.split('.').pop() || 'pdf';
      const path = `cv/${cleanName}_${timestamp}.${ext}`;
      const buffer = Buffer.from(await cvFile.arrayBuffer());

      const { error: uploadError } = await supabaseAdmin.storage
        .from('recruitment')
        .upload(path, buffer, {
          contentType: cvFile.type,
          upsert: true
        });

      if (!uploadError) {
        const { data: publicUrlData } = supabaseAdmin.storage
          .from('recruitment')
          .getPublicUrl(path);
        cv_url = publicUrlData.publicUrl;
      }
    }

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('applicants')
      .insert({
        posisi_dilamar,
        nama_lengkap,
        domisili,
        alamat_lengkap,
        desa,
        kecamatan,
        kabupaten,
        provinsi,
        no_hp,
        email,
        foto_ktp_url,
        cv_url,
        status: 'BARU'
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({
      success: true,
      message: 'Lamaran Anda berhasil dikirim!',
      data: inserted
    });
  } catch (err: any) {
    console.error('Error POST /api/rekrutmen:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}