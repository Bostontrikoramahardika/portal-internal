// app/api/monitoring-roster-cr/route.ts
// Monitoring cuti kompensasi per KARYAWAN yang punya CR di bulan tertentu
// Logic: 1 karyawan = 1 pengajuan cuti kompensasi menutup semua CR-nya

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

export const dynamic = 'force-dynamic'

function canView(session: any): boolean {
  if (session.is_super_admin) return true
  const roles = (session.roles || []).map((r: string) => r.toLowerCase())
  return roles.some((r: string) =>
    [
      'hr_site', 'hrga_site',
      'hr_ho', 'hrga', 'hrga_pusat',
      'admin', 'admin_site', 'admin_plant',
      'pjo_site', 'pjo',
      'director_ops', 'manager_ops', 'business_dev',
      'spv_she_ho', 'she_site'
    ].includes(r)
  )
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

    if (!canView(session)) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const periode = searchParams.get('periode') || 
      `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
    const site = searchParams.get('site') || ''

    // Konversi periode YYYY-MM → range tanggal
    const [tahunP, bulanP] = periode.split('-')
    const firstDay = `${tahunP}-${bulanP}-01`
    const lastDayNum = new Date(Number(tahunP), Number(bulanP), 0).getDate()
    const lastDay = `${tahunP}-${bulanP}-${String(lastDayNum).padStart(2, '0')}`

    // ══════════════════════════════════
    // 1. Ambil semua roster CR di periode
    // ══════════════════════════════════
    const { data: crRoster, error: rosterError } = await supabase
      .from('rosters')
      .select('nrp, tanggal')
      .eq('shift_code', 'CR')
      .gte('tanggal', firstDay)
      .lte('tanggal', lastDay)
      .order('tanggal', { ascending: true })

    if (rosterError) {
      return NextResponse.json({ error: rosterError.message }, { status: 500 })
    }

    if (!crRoster || crRoster.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        stats: { total_karyawan: 0, sudah_ajukan: 0, menunggu: 0, belum_ajukan: 0, ditolak: 0 },
        sites: [],
        periode
      })
    }

    // ══════════════════════════════════
    // 2. Group CR per NRP (kumpulkan tanggal per karyawan)
    // ══════════════════════════════════
    const crMap = new Map<string, string[]>() // nrp → [tanggal1, tanggal2, ...]
    crRoster.forEach((r: any) => {
      if (!crMap.has(r.nrp)) crMap.set(r.nrp, [])
      crMap.get(r.nrp)!.push(r.tanggal)
    })

    const nrpList = Array.from(crMap.keys())

    // ══════════════════════════════════
    // 3. Enrich data karyawan (skip yang tidak ada di employees)
    // ══════════════════════════════════
    const { data: employees } = await supabase
      .from('employees')
      .select('nrp, nama, jabatan, departemen, site')
      .in('nrp', nrpList)

    const empMap = new Map<string, any>()
    ;(employees || []).forEach((e: any) => empMap.set(e.nrp, e))

    // ══════════════════════════════════
    // 4. Ambil semua pengajuan CUTI KOMPENSASI dari NRP tersebut
    //    (tidak filter by tanggal, cukup filter by NRP untuk periode ini)
    // ══════════════════════════════════
    const { data: leaveData } = await supabase
  .from('leave_requests')
  .select('id, nrp, status_final, jenis_cuti, tanggal_mulai, tanggal_selesai, created_at, catatan_atasan, catatan_pjo')
  .in('nrp', nrpList)
  .gte('tanggal_mulai', firstDay)
  .lte('tanggal_mulai', lastDay)
  .order('created_at', { ascending: false })

    // Map: nrp → leave_request (ambil yang paling baru saja)
    const leaveMap = new Map<string, any>()
    ;(leaveData || []).forEach((lr: any) => {
      if (!leaveMap.has(lr.nrp)) {
        leaveMap.set(lr.nrp, lr)
      }
    })

    // ══════════════════════════════════
    // 5. Build result: 1 row per karyawan
    // ══════════════════════════════════
    let rows = nrpList
      .filter(nrp => empMap.has(nrp)) // Skip NRP tidak ada di employees
      .map(nrp => {
        const emp = empMap.get(nrp)
        const leave = leaveMap.get(nrp)
        const tanggalCR = crMap.get(nrp) || []

        let status: string
        let badge: string

        if (!leave) {
          status = 'BELUM_AJUKAN'
          badge = '⚠️ BELUM AJUKAN'
        } else if (leave.status_final === 'DISETUJUI') {
          status = 'DISETUJUI'
          badge = '✅ SUDAH AJUKAN'
        } else if (leave.status_final === 'DITOLAK') {
          status = 'DITOLAK'
          badge = '❌ DITOLAK'
        } else {
          status = 'MENUNGGU'
          badge = '🕐 MENUNGGU'
        }

        return {
          nrp,
          nama: emp.nama,
          jabatan: emp.jabatan || '-',
          departemen: emp.departemen || '-',
          site: emp.site || '-',
          total_hari_cr: tanggalCR.length,
          tanggal_cr_list: tanggalCR,
          tanggal_cr_pertama: tanggalCR[0],
          tanggal_cr_terakhir: tanggalCR[tanggalCR.length - 1],
          leave_request_id: leave?.id || null,
          status_final: leave?.status_final || null,
          status,
          badge,
          tanggal_ajukan: leave?.created_at || null,
          tanggal_cuti_mulai: leave?.tanggal_mulai || null,
          tanggal_cuti_selesai: leave?.tanggal_selesai || null,
          catatan_atasan: leave?.catatan_atasan || null,
          catatan_pjo: leave?.catatan_pjo || null
        }
      })

    // Filter by site
    const isSuperAdmin = session.is_super_admin || false
    const rolesLower = (session.roles || []).map((r: string) => r.toLowerCase())
    const isHOScope = isSuperAdmin || rolesLower.some((r: string) =>
      ['hr_ho', 'hrga', 'hrga_pusat', 'admin',
       'director_ops', 'manager_ops', 'business_dev', 'spv_she_ho'].includes(r)
    )
    const userSite = session.scope_site || session.site || ''

    if (!isHOScope) {
      rows = rows.filter((r: any) => r.site === userSite)
    }
    if (site) {
      rows = rows.filter((r: any) => r.site === site)
    }

    // Sort: BELUM_AJUKAN dulu (prioritas), lalu MENUNGGU, DITOLAK, DISETUJUI
    const statusOrder: any = { BELUM_AJUKAN: 1, DITOLAK: 2, MENUNGGU: 3, DISETUJUI: 4 }
    rows.sort((a: any, b: any) => {
      const ord = (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99)
      if (ord !== 0) return ord
      return a.nama.localeCompare(b.nama)
    })

    // ══════════════════════════════════
    // 6. Statistik per karyawan
    // ══════════════════════════════════
    const stats = {
      total_karyawan: rows.length,
      sudah_ajukan: rows.filter((r: any) => r.status === 'DISETUJUI').length,
      menunggu: rows.filter((r: any) => r.status === 'MENUNGGU').length,
      belum_ajukan: rows.filter((r: any) => r.status === 'BELUM_AJUKAN').length,
      ditolak: rows.filter((r: any) => r.status === 'DITOLAK').length
    }

    // ══════════════════════════════════
    // 7. Sites untuk filter
    // ══════════════════════════════════
    const { data: sitesList } = await supabase
      .from('sites_config')
      .select('nama_site')
      .eq('is_active', true)
      .order('nama_site')

    return NextResponse.json({
      success: true,
      data: rows,
      stats,
      sites: (sitesList || []).map((s: any) => s.nama_site),
      periode
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}