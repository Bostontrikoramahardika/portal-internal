import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  // 1. Ambil data karyawan yang login (site + departemen)
  const { data: emp } = await supabase
    .from('employees')
    .select('site, departemen, jabatan')
    .eq('nrp', session.nrp)
    .single()

  const userSite = emp?.site || ''
  const userDept = (emp?.departemen || '').toLowerCase()
  const userJabatan = (emp?.jabatan || '').toLowerCase()

  // 2. Deteksi apakah user termasuk direct-to-PJO
  const isDirectPJO =
    userJabatan.includes('she') ||
    userJabatan.includes('hrga') ||
    userJabatan.includes('hr ') ||
    userJabatan.includes('admin') ||
    userJabatan.includes('gl ') ||
    userJabatan.includes('supervisor') ||
    userJabatan.includes('manager')

  if (isDirectPJO) {
    // Langsung cari PJO di site yang sama
    const { data: pjoRoles } = await supabase
      .from('roles')
      .select('nrp')
      .eq('role', 'pjo_site')
      .eq('active', true)

    const pjoNrps = (pjoRoles || []).map((r: any) => r.nrp)
    let pjoNama = 'Belum ada PJO di Site ini'
    let pjoNrp = null

    if (pjoNrps.length > 0) {
      const { data: sitePjo } = await supabase
        .from('employees')
        .select('nrp, nama, jabatan, site')
        .in('nrp', pjoNrps)
        .eq('site', userSite)
        .eq('status_karyawan', 'Aktif')
        .maybeSingle()

      if (sitePjo) {
        pjoNama = `${sitePjo.nama} (${sitePjo.jabatan})`
        pjoNrp = sitePjo.nrp
      }
    }

    return NextResponse.json({
      atasan_list: [],
      pjo_nama: pjoNama,
      pjo_nrp: pjoNrp,
      is_direct_pjo: true
    })
  }

  // 3. Tentukan role atasan berdasarkan departemen
  let targetRole = 'gl_produksi' // default
  if (userDept === 'plant') {
    targetRole = 'gl_plant'
  } else if (userDept === 'operator') {
    targetRole = 'gl_produksi'
  } else {
    // Admin Site / Admin Plant → ke hr_site
    targetRole = 'hr_site'
  }

  // 4. Ambil NRP yang punya role target di site yang sama
  const { data: roleData } = await supabase
    .from('roles')
    .select('nrp')
    .eq('role', targetRole)
    .eq('active', true)

  const relevantNrps = (roleData || []).map((r: any) => r.nrp)

  let atasanList: any[] = []
  if (relevantNrps.length > 0) {
    const { data: employees } = await supabase
      .from('employees')
      .select('nrp, nama, jabatan, departemen, site')
      .eq('site', userSite)
      .eq('status_karyawan', 'Aktif')
      .in('nrp', relevantNrps)
      .order('nama')

    atasanList = (employees || []).filter((e: any) => e.nrp !== session.nrp)
  }

  // 5. Ambil info PJO site
  const { data: pjoRoles } = await supabase
    .from('roles')
    .select('nrp')
    .eq('role', 'pjo_site')
    .eq('active', true)

  const pjoNrps = (pjoRoles || []).map((r: any) => r.nrp)
  let pjoNama = 'Belum ada PJO di Site ini'

  if (pjoNrps.length > 0) {
    const { data: sitePjo } = await supabase
      .from('employees')
      .select('nrp, nama, jabatan, site')
      .in('nrp', pjoNrps)
      .eq('site', userSite)
      .eq('status_karyawan', 'Aktif')
      .maybeSingle()

    if (sitePjo) {
      pjoNama = `${sitePjo.nama} (${sitePjo.jabatan})`
    }
  }

  return NextResponse.json({
    atasan_list: atasanList,
    pjo_nama: pjoNama,
    is_direct_pjo: false
  })
}