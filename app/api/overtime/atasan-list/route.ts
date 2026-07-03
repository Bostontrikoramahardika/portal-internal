import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  // Ambil semua karyawan yang punya role atasan
  const { data: roleRows } = await supabase
    .from('roles')
    .select('nrp')
    .eq('role', 'atasan')
    .eq('active', true)

  const atasanNrps = (roleRows || []).map(r => r.nrp)

  if (atasanNrps.length === 0) {
    return NextResponse.json({ atasan_list: [] })
  }

  const { data: employees } = await supabase
    .from('employees')
    .select('nrp, nama, jabatan, departemen, site')
    .in('nrp', atasanNrps)
    .eq('status_karyawan', 'Aktif')
    .order('nama')

  return NextResponse.json({
    atasan_list: employees || []
  })
}