import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabaseAdmin as supabase } from '@/app/lib/supabase'
import { getWitaToday } from '@/app/lib/timezone'

export async function GET(request: NextRequest) {
  // ─── Auth ──────────────────────────────────────────────────────────────────
  const token = request.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  // ─── Data karyawan login ───────────────────────────────────────────────────
  const { data: emp } = await supabase
    .from('employees')
    .select('site, departemen, jabatan')
    .eq('nrp', session.nrp)
    .single()

  const userSite    = emp?.site     || ''
  const userDept    = (emp?.departemen || '').toLowerCase()
  const userJabatan = (emp?.jabatan    || '').toLowerCase()

  // ─── Ambil site config (PATOKAN UTAMA) ────────────────────────────────────
  const { data: siteConfig } = await supabase
    .from('sites_config')
    .select('kode_site, nama_site, pjo_nrp, deputy_pjo_nrp')
    .eq('nama_site', userSite)
    .eq('active', true)
    .maybeSingle()

  const kodeSite     = siteConfig?.kode_site      || ''
  const primaryPjoNrp = siteConfig?.pjo_nrp       || null
  const deputyPjoNrp  = siteConfig?.deputy_pjo_nrp || null

  // ─── Helper: PJO dari sites_config ────────────────────────────────────────
  async function getPjoData() {
    if (!primaryPjoNrp) {
      return { nrp: null, nama: 'Belum ada PJO di Site ini' }
    }
    const { data: pjoEmp } = await supabase
      .from('employees')
      .select('nrp, nama, jabatan')
      .eq('nrp', primaryPjoNrp)
      .eq('status_karyawan', 'Aktif')
      .single()

    return {
      nrp:  pjoEmp?.nrp  || null,
      nama: pjoEmp
        ? `${pjoEmp.nama} (${pjoEmp.jabatan})`
        : 'Belum ada PJO di Site ini'
    }
  }

  // ─── Helper: Deputy dari sites_config ─────────────────────────────────────
  async function getDeputyData() {
    if (!deputyPjoNrp) return null
    const { data: depEmp } = await supabase
      .from('employees')
      .select('nrp, nama, jabatan')
      .eq('nrp', deputyPjoNrp)
      .eq('status_karyawan', 'Aktif')
      .single()

    return depEmp
      ? { nrp: depEmp.nrp, nama: `${depEmp.nama} (${depEmp.jabatan})` }
      : null
  }

  // ─── Helper: NRP by role scoped ke site ini ────────────────────────────────
  async function getRoleNrps(role: string): Promise<string[]> {
    // Ambil yang scope_site = kode site ini
    const { data: scoped } = await supabase
      .from('roles')
      .select('nrp')
      .eq('role', role)
      .eq('active', true)
      .eq('scope_site', kodeSite)

    const scopedNrps = (scoped || []).map((r: any) => r.nrp)

    // Fallback: scope_site NULL → filter by employees.site
    const { data: legacy } = await supabase
      .from('roles')
      .select('nrp')
      .eq('role', role)
      .eq('active', true)
      .is('scope_site', null)

    const legacyNrps = (legacy || []).map((r: any) => r.nrp)
    let legacySiteNrps: string[] = []

    if (legacyNrps.length > 0) {
      const { data: legacyEmps } = await supabase
        .from('employees')
        .select('nrp')
        .in('nrp', legacyNrps)
        .eq('site', userSite)
        .eq('status_karyawan', 'Aktif')

      legacySiteNrps = (legacyEmps || []).map((e: any) => e.nrp)
    }

    return [...new Set([...scopedNrps, ...legacySiteNrps])]
  }

  // ─── Deteksi direct-to-PJO ────────────────────────────────────────────────
  const isDirectPJO =
    userJabatan.includes('she')        ||
    userJabatan.includes('hrga')       ||
    userJabatan.includes('hr ')        ||
    userJabatan.includes('admin')      ||
    userJabatan.includes('gl ')        ||
    userJabatan.includes('supervisor') ||
    userJabatan.includes('manager')

  if (isDirectPJO) {
    const pjo    = await getPjoData()
    const deputy = await getDeputyData()

    return NextResponse.json({
      atasan_list:     [],
      pjo_nrp:         pjo.nrp,
      pjo_nama:        pjo.nama,
      deputy_pjo_nrp:  deputy?.nrp  || null,
      deputy_pjo_nama: deputy?.nama || null,
      is_direct_pjo:   true
    })
  }

  // ─── Non-direct: tentukan role atasan ─────────────────────────────────────
  let targetRole = 'gl_produksi'
  if      (userDept === 'plant')    targetRole = 'gl_plant'
  else if (userDept === 'operator') targetRole = 'gl_produksi'
  else                              targetRole = 'hr_site'

  const atasanNrps = await getRoleNrps(targetRole)

  let atasanList: any[] = []
  if (atasanNrps.length > 0) {
    const { data: employees } = await supabase
      .from('employees')
      .select('nrp, nama, jabatan, departemen, site')
      .in('nrp', atasanNrps)
      .eq('site', userSite)
      .eq('status_karyawan', 'Aktif')
      .order('nama')

    atasanList = (employees || []).filter((e: any) => e.nrp !== session.nrp)
  }

  const pjo    = await getPjoData()
  const deputy = await getDeputyData()

  return NextResponse.json({
    atasan_list:     atasanList,
    pjo_nrp:         pjo.nrp,
    pjo_nama:        pjo.nama,
    deputy_pjo_nrp:  deputy?.nrp  || null,
    deputy_pjo_nama: deputy?.nama || null,
    is_direct_pjo:   false
  })
}