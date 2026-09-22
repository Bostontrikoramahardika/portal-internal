import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase';
import { cookies } from 'next/headers';
import { getSession } from '@/app/lib/auth-cache';

async function checkHRPermission() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session_token')?.value;
  if (!sessionToken) return null;

  const session = await getSession(sessionToken);
  if (!session) return null;

  const allowedRoles = [
    'super_admin', 'hr_ho', 'hrga', 'hrga_pusat', 
    'hr_site', 'hrga_site', 'admin_site'
  ];

  const hasAccess = session.roles?.some((r: string) => allowedRoles.includes(r));
  return hasAccess ? session : null;
}

export async function GET() {
  try {
    const session = await checkHRPermission();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { data: positions, error: posErr } = await supabaseAdmin
      .from('recruitment_positions')
      .select('*')
      .order('jabatan', { ascending: true });

    if (posErr) throw posErr;

    const { data: applicants, error: appErr } = await supabaseAdmin
      .from('applicants')
      .select('*')
      .order('created_at', { ascending: false });

    if (appErr) throw appErr;

    return NextResponse.json({
      success: true,
      positions: positions || [],
      applicants: applicants || []
    });
  } catch (err: any) {
    console.error('Error GET /api/rekrutmen/hr:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await checkHRPermission();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'toggle_position') {
      const { id, is_open } = body;
      const { error } = await supabaseAdmin
        .from('recruitment_positions')
        .update({ is_open })
        .eq('id', id);

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Status lowongan diperbarui' });
    }

    if (action === 'add_position') {
      const { jabatan } = body;
      if (!jabatan || !jabatan.trim()) {
        return NextResponse.json({ success: false, message: 'Nama jabatan wajib diisi' }, { status: 400 });
      }

      const { data, error } = await supabaseAdmin
        .from('recruitment_positions')
        .insert({ jabatan: jabatan.trim(), is_open: true })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, position: data });
    }

    if (action === 'update_applicant') {
      const { id, status, catatan_hr } = body;
      const { error } = await supabaseAdmin
        .from('applicants')
        .update({
          status,
          catatan_hr,
          reviewed_by: `${session.nrp} - ${session.nama || ''}`.trim(),
          reviewed_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Status pelamar berhasil diperbarui' });
    }

    return NextResponse.json({ success: false, message: 'Action tidak valid' }, { status: 400 });
  } catch (err: any) {
    console.error('Error PATCH /api/rekrutmen/hr:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}