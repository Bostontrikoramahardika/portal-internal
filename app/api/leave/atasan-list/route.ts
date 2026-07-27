import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabaseAdmin as supabase } from '@/app/lib/supabase' // ✅ Fix: pakai Admin
import { getWitaToday } from '@/app/lib/timezone'

export async function GET(request: NextRequest) {
  // ─── Auth ─────────────────────────────────────────────────────────────────
  const token = request.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  // ─── Data karyawan login ───────────────────────────────────────────────────
  const { data: emp } = await supabase
    .from('employees')
    .select('site, departemen, jabatan, eligible_tiket_pesawat')
    .eq('nrp', session.nrp)
    .single()

  const userSite = emp?.site || ''
  const userDept = (emp?.departemen || '').toLowerCase()
  const userJabatan = (emp?.jabatan || '').toLowerCase()

  // ─── Sisa cuti tahunan ────────────────────────────────────────────────────
  // ✅ Fix: pakai WITA bukan new Date()
  const currentYear = parseInt(getWitaToday().split('-')[0])

  const { data: balanceRow } = await supabase
    .from('annual_leave_balances')
    .select('hak_awal, terpakai, penyesuaian')
    .eq('nrp', session.nrp)
    .eq('tahun', currentYear)
    .maybeSingle() // ← ini OK, NRP+tahun = 1 row pasti

  const sisaCutiTahunan = Math.max(
    0,
    balanceRow
      ? Number(balanceRow.hak_awal || 12) +
          Number(balanceRow.penyesuaian || 0) -
          Number(balanceRow.terpakai || 0)
      : 12
  )

  // ─── Ambil config site (PATOKAN UTAMA) ────────────────────────────────────
  const { data: siteConfig } = await supabase
    .from('sites_config')
    .select('kode_site, nama_site, pjo_nrp, deputy_pjo_nrp')
    .eq('nama_site', userSite)
    .eq('active', true)
    .maybeSingle() // ← OK, 1 site = 1 config

  const primaryPjoNrp    = siteConfig?.pjo_nrp || null
  const deputyPjoNrp     = siteConfig?.deputy_pjo_nrp || null
  const kodeSite         = siteConfig?.kode_site || ''

  // ─── Helper: ambil data karyawan berdasarkan NRP list ─────────────────────
  async function getEmployeesByNrp(nrpList: string[]) {
    if (nrpList.length === 0) return []
    const { data } = await supabase
      .from('employees')
      .select('nrp, nama, jabatan, departemen, site')
      .in('nrp', nrpList)
      .eq('site', userSite)
      .eq('status_karyawan', 'Aktif')
      .order('nama')
    return data || []
  }

  // ─── Helper: ambil NRP by role DI SITE INI ────────────────────────────────
  // Pakai scope_site kalau ada, fallback ke filter site di employees
  async function getNrpByRole(role: string): Promise<string[]> {
    // Coba ambil dengan scope_site dulu
    const { data: withScope } = await supabase
      .from('roles')
      .select('nrp')
      .eq('role', role)
      .eq('active', true)
      .eq('scope_site', kodeSite) // ← filter per site

    if (withScope && withScope.length > 0) {
      return withScope.map((r: any) => r.nrp)
    }

    // Fallback: ambil semua role tsb, filter by site di employees
    const { data: allRoles } = await supabase
      .from('roles')
      .select('nrp')
      .eq('role', role)
      .eq('active', true)

    const allNrps = (allRoles || []).map((r: any) => r.nrp)
    if (allNrps.length === 0) return []

    const { data: siteEmps } = await supabase
      .from('employees')
      .select('nrp')
      .in('nrp', allNrps)
      .eq('site', userSite)
      .eq('status_karyawan', 'Aktif')

    return (siteEmps || []).map((e: any) => e.nrp)
  }

  // ─── PJO Data (dari sites_config — BUKAN dari roles) ──────────────────────
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
      nrp: pjoEmp?.nrp || null,
      nama: pjoEmp
        ? `${pjoEmp.nama} (${pjoEmp.jabatan})`
        : 'Belum ada PJO di Site ini'
    }
  }

  // ─── Deputy PJO Data ──────────────────────────────────────────────────────
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

  // ─── Deteksi direct-to-PJO ────────────────────────────────────────────────
  const isDirectPJO =
    userJabatan.includes('she') ||
    userJabatan.includes('hrga') ||
    userJabatan.includes('hr ') ||
    userJabatan.includes('admin') ||
    userJabatan.includes('gl ') ||
    userJabatan.includes('supervisor') ||
    userJabatan.includes('manager')

  if (isDirectPJO) {
    const pjo    = await getPjoData()
    const deputy = await getDeputyData()

    return NextResponse.json({
      atasan_list:             [],
      pjo_nrp:                 pjo.nrp,
      pjo_nama:                pjo.nama,
      deputy_pjo_nrp:          deputy?.nrp || null,
      deputy_pjo_nama:         deputy?.nama || null,
      is_direct_pjo:           true,
      eligible_tiket_pesawat:  !!emp?.eligible_tiket_pesawat,
      sisa_cuti_tahunan:       sisaCutiTahunan,
      tahun_cuti:              currentYear
    })
  }

  // ─── Non-direct: cari atasan (GL / HR Site) ───────────────────────────────
  let targetRole = 'gl_produksi'
  if (userDept === 'plant') {
    targetRole = 'gl_plant'
  } else if (userDept === 'operator') {
    targetRole = 'gl_produksi'
  } else {
    targetRole = 'hr_site'
  }

  // Ambil NRP atasan di site ini
  const atasanNrps = await getNrpByRole(targetRole)

  // Ambil data lengkap atasan
  let atasanList: any[] = []
  if (atasanNrps.length > 0) {
    const allAtasan = await getEmployeesByNrp(atasanNrps)
    // Exclude diri sendiri
    atasanList = allAtasan.filter((e: any) => e.nrp !== session.nrp)
  }

  const pjo    = await getPjoData()
  const deputy = await getDeputyData()

  return NextResponse.json({
    atasan_list:             atasanList,
    pjo_nrp:                 pjo.nrp,
    pjo_nama:                pjo.nama,
    deputy_pjo_nrp:          deputy?.nrp || null,
    deputy_pjo_nama:         deputy?.nama || null,
    is_direct_pjo:           false,
    eligible_tiket_pesawat:  !!emp?.eligible_tiket_pesawat,
    sisa_cuti_tahunan:       sisaCutiTahunan,
    tahun_cuti:              currentYear
  })
}