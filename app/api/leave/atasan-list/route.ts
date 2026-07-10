import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  // Ambil karyawan info (untuk tahu site-nya)
  const { data: emp } = await supabase
    .from('employees')
    .select('site')
    .eq('nrp', session.nrp)
    .single()

  // Ambil semua karyawan yang punya role atasan
  const { data: roleData } = await supabase
    .from('roles')
    .select('nrp')
    .in('role', ['atasan', 'pjo', 'admin_site', 'admin_plant'])
    .eq('active', true)

  const relevantNrps = (roleData || []).map(r => r.nrp)

  // 2. Ambil karyawan yang:
  //    - Satu site dengan user
  //    - Status Aktif
  //    - (Punya role di atas OR punya jabatan Leader: GL, Supervisor, Foreman, Manager)
  let atasanList: any[] = []
  
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('nrp, nama, jabatan, departemen, site, no_hp')
    .eq('site', emp?.site || '') // Filter Site Wajib
    .eq('status_karyawan', 'Aktif')
    .or(`nrp.in.(${relevantNrps.join(',')}),jabatan.ilike.%GL%,jabatan.ilike.%Supervisor%,jabatan.ilike.%Foreman%,jabatan.ilike.%Manager%`)
    .order('nama')

  if (!empError && employees) {
    // Filter tambahan untuk memastikan tidak ada duplikat dan bukan dirinya sendiri
    atasanList = employees.filter(e => e.nrp !== session.nrp)
  }

  // 3. Logika PJO (Tetap dipertahankan namun difilter by site lebih ketat)
  const { data: pjoRoles } = await supabase
    .from('roles')
    .select('nrp')
    .eq('role', 'pjo')
    .eq('active', true)

  const pjoNrps = (pjoRoles || []).map(r => r.nrp)

  let pjoNama = 'Belum ada PJO di Site ini'
  if (pjoNrps.length > 0) {
    const { data: sitePjo } = await supabase
      .from('employees')
      .select('nrp, nama, jabatan, site')
      .in('nrp', pjoNrps)
      .eq('site', emp?.site || '') // Harus satu site
      .eq('status_karyawan', 'Aktif')
      .single()

    if (sitePjo) {
      pjoNama = `${sitePjo.nama} (${sitePjo.jabatan}${sitePjo.site ? ' - ' + sitePjo.site : ''})`
    }
  }

  return NextResponse.json({
    atasan_list: atasanList,
    pjo_nama: pjoNama
  })
}