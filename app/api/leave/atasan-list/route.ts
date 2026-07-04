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
  const { data: atasanRoles } = await supabase
    .from('roles')
    .select('nrp')
    .eq('role', 'atasan')
    .eq('active', true)

  const atasanNrps = (atasanRoles || []).map(r => r.nrp)

  let atasanList: any[] = []
  if (atasanNrps.length > 0) {
    const { data: employees } = await supabase
      .from('employees')
      .select('nrp, nama, jabatan, departemen, site, no_hp')
      .in('nrp', atasanNrps)
      .eq('status_karyawan', 'Aktif')
      .order('nama')

    atasanList = employees || []
  }

  // Ambil semua PJO (untuk info karyawan siapa PJO-nya)
  const { data: pjoRoles } = await supabase
    .from('roles')
    .select('nrp')
    .eq('role', 'pjo')
    .eq('active', true)

  const pjoNrps = (pjoRoles || []).map(r => r.nrp)

  let pjoNama = 'Belum ada PJO'
  if (pjoNrps.length > 0) {
    // Cari PJO yang site-nya sama dengan karyawan
    let pjoQuery = supabase
      .from('employees')
      .select('nrp, nama, jabatan, site')
      .in('nrp', pjoNrps)
      .eq('status_karyawan', 'Aktif')

    const { data: allPjo } = await pjoQuery

    if (allPjo && allPjo.length > 0) {
      // Prioritas: PJO dengan site yang sama
      const samePjo = allPjo.find((p: any) => p.site === emp?.site)
      const chosenPjo = samePjo || allPjo[0]

      pjoNama = `${chosenPjo.nama} (${chosenPjo.jabatan}${chosenPjo.site ? ' - ' + chosenPjo.site : ''})`
    }
  }

  return NextResponse.json({
    atasan_list: atasanList,
    pjo_nama: pjoNama
  })
}