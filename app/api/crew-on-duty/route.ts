// app/api/crew-on-duty/route.ts
// Chat 30 - Fitur baru: Crew On Duty Plant
// Menampilkan crew Plant yang bertugas pada shift hari ini (auto/manual pick)
// Skema C: Yang ada di jadwal shift + status HADIR / BELUM ABSEN

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

  // Akses: Super Admin, HR HO, PJO, GL Plant, HR Site
  const canAccess = isSuperAdmin || isHRHO || isPJO || isGLPlant || isHRSite
  if (!canAccess) {
    return NextResponse.json({ error: 'Tidak punya akses ke Crew On Duty' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const siteParam = searchParams.get('site') || session.scope_site || session.site || ''
    const shiftParam = searchParams.get('shift') || '' // 'SIANG' | 'MALAM' | ''
    const tanggalParam = searchParams.get('tanggal') || ''

    if (!siteParam) {
      return NextResponse.json({ error: 'Site tidak ditemukan' }, { status: 400 })
    }

    // Site access control: non-HRHO harus di site sendiri
    if (!isSuperAdmin && !isHRHO) {
      const userSite = session.scope_site || session.site || ''
      if (siteParam !== userSite) {
        return NextResponse.json({ 
          error: `Anda hanya bisa akses site ${userSite}` 
        }, { status: 403 })
      }
    }

    // ⭐ Get timezone site
    const { data: siteConfig } = await supabaseAdmin
      .from('sites_config')
      .select('*')
      .eq('nama_site', siteParam)
      .maybeSingle()

    if (!siteConfig) {
      return NextResponse.json({ error: `Site ${siteParam} tidak ditemukan` }, { status: 404 })
    }

    const siteTz: Timezone = (siteConfig.timezone || DEFAULT_TIMEZONE) as Timezone

    // ⭐ Auto-detect tanggal & shift kalau tidak di-input
    const tanggal = tanggalParam || getSiteDate(null, siteTz)
    const currentHour = getSiteHour(null, siteTz)
    const shift = shiftParam || (currentHour >= 4 && currentHour < 16 ? 'SIANG' : 'MALAM')

    // Roster code untuk shift
    const rosterCode = shift === 'SIANG' ? 'S' : 'M'

    // ─────────────────────────────────────────────────
    // 1. Ambil karyawan Plant di site tsb (aktif)
    // ─────────────────────────────────────────────────
    const { data: plantEmps, error: empErr } = await supabaseAdmin
      .from('employees')
      .select('nrp, nama, jabatan, departemen, site')
      .eq('site', siteParam)
      .eq('status_karyawan', 'Aktif')
      .is('tanggal_resign', null)
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

    const nrpList = (plantEmps || []).map((e: any) => e.nrp)

    if (nrpList.length === 0) {
      return NextResponse.json({
        ok: true,
        tanggal,
        shift,
        site: siteParam,
        site_tz: siteTz,
        pjo_gl_info: null,
        groups: [],
        total_dijadwalkan: 0,
        total_hadir: 0,
        total_belum_hadir: 0
      })
    }

    // ─────────────────────────────────────────────────
    // 2. Ambil roster tanggal & shift tsb
    // ─────────────────────────────────────────────────
    const { data: rosters } = await supabaseAdmin
      .from('rosters')
      .select('nrp, shift_code')
      .in('nrp', nrpList)
      .eq('tanggal', tanggal)

    // Filter hanya yang di-schedule shift ini
    const scheduledNrps = new Set(
      (rosters || [])
        .filter((r: any) => r.shift_code === rosterCode)
        .map((r: any) => r.nrp)
    )

    // Filter employees yang dijadwalkan
    const scheduledEmps = (plantEmps || []).filter((e: any) => scheduledNrps.has(e.nrp))

    // ─────────────────────────────────────────────────
    // 3. Ambil attendance tanggal & shift tsb
    // ─────────────────────────────────────────────────
    const { data: attendances } = await supabaseAdmin
      .from('attendance')
      .select('nrp, clock_in, status, shift')
      .in('nrp', Array.from(scheduledNrps))
      .eq('tanggal', tanggal)
      .eq('shift', shift)

    const attMap = new Map(
      (attendances || []).map((a: any) => [String(a.nrp), a])
    )

    // ─────────────────────────────────────────────────
    // 4. Ambil PJO & GL Plant info dari sites_config
    // ─────────────────────────────────────────────────
    let pjoGLInfo: any = null
    const pjoNrp = siteConfig.pjo_nrp
    const deputyPjoNrp = siteConfig.deputy_pjo_nrp

    const infoNrps: string[] = []
    if (pjoNrp) infoNrps.push(pjoNrp)
    if (deputyPjoNrp) infoNrps.push(deputyPjoNrp)

    // Cari GL Plant di scheduled emps (biasanya Plant GL)
    const glPlantInSchedule = scheduledEmps.filter((e: any) => 
      /plant gl|gl plant|pengawas plant/i.test(e.jabatan || '')
    )

    if (infoNrps.length > 0) {
      const { data: pjoData } = await supabaseAdmin
        .from('employees')
        .select('nrp, nama, jabatan')
        .in('nrp', infoNrps)
      
      pjoGLInfo = {
        pjo: pjoData?.find((p: any) => p.nrp === pjoNrp) || null,
        deputy_pjo: pjoData?.find((p: any) => p.nrp === deputyPjoNrp) || null,
        gl_plant: glPlantInSchedule[0] || null
      }
    }

    // ─────────────────────────────────────────────────
    // 5. Grouping by jabatan (normalized)
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

    // Icon per group
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

    // Group order (Pengawas first, Lainnya last)
    const GROUP_ORDER = [
      'Pengawas', 'Service', 'Mekanik', 'Welder', 'Tyreman', 
      'Electric', 'Helper Plant', 'Admin Plant', 'Lainnya'
    ]

    // Enrich each employee with status
    const enrichedEmps = scheduledEmps.map((e: any) => {
      const att = attMap.get(String(e.nrp))
      const isHadir = !!att?.clock_in
      const group = normalizeJabatanToGroup(e.jabatan || '')
      
      return {
        nrp: e.nrp,
        nama: e.nama,
        jabatan: e.jabatan,
        group,
        status: isHadir ? 'HADIR' : 'BELUM_HADIR'
      }
    })

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

    // Build final groups (urut)
    const groups = GROUP_ORDER
      .filter(g => grouped[g]?.length > 0)
      .map(g => ({
        group: g,
        icon: GROUP_ICONS[g] || '👤',
        total: grouped[g].length,
        hadir: grouped[g].filter((e: any) => e.status === 'HADIR').length,
        belum_hadir: grouped[g].filter((e: any) => e.status === 'BELUM_HADIR').length,
        members: grouped[g]
      }))

    // Summary
    const totalDijadwalkan = enrichedEmps.length
    const totalHadir = enrichedEmps.filter((e: any) => e.status === 'HADIR').length
    const totalBelumHadir = totalDijadwalkan - totalHadir

    return NextResponse.json({
      ok: true,
      tanggal,
      shift,
      site: siteParam,
      site_tz: siteTz,
      pjo_gl_info: pjoGLInfo,
      groups,
      total_dijadwalkan: totalDijadwalkan,
      total_hadir: totalHadir,
      total_belum_hadir: totalBelumHadir,
      generated_at: new Date().toISOString()
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}