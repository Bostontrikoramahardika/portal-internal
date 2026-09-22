const fs = require('fs');
const path = require('path');

// Tentukan folder tujuan
const dir1 = path.join(__dirname, 'app', 'api', 'rekrutmen');
const dir2 = path.join(__dirname, 'app', 'api', 'rekrutmen', 'hr');

// Buat folder jika belum ada
fs.mkdirSync(dir2, { recursive: true });

// Isi Kode untuk app/api/rekrutmen/route.ts
const code1 = `import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('recruitment_positions')
      .select('id, jabatan')
      .eq('is_open', true)
      .order('jabatan', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, positions: data || [] });
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
      return NextResponse.json({ success: false, message: 'Wajib diisi' }, { status: 400 });
    }

    const timestamp = Date.now();
    const cleanName = nama_lengkap.toLowerCase().replace(/[^a-z0-9]/g, '_');

    let foto_ktp_url = '';
    let cv_url = '';

    if (ktpFile && ktpFile.size > 0) {
      const ext = ktpFile.name.split('.').pop() || 'jpg';
      const filePath = \`ktp/\${cleanName}_\${timestamp}.\${ext}\`;
      const buffer = Buffer.from(await ktpFile.arrayBuffer());

      const { error: uploadError } = await supabaseAdmin.storage
        .from('recruitment')
        .upload(filePath, buffer, { contentType: ktpFile.type, upsert: true });

      if (!uploadError) {
        const { data: publicUrlData } = supabaseAdmin.storage
          .from('recruitment')
          .getPublicUrl(filePath);
        foto_ktp_url = publicUrlData.publicUrl;
      }
    }

    if (cvFile && cvFile.size > 0) {
      const ext = cvFile.name.split('.').pop() || 'pdf';
      const filePath = \`cv/\${cleanName}_\${timestamp}.\${ext}\`;
      const buffer = Buffer.from(await cvFile.arrayBuffer());

      const { error: uploadError } = await supabaseAdmin.storage
        .from('recruitment')
        .upload(filePath, buffer, { contentType: cvFile.type, upsert: true });

      if (!uploadError) {
        const { data: publicUrlData } = supabaseAdmin.storage
          .from('recruitment')
          .getPublicUrl(filePath);
        cv_url = publicUrlData.publicUrl;
      }
    }

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('applicants')
      .insert({ posisi_dilamar, nama_lengkap, domisili, alamat_lengkap, desa, kecamatan, kabupaten, provinsi, no_hp, email, foto_ktp_url, cv_url, status: 'BARU' })
      .select().single();

    if (insertError) throw insertError;

    return NextResponse.json({ success: true, message: 'Sukses', data: inserted });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}`;

// Isi Kode untuk app/api/rekrutmen/hr/route.ts
const code2 = `import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase';
import { cookies } from 'next/headers';
import { getSession } from '@/app/lib/auth-cache';

async function checkHRPermission() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session_token')?.value;
  if (!sessionToken) return null;

  const session = await getSession(sessionToken);
  if (!session) return null;

  const allowedRoles = ['super_admin', 'hr_ho', 'hrga', 'hrga_pusat', 'hr_site', 'hrga_site', 'admin_site'];
  const hasAccess = session.roles?.some((r: string) => allowedRoles.includes(r));
  return hasAccess ? session : null;
}

export async function GET() {
  try {
    const session = await checkHRPermission();
    if (!session) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { data: positions, error: posErr } = await supabaseAdmin
      .from('recruitment_positions').select('*').order('jabatan', { ascending: true });
    if (posErr) throw posErr;

    const { data: applicants, error: appErr } = await supabaseAdmin
      .from('applicants').select('*').order('created_at', { ascending: false });
    if (appErr) throw appErr;

    return NextResponse.json({ success: true, positions: positions || [], applicants: applicants || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await checkHRPermission();
    if (!session) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    if (action === 'toggle_position') {
      const { id, is_open } = body;
      const { error } = await supabaseAdmin.from('recruitment_positions').update({ is_open }).eq('id', id);
      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Sukses' });
    }

    if (action === 'add_position') {
      const { jabatan } = body;
      if (!jabatan || !jabatan.trim()) return NextResponse.json({ success: false, message: 'Wajib' }, { status: 400 });

      const { data, error } = await supabaseAdmin.from('recruitment_positions').insert({ jabatan: jabatan.trim(), is_open: true }).select().single();
      if (error) throw error;
      return NextResponse.json({ success: true, position: data });
    }

    if (action === 'update_applicant') {
      const { id, status, catatan_hr } = body;
      const { error } = await supabaseAdmin.from('applicants').update({
        status,
        catatan_hr,
        reviewed_by: \`\${session.nrp} - \${session.nama || ''}\`.trim(),
        reviewed_at: new Date().toISOString()
      }).eq('id', id);

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Sukses' });
    }

    return NextResponse.json({ success: false, message: 'Invalid' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}`;

// Tulis file
fs.writeFileSync(path.join(dir1, 'route.ts'), code1, 'utf8');
fs.writeFileSync(path.join(dir2, 'route.ts'), code2, 'utf8');

console.log('--- SUCCESS: KEDUA FILE API BERHASIL DIBUAT ---');