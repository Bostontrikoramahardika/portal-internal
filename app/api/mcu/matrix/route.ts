// app/api/mcu/matrix/route.ts
// Monitoring MCU dalam format matrix (MCU 1, MCU 2, dst per karyawan)
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'
import { getWitaToday } from '@/app/lib/timezone'

const HO_ROLES = ['super_admin', 'hr_ho', 'director_ops', 'business_dev', 'manager_ops', 'spv_she_ho']
const SITE_ROLES = ['hr_site', 'pjo_site', 'she_site']
const MAX_MCU_COLUMNS = 5 // MCU 1 s/d MCU 5

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const session: any = auth.session!

  const userRoles: string[] = Array.isArray(session.roles) ? session.roles : []
  const role: string = userRoles[0] || 'employee'
  const isSuperAdmin = userRoles.includes('super_admin')
  const isHO = isSuperAdmin || HO_ROLES.includes(role)

  if (role === 'employee' && !isSuperAdmin) {
    return NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const site = searchParams.get('site') || ''
  const departemen = searchParams.get('departemen') || ''
  const statusFilter = searchParams.get('status_mcu') || '' // PENDING, EXP_DATE, FIT, dll
  const search = searchParams.get('search') || ''

  // ── STEP 1: Ambil karyawan ──
  let empQuery = supabaseAdmin
    .from('employees')
    .select('nrp, nama, jabatan, departemen, site, status_karyawan, tanggal_resign')
    .eq('status_karyawan', 'Aktif')
    .order('site', { ascending: true })
    .order('nama', { ascending: true })

  // Scope
  if (!isHO && SITE_ROLES.includes(role)) {
    empQuery = empQuery.eq('site', session.site || '')
  }
  if (site) empQuery = empQuery.eq('site', site)
  if (departemen) empQuery = empQuery.eq('departemen', departemen)
  if (search) empQuery = empQuery.or(`nrp.ilike.%${search}%,nama.ilike.%${search}%`)

  const { data: employees, error: empErr } = await empQuery
  if (empErr) return NextResponse.json({ error: empErr.message }, { status: 500 })
  if (!employees?.length) {
    return NextResponse.json({ ok: true, rows: [], sites: [], summary: {} })
  }

  const nrpList = employees.map(e => e.nrp)
  const today = getWitaToday()

  // ── STEP 2: Ambil SEMUA MCU untuk karyawan-karyawan ini ──
  const { data: allMcus } = await supabaseAdmin
    .from('mcu')
    .select('id, nrp, tanggal_mcu, tanggal_expired, hasil, status_mcu, jenis_mcu, temuan_summary, butuh_followup')
    .in('nrp', nrpList)
    .order('tanggal_mcu', { ascending: true })

  // Group by NRP
  const mcuByNrp: Record<string, any[]> = {}
  ;(allMcus || []).forEach((m: any) => {
    if (!mcuByNrp[m.nrp]) mcuByNrp[m.nrp] = []
    mcuByNrp[m.nrp].push(m)
  })

  // ── STEP 3: Bangun matrix rows ──
  const rows = employees.map((emp, idx) => {
    const mcus = mcuByNrp[emp.nrp] || []
    
    // Build kolom MCU 1..N
    const mcuColumns: any[] = []
    for (let i = 0; i < MAX_MCU_COLUMNS; i++) {
      const mcu = mcus[i] || null
      mcuColumns.push({
        no: i + 1,
        id: mcu?.id || null,
        tanggal: mcu?.tanggal_mcu || null,
        hasil: mcu?.hasil || null,
        temuan_summary: mcu?.temuan_summary || null,
      })
    }

    // MCU terakhir & masa berlaku
    const lastMcu = mcus.length > 0 ? mcus[mcus.length - 1] : null
    const mcuTerakhir = lastMcu?.tanggal_mcu || null
    const masaBerlaku = lastMcu?.tanggal_expired || null

    // Hitung status masa berlaku
    let statusExpired: 'AMAN' | 'AKAN_EXPIRED' | 'EXPIRED' | 'BELUM_MCU' = 'BELUM_MCU'
    let daysToExpired: number | null = null
    if (masaBerlaku) {
      const expDate = new Date(masaBerlaku + 'T00:00:00')
      const todayDate = new Date(today + 'T00:00:00')
      const diffMs = expDate.getTime() - todayDate.getTime()
      daysToExpired = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
      
      if (daysToExpired < 0) statusExpired = 'EXPIRED'
      else if (daysToExpired <= 30) statusExpired = 'AKAN_EXPIRED'
      else statusExpired = 'AMAN'
    }

    // Status MCU overall
    let statusMcu: string = 'BELUM_MCU'
    if (lastMcu) {
      if (statusExpired === 'EXPIRED') statusMcu = 'EXP_DATE'
      else if (lastMcu.hasil === 'FIT' && !lastMcu.butuh_followup) statusMcu = 'FIT'
      else if (lastMcu.hasil === 'FIT WITH NOTE') statusMcu = 'FIT_WITH_NOTE'
      else if (lastMcu.butuh_followup) statusMcu = 'PENDING'
      else if (lastMcu.hasil === 'UNFIT') statusMcu = 'UNFIT'
      else statusMcu = 'PENDING'
    }

    return {
      no: idx + 1,
      nrp: emp.nrp,
      nama: emp.nama,
      jabatan: emp.jabatan,
      departemen: emp.departemen,
      site: emp.site,
      status_karyawan: emp.status_karyawan,
      total_mcu: mcus.length,
      mcu_columns: mcuColumns,
      mcu_terakhir: mcuTerakhir,
      masa_berlaku: masaBerlaku,
      status_expired: statusExpired,
      days_to_expired: daysToExpired,
      status_mcu: statusMcu,
      last_hasil: lastMcu?.hasil || null,
    }
  })

  // ── STEP 4: Filter status_mcu (kalau ada) ──
  let filteredRows = rows
  if (statusFilter) {
    filteredRows = rows.filter(r => r.status_mcu === statusFilter)
  }

  // ── STEP 5: Summary ──
  const summary = {
    total_karyawan: rows.length,
    belum_mcu: rows.filter(r => r.status_mcu === 'BELUM_MCU').length,
    fit: rows.filter(r => r.status_mcu === 'FIT').length,
    fit_with_note: rows.filter(r => r.status_mcu === 'FIT_WITH_NOTE').length,
    pending: rows.filter(r => r.status_mcu === 'PENDING').length,
    unfit: rows.filter(r => r.status_mcu === 'UNFIT').length,
    expired: rows.filter(r => r.status_expired === 'EXPIRED').length,
    akan_expired: rows.filter(r => r.status_expired === 'AKAN_EXPIRED').length,
  }

  // ── STEP 6: List sites (untuk filter FE) ──
  const sitesSet = new Set<string>()
  rows.forEach(r => { if (r.site) sitesSet.add(r.site) })
  const sites = Array.from(sitesSet).sort()

  return NextResponse.json({
    ok: true,
    rows: filteredRows,
    total: filteredRows.length,
    sites,
    summary,
    canEdit: isSuperAdmin || SITE_ROLES.includes(role) || role === 'hr_ho',
    isHO,
  })
}