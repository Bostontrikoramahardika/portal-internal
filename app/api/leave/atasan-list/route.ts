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
    return NextResponse.json({ atasan_list: [], pjo_nama: 'Belum diatur' })
  }

  const { data: employees } = await supabase
    .from('employees')
    .select('nrp, nama, jabatan, departemen, site')
    .in('nrp', atasanNrps)
    .eq('status_karyawan', 'Aktif')
    .order('nama')

  // Ambil info PJO dari matrix
  const { data: matrix } = await supabase
    .from('approval_matrix')
    .select('pjo_nrp')
    .eq('employee_nrp', session.nrp)
    .eq('active', true)
    .single()

  let pjo_nama = null
  if (matrix?.pjo_nrp) {
    const { data: pjoEmp } = await supabase
      .from('employees')
      .select('nama, jabatan')
      .eq('nrp', matrix.pjo_nrp)
      .single()

    if (pjoEmp) {
      pjo_nama = `${pjoEmp.nama} (${pjoEmp.jabatan})`
    }
  }

  return NextResponse.json({
    atasan_list: employees || [],
    pjo_nama: pjo_nama || 'Belum diatur oleh HRGA'
  })
}