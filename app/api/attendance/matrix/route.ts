// app/api/attendance/matrix/route.ts v2.1
// Fix: TypeScript strict + tanggal future + resign + timezone WITA
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'
import { getWitaToday } from '@/app/lib/timezone'

const HO_VIEW_ONLY  = ['hr_ho','director_ops','business_dev','manager_ops','spv_she_ho','she_site']
const SITE_EDIT     = ['hr_site','pjo_site','super_admin']
const LEADER_EDIT   = ['gl_produksi','gl_plant']

// ═══════════════════════════════════════════════════
function konversiCell(
  rosterShift: string | null,
  att: any,
  isFuture: boolean = false,
  isAfterResign: boolean = false
): { code: string, type: 'roster'|'actual'|'empty'|'future'|'resigned' } {
  const roster = (rosterShift || '').toUpperCase().trim()

  if (isAfterResign) {
    return { code: '', type: 'resigned' }
  }

  if (isFuture) {
    if (['OFF','CR','CT','ID','SCK','MCK','TR','LV','S','M'].includes(roster)) {
      return { code: roster, type: 'future' }
    }
    return { code: '-', type: 'future' }
  }

  if (['OFF','CR','CT','ID','SCK','MCK','TR','LV'].includes(roster)) {
    return { code: roster, type: 'roster' }
  }

  if (att) {
    const status = (att.status || '').toUpperCase()
    const shift  = (att.shift || '').toUpperCase()

    if (status === 'SAKIT' || status === 'S')  return { code: 'S',  type: 'actual' }
    if (status === 'IZIN'  || status === 'I')  return { code: 'I',  type: 'actual' }
    if (status === 'IZIN_RESMI' || status === 'IR') return { code: 'IR', type: 'actual' }
    if (status === 'ALFA'  || status === 'A')  return { code: 'A',  type: 'actual' }
    if (status === 'CUTI'  || status === 'CT') return { code: 'CT', type: 'actual' }
    if (status === 'CR')                        return { code: 'CR', type: 'actual' }
    if (status === 'ID' || status === 'INDUKSI')   return { code: 'ID', type: 'actual' }
    if (status === 'TR' || status === 'TRAINING')  return { code: 'TR', type: 'actual' }

    if (att.clock_in) {
      if (shift === 'MALAM' || shift === 'NS' || shift === 'M') return { code: 'NS', type: 'actual' }
      return { code: 'DS', type: 'actual' }
    }

    if (roster === 'S' || roster === 'M') {
      return { code: 'A', type: 'actual' }
    }
  }

  if (roster === 'S' || roster === 'M') {
    return { code: 'A', type: 'actual' }
  }

  return { code: '-', type: 'empty' }
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const session: any = auth.session!

  // 🆕 Ambil role & super admin flag dari array roles
  const userRoles: string[] = Array.isArray(session.roles) ? session.roles : []
  const role: string = userRoles[0] || 'employee'
  const isSuperAdmin = userRoles.includes('super_admin')

  if (role === 'employee' && !isSuperAdmin) {
    return NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const bulan    = searchParams.get('bulan') || ''
  const site     = searchParams.get('site')  || ''
  const departemen = searchParams.get('departemen') || ''
  const nama     = searchParams.get('nama')  || ''

  if (!bulan) return NextResponse.json({ error: 'Bulan wajib' }, { status: 400 })

  const [tahun, bln] = bulan.split('-').map(Number)
  const startDate = `${tahun}-${String(bln).padStart(2,'0')}-01`
  const jmlHari   = new Date(tahun, bln, 0).getDate()
  const endDate   = `${tahun}-${String(bln).padStart(2,'0')}-${String(jmlHari).padStart(2,'0')}`

  const todayWita = getWitaToday()

  // ── STEP 1: Ambil karyawan ──
  let empQuery = supabaseAdmin
    .from('employees')
    .select('nrp, nama, jabatan, departemen, site, status_karyawan, tanggal_resign')

  if (!isSuperAdmin && ['hr_site','pjo_site','she_site'].includes(role)) {
    empQuery = empQuery.eq('site', session.site || '')
  }
  if (!isSuperAdmin && ['gl_plant','gl_produksi'].includes(role)) {
    const { data: bawahan } = await supabaseAdmin
      .from('approval_matrix')
      .select('employee_nrp')
      .eq('approver_nrp', session.nrp)
    const nrpList = (bawahan || []).map((b: any) => b.employee_nrp)
    if (nrpList.length === 0) {
      return NextResponse.json({ ok: true, jmlHari, groups: [], summary: {} })
    }
    empQuery = empQuery.in('nrp', nrpList)
  }

  if (site) empQuery = empQuery.eq('site', site)
  if (departemen) empQuery = empQuery.eq('departemen', departemen)
  if (nama) empQuery = empQuery.ilike('nama', `%${nama}%`)

  const { data: employees, error: empErr } = await empQuery
  if (empErr) return NextResponse.json({ error: empErr.message }, { status: 500 })

  const nrpList = (employees || []).map((e: any) => e.nrp)
  if (nrpList.length === 0) {
    return NextResponse.json({ ok: true, jmlHari, groups: [], summary: {} })
  }

  // ── STEP 2: Ambil roster ──
  const { data: rosters } = await supabaseAdmin
    .from('rosters')
    .select('nrp, tanggal, shift_code')
    .in('nrp', nrpList)
    .gte('tanggal', startDate)
    .lte('tanggal', endDate)

  // ── STEP 3: Ambil attendance ──
  const { data: attendances } = await supabaseAdmin
    .from('attendance')
    .select('nrp, tanggal, shift, clock_in, clock_out, status, jam_kerja_menit, terlambat_menit, clock_in_lokasi, clock_out_lokasi, clock_in_lat, clock_in_lng, clock_out_lat, clock_out_lng, keterangan')
    .in('nrp', nrpList)
    .gte('tanggal', startDate)
    .lte('tanggal', endDate)

  // ── STEP 4: Map ──
  const rosterMap: Record<string, string> = {}
  ;(rosters || []).forEach((r: any) => {
    rosterMap[`${r.nrp}_${r.tanggal}`] = r.shift_code
  })

  const attMap: Record<string, any> = {}
  ;(attendances || []).forEach((a: any) => {
    attMap[`${a.nrp}_${a.tanggal}`] = a
  })

  // ── STEP 5: Matrix per karyawan ──
  const rows = (employees || []).map((emp: any) => {
    const days: any[] = []
    let hariKerja = 0, hariHadir = 0, shiftS = 0, shiftM = 0
    let off = 0, cuti = 0, sakit = 0, izin = 0, alpha = 0, stb = 0

    const resignDate: string | null = emp.tanggal_resign || null

    for (let d = 1; d <= jmlHari; d++) {
      const tgl = `${tahun}-${String(bln).padStart(2,'0')}-${String(d).padStart(2,'0')}`
      const roster = rosterMap[`${emp.nrp}_${tgl}`] || null
      const att    = attMap[`${emp.nrp}_${tgl}`] || null

      const isFuture = tgl > todayWita
      const isAfterResign = !!(resignDate && tgl > resignDate)

      const cell = konversiCell(roster, att, isFuture, isAfterResign)

      days.push({
        tanggal: tgl,
        day: d,
        code: cell.code,
        type: cell.type,
        roster,
        isFuture,
        isAfterResign,
        clock_in: att?.clock_in || null,
        clock_out: att?.clock_out || null,
        clock_in_lokasi: att?.clock_in_lokasi || null,
        clock_out_lokasi: att?.clock_out_lokasi || null,
        clock_in_lat: att?.clock_in_lat || null,
        clock_in_lng: att?.clock_in_lng || null,
        clock_out_lat: att?.clock_out_lat || null,
        clock_out_lng: att?.clock_out_lng || null,
        jam_kerja_menit: att?.jam_kerja_menit || 0,
        terlambat_menit: att?.terlambat_menit || 0,
        status: att?.status || null,
        keterangan: att?.keterangan || null,
      })

      if (isFuture || isAfterResign) continue

      if (['S','M'].includes(roster || '')) hariKerja++
      if (['DS','NS'].includes(cell.code)) hariHadir++
      if (cell.code === 'DS') shiftS++
      if (cell.code === 'NS') shiftM++
      if (cell.code === 'OFF') off++
      if (['CR','CT','LV','SCK','MCK'].includes(cell.code)) cuti++
      if (cell.code === 'S') sakit++
      if (cell.code === 'I' || cell.code === 'IR') izin++
      if (cell.code === 'A') alpha++
      if (cell.code === 'ID' || cell.code === 'TR') stb++
    }

    const persen = hariKerja > 0 ? Math.round((hariHadir / hariKerja) * 100) : 0

    return {
      nrp: emp.nrp,
      nama: emp.nama,
      jabatan: emp.jabatan || '-',
      departemen: emp.departemen || 'Lainnya',
      site: emp.site,
      status_karyawan: emp.status_karyawan,
      tanggal_resign: emp.tanggal_resign,
      days,
      summary: {
        totalHari: jmlHari,
        hariKerja,
        hariHadir,
        shiftS,
        shiftM,
        off,
        cuti,
        sakit,
        izin,
        alpha,
        stb,
        persen
      }
    }
  })

  // ── STEP 6: Group by dept ──
  const DEPT_ORDER = ['Staff','Plant','Operator','Lainnya']
  const grouped: Record<string, any[]> = {}
  rows.forEach(r => {
    const dept = DEPT_ORDER.includes(r.departemen) ? r.departemen : 'Lainnya'
    if (!grouped[dept]) grouped[dept] = []
    grouped[dept].push(r)
  })

  Object.keys(grouped).forEach(dept => {
    grouped[dept].sort((a, b) => a.nama.localeCompare(b.nama))
  })

  const groups = DEPT_ORDER.filter(d => grouped[d]?.length > 0).map(d => ({
    departemen: d,
    rows: grouped[d]
  }))

  // ── STEP 7: Permission ──
  const canEdit = isSuperAdmin ||
                  SITE_EDIT.includes(role) ||
                  LEADER_EDIT.includes(role)

  return NextResponse.json({
    ok: true,
    bulan,
    jmlHari,
    todayWita,
    groups,
    permission: {
      canEdit,
      role,
      isViewOnly: HO_VIEW_ONLY.includes(role)
    }
  })
}