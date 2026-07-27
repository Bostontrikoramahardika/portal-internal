import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabaseAdmin as supabase } from '@/app/lib/supabase'

export async function GET(request: NextRequest) {
  // ─── Auth ───────────────────────────────────────────────────────────────
  const token = request.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  // ─── Data karyawan login ─────────────────────────────────────────────────
  const { data: emp } = await supabase
    .from('employees')
    .select('site, departemen, jabatan')
    .eq('nrp', session.nrp)
    .single()

  const userSite = emp?.site || ''
  const userDept = (emp?.departemen || '').toLowerCase()
  const userJabatan = (emp?.jabatan || '').toLowerCase()

  // ─── Deteksi direct-to-PJO ───────────────────────────────────────────────
  const isDirectPJO =
    userJabatan.includes('she') ||
    userJabatan.includes('hrga') ||
    userJabatan.includes('hr ') ||
    userJabatan.includes('admin') ||
    userJabatan.includes('gl ') ||
    userJabatan.includes('supervisor') ||
    userJabatan.includes('manager')

  // ─── Helper: cari PJO aktif di site yang sama ────────────────────────────
  async function getPjoSite(): Promise<{ nrp: string | null; nama: string }> {
    // Step 1: Ambil semua NRP yang punya role pjo_site & active
    const { data: pjoRoles } = await supabase
      .from('roles')
      .select('nrp')
      .eq('role', 'pjo_site')
      .eq('active', true)

    const pjoNrps = (pjoRoles || []).map((r: any) => r.nrp)
    if (pjoNrps.length === 0) {
      return { nrp: null, nama: 'Belum ada PJO di Site ini' }
    }

    // Step 2: Filter yang se-site, ambil SEMUA (bukan maybeSingle!)
    // ✅ FIX: Pakai .limit(1) + tanpa maybeSingle → ambil PJO pertama
    const { data: sitePjoList } = await supabase
      .from('employees')
      .select('nrp, nama, jabatan')
      .in('nrp', pjoNrps)
      .eq('site', userSite)
      .eq('status_karyawan', 'Aktif')
      .order('nama')          // ← konsisten: ambil berdasar nama
      .limit(1)               // ← ambil 1 saja sebagai "primary PJO"

    const sitePjo = sitePjoList?.[0] ?? null

    return {
      nrp: sitePjo?.nrp || null,
      nama: sitePjo
        ? `${sitePjo.nama} (${sitePjo.jabatan})`
        : 'Belum ada PJO di Site ini'
    }
  }

  // ─── Kalau direct-to-PJO: langsung return PJO ───────────────────────────
  if (isDirectPJO) {
    const pjo = await getPjoSite()
    return NextResponse.json({
      atasan_list: [],
      pjo_nama: pjo.nama,
      pjo_nrp: pjo.nrp,
      is_direct_pjo: true
    })
  }

  // ─── Non-direct: cari atasan (GL/HR Site) ────────────────────────────────
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