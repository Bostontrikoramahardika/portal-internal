// app/api/attendance/atasan-list/route.ts
// v2.0 - Chat 27: Site-based + supabaseAdmin + PJO dari sites_config
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  // 1. Ambil data karyawan yang login
  const { data: emp } = await supabaseAdmin
    .from('employees')
    .select('site, departemen, jabatan')
    .eq('nrp', session.nrp)
    .single()

  const userSite = emp?.site || ''
  const userDept = (emp?.departemen || '').toLowerCase()
  const userJabatan = (emp?.jabatan || '').toLowerCase()

  // 2. Ambil site config untuk PJO & Deputy
  const { data: siteConfig } = await supabaseAdmin
    .from('sites_config')
    .select('pjo_nrp, deputy_pjo_nrp')
    .eq('nama_site', userSite)
    .eq('active', true)
    .maybeSingle()

  const pjoNrp = siteConfig?.pjo_nrp || null
  const deputyNrp = siteConfig?.deputy_pjo_nrp || null

  // Ambil detail PJO & Deputy
  const pjoDeputyNrps = [pjoNrp, deputyNrp].filter(Boolean)
  let pjoInfo: any = { nrp: null, nama: 'Belum ada PJO di Site ini', jabatan: '' }
  let deputyInfo: any = null

  if (pjoDeputyNrps.length > 0) {
    const { data: pjoEmps } = await supabaseAdmin
      .from('employees')
      .select('nrp, nama, jabatan')
      .in('nrp', pjoDeputyNrps)
      .eq('status_karyawan', 'Aktif')

    if (pjoEmps) {
      const pjoEmp = pjoEmps.find((e: any) => e.nrp === pjoNrp)
      const deputyEmp = pjoEmps.find((e: any) => e.nrp === deputyNrp)

      if (pjoEmp) {
        pjoInfo = { nrp: pjoEmp.nrp, nama: pjoEmp.nama, jabatan: pjoEmp.jabatan }
      }
      if (deputyEmp) {
        deputyInfo = { nrp: deputyEmp.nrp, nama: deputyEmp.nama, jabatan: deputyEmp.jabatan }
      }
    }
  }

  // 3. Deteksi user direct-to-PJO
  const isDirectPJO =
    userJabatan.includes('she') ||
    userJabatan.includes('hrga') ||
    userJabatan.includes('hr ') ||
    userJabatan.includes('admin') ||
    userJabatan.includes('gl ') ||
    userJabatan.includes('supervisor') ||
    userJabatan.includes('manager')

  if (isDirectPJO) {
    return NextResponse.json({
      atasan_list: [],
      pjo_nama: pjoInfo.nama + (pjoInfo.jabatan ? ` (${pjoInfo.jabatan})` : ''),
      pjo_nrp: pjoInfo.nrp,
      deputy_nama: deputyInfo ? `${deputyInfo.nama} (${deputyInfo.jabatan})` : null,
      deputy_nrp: deputyInfo?.nrp || null,
      is_direct_pjo: true
    })
  }

  // 4. Tentukan role atasan berdasarkan departemen
  let targetRole = 'gl_produksi'
  if (userDept === 'plant') {
    targetRole = 'gl_plant'
  } else if (userDept === 'operator') {
    targetRole = 'gl_produksi'
  } else {
    targetRole = 'hr_site'
  }

  // 5. Ambil NRP yang punya role target DI SITE YANG SAMA (scope_site)
  const { data: roleData } = await supabaseAdmin
    .from('roles')
    .select('nrp')
    .eq('role', targetRole)
    .eq('active', true)
    .or(`scope_site.eq.${userSite},scope_site.is.null`)

  const relevantNrps = (roleData || []).map((r: any) => r.nrp)

  let atasanList: any[] = []
  if (relevantNrps.length > 0) {
    const { data: employees } = await supabaseAdmin
      .from('employees')
      .select('nrp, nama, jabatan, departemen, site')
      .eq('site', userSite)
      .eq('status_karyawan', 'Aktif')
      .in('nrp', relevantNrps)
      .order('nama')

    atasanList = (employees || []).filter((e: any) => e.nrp !== session.nrp)
  }

  return NextResponse.json({
    atasan_list: atasanList,
    pjo_nama: pjoInfo.nama + (pjoInfo.jabatan ? ` (${pjoInfo.jabatan})` : ''),
    pjo_nrp: pjoInfo.nrp,
    deputy_nama: deputyInfo ? `${deputyInfo.nama} (${deputyInfo.jabatan})` : null,
    deputy_nrp: deputyInfo?.nrp || null,
    is_direct_pjo: false
  })
}