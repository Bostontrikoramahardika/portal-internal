import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const siteParam = searchParams.get('site') || 'PPA-MLP';

    // Query real employees from employees table
    const { data: employees, error } = await supabase
      .from('employees')
      .select('id, nrp, nama, jabatan, departemen, site, no_hp, status_karyawan')
      .order('nama', { ascending: true });

    if (error) throw error;

    let realCrew = employees || [];

    // Filter for Plant department or PPA-MLP site
    if (siteParam && siteParam !== 'ALL') {
      const siteUpper = siteParam.toUpperCase();
      realCrew = realCrew.filter((e: any) => {
        const matchSite = e.site ? String(e.site).toUpperCase().includes('MLP') || String(e.site).toUpperCase().includes(siteUpper) : true;
        const matchDept = e.departemen ? String(e.departemen).toLowerCase().includes('plant') || String(e.jabatan).toLowerCase().includes('plant') || String(e.jabatan).toLowerCase().includes('mekanik') : true;
        return matchSite && matchDept;
      });
    }

    return NextResponse.json({ success: true, data: realCrew });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message, data: [] }, { status: 500 });
  }
}
