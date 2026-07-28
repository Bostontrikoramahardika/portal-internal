import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabaseAdmin as supabase } from '@/app/lib/supabase'

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
    .maybeSingle()

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

  const kodeSite      = siteConfig?.kode_site      || ''
  const primaryPjoNrp = siteConfig?.pjo_nrp        || null
  const deputyPjoNrp  = siteConfig?.deputy_pjo_nrp || null

  // ─── Helper: PJO dari sites_config (TANPA filter status_karyawan) ─────────
  async function getPjoData() {
    if (!primaryPjoNrp) {
      return { nrp: null, nama: 'Belum ada PJO di Site ini' }
    }
    // ⭐ FIX: hapus filter status_karyawan (banyak yg pakai case beda / null)
    const { data: pjoEmp } = await supabase
      .from('employees')
      .select('nrp, nama, jabatan, status_karyawan, tanggal_resign')
      .eq('nrp', primaryPjoNrp)
      .maybeSingle()

    // Cek manual: bukan resigned & bukan status Nonaktif
    if (!pjoEmp) return { nrp: null, nama: 'Belum ada PJO di Site ini' }
    if (pjoEmp.tanggal_resign) return { nrp: null, nama: 'PJO sudah resign, hubungi HR' }
    if (pjoEmp.status_karyawan === 'Nonaktif' || pjoEmp.status_karyawan === 'Resign') {
      return { nrp: null, nama: 'PJO tidak aktif, hubungi HR' }
    }

    return {
      nrp:  pjoEmp.nrp,
      nama: `${pjoEmp.nama} (${pjoEmp.jabatan || 'PJO'})`
    }
  }

  // ─── Helper: Deputy dari sites_config ─────────────────────────────────────
  async function getDeputyData() {
    if (!deputyPjoNrp) return null
    const { data: depEmp } = await supabase
      .from('employees')
      .select('nrp, nama, jabatan, status_karyawan, tanggal_resign')
      .eq('nrp', deputyPjoNrp)
      .maybeSingle()

    if (!depEmp) return null
    if (depEmp.tanggal_resign) return null
    if (depEmp.status_karyawan === 'Nonaktif' || depEmp.status_karyawan === 'Resign') return null

    return {
      nrp: depEmp.nrp,
      nama: `${depEmp.nama} (${depEmp.jabatan || 'Deputy PJO'})`
    }
  }

  // ─── Helper: NRP by role scoped ke site ini ────────────────────────────────
  async function getRoleNrps(role: string): Promise<string[]> {
    // Ambil yang scope_site = kode site ini ATAU nama site
    const { data: scoped } = await supabase
      .from('roles')
      .select('nrp')
      .eq('role', role)
      .eq('active', true)
      .or(`scope_site.eq.${kodeSite},scope_site.eq.${userSite}`)

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

      legacySiteNrps = (legacyEmps || []).map((e: any) => e.nrp)
    }

    return [...new Set([...scopedNrps, ...legacySiteNrps])]
  }

  // ─── Deteksi direct-to-PJO ────────────────────────────────────────────────
  // ⭐ FIX: Perhatikan word boundary — pakai regex biar akurat
  const isDirectPJO =
    /\bshe\b/.test(userJabatan)       ||
    /\bhrga\b/.test(userJabatan)      ||
    /\bhr\b/.test(userJabatan)        ||
    /\badmin\b/.test(userJabatan)     ||
    /\bgl\b/.test(userJabatan)        ||   // Group Leader
    /\bgroup leader\b/.test(userJabatan) ||
    /\bsupervisor\b/.test(userJabatan) ||
    /\bmanager\b/.test(userJabatan)   ||
    userJabatan.includes('production gl') ||
    userJabatan.includes('plant gl')

  // ⭐ FIX: Deteksi role user juga (bukan cuma jabatan)
  const userRoles: string[] = Array.isArray((session as any).roles) ? (session as any).roles : []
  const isGLRole = userRoles.some(r => ['gl_plant', 'gl_produksi', 'hr_site', 'she_site', 'admin_site'].includes(r))

  const shouldDirectPJO = isDirectPJO || isGLRole

  if (shouldDirectPJO) {
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
      .is('tanggal_resign', null)
      .order('nama')

    // ⭐ Filter status_karyawan manual (lebih fleksibel)
    atasanList = (employees || []).filter((e: any) => 
      e.nrp !== session.nrp
    )
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