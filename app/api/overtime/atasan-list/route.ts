import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabaseAdmin as supabase } from '@/app/lib/supabase'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  const { data: emp } = await supabase
    .from('employees')
    .select('site, departemen, jabatan')
    .eq('nrp', session.nrp)
    .single()

  const userSite = emp?.site || ''
  const userDept = (emp?.departemen || '').toLowerCase()
  const userJabatan = (emp?.jabatan || '').toLowerCase()

  // Deteksi direct-to-PJO
  const isDirectPJO =
    userJabatan.includes('she') ||
    userJabatan.includes('hrga') ||
    userJabatan.includes('hr ') ||
    userJabatan.includes('admin') ||
    userJabatan.includes('gl ') ||
    userJabatan.includes('supervisor') ||
    userJabatan.includes('manager')

  // Helper: cari PJO di site yang sama
  async function getPjoSite() {
    const { data: pjoRoles } = await supabase
      .from('roles')
      .select('nrp')
      .eq('role', 'pjo_site')
      .eq('active', true)

    const pjoNrps = (pjoRoles || []).map((r: any) => r.nrp)
    if (pjoNrps.length === 0) return { nrp: null, nama: 'Belum ada PJO di Site ini' }

    const { data: sitePjo } = await supabase
      .from('employees')
      .select('nrp, nama, jabatan')
      .in('nrp', pjoNrps)
      .eq('site', userSite)
      .eq('status_karyawan', 'Aktif')
      .maybeSingle()

    return {
      nrp: sitePjo?.nrp || null,
      nama: sitePjo ? `${sitePjo.nama} (${sitePjo.jabatan})` : 'Belum ada PJO di Site ini'
    }
  }

  if (isDirectPJO) {
    const pjo = await getPjoSite()
    return NextResponse.json({
      atasan_list: [],
      pjo_nama: pjo.nama,
      pjo_nrp: pjo.nrp,
      is_direct_pjo: true
    })
  }

  // Tentukan role atasan
  let targetRole = 'gl_produksi'
  if (userDept === 'plant') {
    targetRole = 'gl_plant'
  } else if (userDept === 'operator') {
    targetRole = 'gl_produksi'
  } else {
    targetRole = 'hr_site'
  }

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

  const pjo = await getPjoSite()

  return NextResponse.json({
    atasan_list: atasanList,
    pjo_nama: pjo.nama,
    pjo_nrp: pjo.nrp,
    is_direct_pjo: false
  })
}