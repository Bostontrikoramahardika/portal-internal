// app/api/crew-on-duty/route.ts
// Chat 30 - Crew On Duty Plant
// Patokan: DATA ABSENSI (attendance) - bukan roster
// Menampilkan personel Plant yang SUDAH ABSEN pada shift + tanggal ini

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'
import { getSiteDate, getSiteHour, Timezone, DEFAULT_TIMEZONE } from '@/app/lib/timezone'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const session: any = auth.session!

  const userRoles: string[] = Array.isArray(session.roles) ? session.roles : []
  const isSuperAdmin = userRoles.includes('super_admin')
  const isHRHO = userRoles.some((r: string) => ['hr_ho','hrga','hrga_pusat','admin'].includes(r))
  const isPJO = userRoles.some((r: string) => ['pjo_site','pjo'].includes(r))
  const isGLPlant = userRoles.includes('gl_plant')
  const isHRSite = userRoles.some((r: string) => ['hr_site','hrga_site','admin_site'].includes(r))

  const canAccess = isSuperAdmin || isHRHO || isPJO || isGLPlant || isHRSite
  if (!canAccess) {
    return NextResponse.json({ error: 'Tidak punya akses ke Crew On Duty' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const siteParam = searchParams.get('site') || session.scope_site || session.site || ''
    const shiftParam = searchParams.get('shift') || ''
    const tanggalParam = searchParams.get('tanggal') || ''

    if (!siteParam) {
      return NextResponse.json({ error: 'Site tidak ditemukan' }, { status: 400 })
    }

    // Site access control
    if (!isSuperAdmin && !isHRHO) {
      const userSite = session.scope_site || session.site || ''
      if (siteParam !== userSite) {
        return NextResponse.json({ 
          error: `Anda hanya bisa akses site ${userSite}` 
        }, { status: 403 })
      }
    }

    // Get site config & timezone
    const { data: siteConfig } = await supabaseAdmin
      .from('sites_config')
      .select('*')
      .eq('nama_site', siteParam)
      .maybeSingle()

    if (!siteConfig) {
      return NextResponse.json({ error: `Site ${siteParam} tidak ditemukan` }, { status: 404 })
    }

    const siteTz: Timezone = (siteConfig.timezone || DEFAULT_TIMEZONE) as Timezone

    // Auto-detect tanggal & shift
    const tanggal = tanggalParam || getSiteDate(null, siteTz)
    const currentHour = getSiteHour(null, siteTz)
    const shift = shiftParam || (currentHour >= 4 && currentHour < 16 ? 'SIANG' : 'MALAM')

    // ─────────────────────────────────────────────────
    // ⭐ STEP 1: Ambil ATTENDANCE tanggal + shift + site tsb
    // (Ini patokannya - siapa yang sudah absen)
    // ─────────────────────────────────────────────────
    const { data: attendances, error: attErr } = await supabaseAdmin
      .from('attendance')
      .select('nrp, clock_in, status')
      .eq('site', siteParam)
      .eq('tanggal', tanggal)
      .eq('shift', shift)
      .not('clock_in', 'is', null)

    if (attErr) return NextResponse.json({ error: attErr.message }, { status: 500 })

    const attendanceNrps = (attendances || []).map((a: any) => a.nrp)

    if (attendanceNrps.length === 0) {
      return NextResponse.json({
        ok: true,
        tanggal,
        shift,
        site: siteParam,
        site_tz: siteTz,
        pjo_gl_info: null,
        groups: [],
        total_hadir: 0,
        generated_at: new Date().toISOString()
      })
    }

    // ─────────────────────────────────────────────────
    // ⭐ STEP 2: Ambil data karyawan (filter Plant)
    // ─────────────────────────────────────────────────
    const { data: plantEmps, error: empErr } = await supabaseAdmin
      .from('employees')
      .select('nrp, nama, jabatan, departemen, site')
      .in('nrp', attendanceNrps)
      .or([
        'jabatan.ilike.%mekanik%',
        'jabatan.ilike.%mechanic%',
        'jabatan.ilike.%welder%',
        'jabatan.ilike.%tyreman%',
        'jabatan.ilike.%electric%',
        'jabatan.ilike.%helper plant%',
        'jabatan.ilike.%admin plant%',
        'jabatan.ilike.%plant gl%',
        'jabatan.ilike.%gl ws%',
        'jabatan.ilike.%service%',
        'departemen.ilike.%plant%'
      ].join(','))
      .order('nama')

    if (empErr) return NextResponse.json({ error: empErr.message }, { status: 500 })

    if (!plantEmps || plantEmps.length === 0) {
      return NextResponse.json({
        ok: true,
        tanggal,
        shift,
        site: siteParam,
        site_tz: siteTz,
        pjo_gl_info: null,
        groups: [],
        total_hadir: 0,
        generated_at: new Date().toISOString()
      })
    }

    // ─────────────────────────────────────────────────
    // STEP 3: PJO & GL Info
    // ─────────────────────────────────────────────────
    let pjoGLInfo: any = null
    const pjoNrp = siteConfig.pjo_nrp
    const deputyPjoNrp = siteConfig.deputy_pjo_nrp

    const infoNrps: string[] = []
    if (pjoNrp) infoNrps.push(pjoNrp)
    if (deputyPjoNrp) infoNrps.push(deputyPjoNrp)

    // GL Plant di antara yang sudah absen
    const glPlantHadir = plantEmps.filter((e: any) => 
      /plant gl|gl plant|pengawas plant|gl ws/i.test(e.jabatan || '')
    )

    if (infoNrps.length > 0) {
      const { data: pjoData } = await supabaseAdmin
        .from('employees')
        .select('nrp, nama, jabatan')
        .in('nrp', infoNrps)
      
      pjoGLInfo = {
        pjo: pjoData?.find((p: any) => p.nrp === pjoNrp) || null,
        deputy_pjo: pjoData?.find((p: any) => p.nrp === deputyPjoNrp) || null,
        gl_plant: glPlantHadir[0] || null
      }
    }

    // ─────────────────────────────────────────────────
    // STEP 4: Grouping by jabatan
    // ─────────────────────────────────────────────────
    function normalizeJabatanToGroup(jabatan: string): string {
      const j = (jabatan || '').toLowerCase()
      
      if (/plant gl|gl plant|gl ws|pengawas/i.test(j)) return 'Pengawas'
      if (/service/i.test(j)) return 'Service'
      if (/mekanik|mechanic/i.test(j)) return 'Mekanik'
      if (/welder/i.test(j)) return 'Welder'
      if (/tyreman/i.test(j)) return 'Tyreman'
      if (/electric/i.test(j)) return 'Electric'
      if (/helper/i.test(j)) return 'Helper Plant'
      if (/admin/i.test(j)) return 'Admin Plant'
      return 'Lainnya'
    }

    const GROUP_ICONS: Record<string, string> = {
      'Pengawas': '👷',
      'Service': '🛠️',
      'Mekanik': '🔧',
      'Welder': '🔥',
      'Tyreman': '⚙️',
      'Electric': '🔌',
      'Helper Plant': '💪',
      'Admin Plant': '📋',
      'Lainnya': '👤'
    }

    const GROUP_ORDER = [
      'Pengawas', 'Service', 'Mekanik', 'Welder', 'Tyreman', 
      'Electric', 'Helper Plant', 'Admin Plant', 'Lainnya'
    ]

    // Semua karyawan Plant yang sudah absen = HADIR (patokannya absensi)
    const enrichedEmps = plantEmps.map((e: any) => ({
      nrp: e.nrp,
      nama: e.nama,
      jabatan: e.jabatan,
      group: normalizeJabatanToGroup(e.jabatan || ''),
      status: 'HADIR'
    }))

    // Group by
    const grouped: Record<string, any[]> = {}
    enrichedEmps.forEach((e: any) => {
      if (!grouped[e.group]) grouped[e.group] = []
      grouped[e.group].push(e)
    })

    // Sort dalam group by nama
    Object.keys(grouped).forEach(g => {
      grouped[g].sort((a: any, b: any) => a.nama.localeCompare(b.nama))
    })

    // Build final groups
    const groups = GROUP_ORDER
      .filter(g => grouped[g]?.length > 0)
      .map(g => ({
        group: g,
        icon: GROUP_ICONS[g] || '👤',
        total: grouped[g].length,
        members: grouped[g]
      }))

    return NextResponse.json({
      ok: true,
      tanggal,
      shift,
      site: siteParam,
      site_tz: siteTz,
      pjo_gl_info: pjoGLInfo,
      groups,
      total_hadir: enrichedEmps.length,
      generated_at: new Date().toISOString()
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}