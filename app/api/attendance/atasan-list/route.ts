import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  // 1. Ambil site karyawan
  const { data: emp } = await supabase.from('employees').select('site').eq('nrp', session.nrp).single()

  // 2. Ambil NRP yang punya role atasan/pjo/admin_site
  const { data: roleData } = await supabase
    .from('roles')
    .select('nrp')
    .in('role', ['atasan', 'pjo', 'admin_site'])
    .eq('active', true)

  const relevantNrps = (roleData || []).map(r => r.nrp)

  // 3. Ambil daftar atasan yang satu site & (punya role OR jabatan leader)
  const { data: atasanList } = await supabase
    .from('employees')
    .select('nrp, nama, jabatan')
    .eq('site', emp?.site || '')
    .eq('status_karyawan', 'Aktif')
    .or(`nrp.in.(${relevantNrps.join(',')}),jabatan.ilike.%GL%,jabatan.ilike.%Supervisor%,jabatan.ilike.%Foreman%,jabatan.ilike.%Manager%`)
    .order('nama')

  return NextResponse.json({ 
    atasan_list: (atasanList || []).filter(e => e.nrp !== session.nrp) 
  })
}