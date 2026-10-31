// app/api/attendance/matrix/route.ts v3.1
// v3.1 - Fix Supabase limit 1000: pakai pagination via .range()
// v3.0 - Chat 30: Multi-timezone aware

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'
import { getSiteDate, Timezone, DEFAULT_TIMEZONE } from '@/app/lib/timezone'

const HO_VIEW_ONLY  = ['hr_ho','director_ops','business_dev','manager_ops','spv_she_ho','she_site']
const SITE_EDIT     = ['hr_site','pjo_site','super_admin']
const LEADER_EDIT   = ['gl_produksi','gl_plant']

// ═══════════════════════════════════════════════════
function tglKey(d: any): string {
  if (!d) return ''
  if (typeof d === 'string') return d.split('T')[0].split('+')[0].trim()
  if (d instanceof Date) return d.toISOString().split('T')[0]
  return String(d).split('T')[0]
}
function normNama(s: any): string {
  return String(s || '').trim().toUpperCase()
}
function isJabatanOperator(jabatan: any): boolean {
  return /operator/i.test(String(jabatan || ''))
}
function grupAbsensi(departemen: any, jabatan: any): string {
  const d = String(departemen || '').trim()
  if (d === 'Staff' || d === 'Plant' || d === 'Operator') return d
  const j = String(jabatan || '').toLowerCase()
  if (/operator/.test(j)) return 'Operator'
  if (/mekanik|mechanic|welder|tyreman|helper plant|admin plant|plant gl/.test(j)) return 'Plant'
  if (/pjo|hrga|she|planner|site admin|admin gl|admin ho|staff|logistic|driver lv/.test(j)) return 'Staff'
  return d || 'Lainnya'
}
function karyawanSampah(emp: any): boolean {
  const nama = String(emp?.nama || '').trim()
  const nrp = String(emp?.nrp || '').trim()
  if (!nama || /^#/.test(nama) || /#NAME|#REF|#N\/A/i.test(nama)) return true
  if (!nrp || !/^[A-Za-z0-9]+$/.test(nrp)) return true
  return false
}

function kodeDariShiftTs(shift: any): 'DS' | 'NS' {
  const s = String(shift ?? '').trim().toUpperCase()
  if (s === '2' || s === 'NS' || s === 'M' || s.includes('MALAM') || s.includes('NIGHT')) return 'NS'
  return 'DS'
}

function konversiCell(
  rosterShift: string | null,
  att: any,
  isFuture: boolean = false,
  isAfterResign: boolean = false,
  tsOptKode: 'DS' | 'NS' | null = null,
  isOperator: boolean = false
): { code: string, type: 'roster'|'actual'|'empty'|'future'|'resigned' } {
  const roster = (rosterShift || '').toUpperCase().trim()

  if (isAfterResign) {
    return { code: '', type: 'resigned' }
  }

  if (att) {
    const dariKet = String(att.keterangan || '').match(/\[MANUAL:(DS|NS|DW|NW|S|I|IR|A|OFF|CR|CT|ID|TR|LV)\]/i)
    if (dariKet) {
      return { code: dariKet[1].toUpperCase(), type: 'actual' }
    }
    const status = (att.status || '').toUpperCase().trim()
    const KODE_MANUAL: Record<string, string> = {
      DS: 'DS', NS: 'NS', DW: 'DW', NW: 'NW',
      S: 'S', SAKIT: 'S',
      I: 'I', IZIN: 'I',
      IR: 'IR', IZIN_RESMI: 'IR',
      CT: 'CT', CUTI: 'CT',
      CR: 'CR',
      ID: 'ID', INDUKSI: 'ID',
      TR: 'TR', TRAINING: 'TR',
      A: 'A', ALPHA: 'A', ALFA: 'A',
      OFF: 'OFF', LIBUR: 'OFF',
      LV: 'LV',
    }
    if (KODE_MANUAL[status]) {
      return { code: KODE_MANUAL[status], type: 'actual' }
    }
  }

  // Ada di TS Opt = masuk dan kerja → DS/NS (tidak wajib C.in)
  if (tsOptKode) {
    return { code: tsOptKode, type: isFuture ? 'future' : 'actual' }
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

  if (att?.clock_in) {
    const shift = (att.shift || '').toUpperCase()
    const malam = shift === 'MALAM' || shift === 'NS' || shift === 'M'
    if (isOperator) return { code: malam ? 'NW' : 'DW', type: 'actual' }
    return { code: malam ? 'NS' : 'DS', type: 'actual' }
  }

  const statusA = (att?.status || '').toUpperCase()
  if (statusA === 'ALFA' || statusA === 'A') return { code: 'A', type: 'actual' }
  if (roster === 'S' || roster === 'M') return { code: 'A', type: 'actual' }

  return { code: '-', type: 'empty' }
}

// ═══════════════════════════════════════════════════
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const session: any = auth.session!

  const userRoles: string[] = Array.isArray(session.roles) ? session.roles : []
  const isSuperAdmin = userRoles.includes('super_admin')

  const PRIORITY_ROLES = [
    'super_admin', 'hr_ho', 'director_ops', 'business_dev', 'manager_ops', 'spv_she_ho',
    'pjo_site', 'pjo', 'gl_plant', 'gl_produksi', 'hr_site', 'she_site',
    'admin_site', 'admin_plant', 'atasan', 'employee'
  ]
  const role: string = PRIORITY_ROLES.find(r => userRoles.includes(r)) || 'employee'

  if (role === 'employee' && !isSuperAdmin) {
    return NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const bulan      = searchParams.get('bulan') || ''
  const site       = searchParams.get('site')  || ''
  const departemen = searchParams.get('departemen') || ''
  const nama       = searchParams.get('nama')  || ''

  if (!bulan) return NextResponse.json({ error: 'Bulan wajib' }, { status: 400 })

  const [tahun, bln] = bulan.split('-').map(Number)
  const startDate = `${tahun}-${String(bln).padStart(2,'0')}-01`
  const jmlHari   = new Date(tahun, bln, 0).getDate()
  const endDate   = `${tahun}-${String(bln).padStart(2,'0')}-${String(jmlHari).padStart(2,'0')}`

  // Get today berdasarkan timezone site user
  let siteTz: Timezone = DEFAULT_TIMEZONE
  if (session.site) {
    const { data: siteConfig } = await supabaseAdmin
      .from('sites_config')
      .select('timezone')
      .eq('nama_site', session.site)
      .maybeSingle()
    if (siteConfig?.timezone) siteTz = siteConfig.timezone as Timezone
  }
  const todaySite = getSiteDate(null, siteTz)

  // ── STEP 1: Ambil karyawan berdasarkan role ──
  let empQuery = supabaseAdmin
    .from('employees')
    .select('nrp, nama, jabatan, departemen, site, status_karyawan, tanggal_resign, kode_absensi')

  if (isSuperAdmin) {
    // Super Admin → lihat semua
  }
  else if (['hr_site','she_site'].includes(role)) {
    empQuery = empQuery.eq('site', session.site || '')
  }
  else if (role === 'gl_plant') {
    const scopeSite = session.scope_site || session.site || ''
    if (!scopeSite) {
      return NextResponse.json({
        ok: true, jmlHari, groups: [], summary: {},
        permission: { canEdit: true, role, isViewOnly: false }
      })
    }
    empQuery = empQuery
      .eq('site', scopeSite)
      .is('tanggal_resign', null)
      .or([
        'jabatan.ilike.%mekanik%',
        'jabatan.ilike.%mechanic%',
        'jabatan.ilike.%welder%',
        'jabatan.ilike.%tyreman%',
        'jabatan.ilike.%electric%',
        'jabatan.ilike.%helper plant%',
        'jabatan.ilike.%admin plant%',
        'departemen.ilike.%plant%'
      ].join(','))
  }
  else if (role === 'gl_produksi') {
    const scopeSite = session.scope_site || session.site || ''
    if (!scopeSite) {
      return NextResponse.json({
        ok: true, jmlHari, groups: [], summary: {},
        permission: { canEdit: true, role, isViewOnly: false }
      })
    }
    empQuery = empQuery
      .eq('site', scopeSite)
      .is('tanggal_resign', null)
      .or([
        'jabatan.ilike.%operator%',
        'jabatan.ilike.%driver%',
        'jabatan.ilike.%huler%'
      ].join(','))
  }
  else if (['pjo_site','pjo'].includes(role)) {
    const { data: bawahan } = await supabaseAdmin
      .from('approval_matrix')
      .select('employee_nrp')
      .eq('pjo_nrp', session.nrp)
      .eq('active', true)

    const nrpList = (bawahan || []).map((b: any) => b.employee_nrp)
    if (nrpList.length === 0) {
      return NextResponse.json({
        ok: true, jmlHari, groups: [], summary: {},
        permission: { canEdit: true, role, isViewOnly: false }
      })
    }
    empQuery = empQuery.in('nrp', nrpList)
  }
  else if (role === 'atasan') {
    const { data: bawahan } = await supabaseAdmin
      .from('approval_matrix')
      .select('employee_nrp')
      .eq('atasan_nrp', session.nrp)
      .eq('active', true)

    const nrpList = (bawahan || []).map((b: any) => b.employee_nrp)
    if (nrpList.length === 0) {
      return NextResponse.json({
        ok: true, jmlHari, groups: [], summary: {},
        permission: { canEdit: true, role, isViewOnly: false }
      })
    }
    empQuery = empQuery.in('nrp', nrpList)
  }
  else if (['admin_site','admin_plant'].includes(role)) {
    empQuery = empQuery.eq('site', session.site || '')
    if (role === 'admin_plant') {
      empQuery = empQuery.ilike('departemen', '%plant%')
    }
  }

  if (site) empQuery = empQuery.eq('site', site)
  if (departemen) empQuery = empQuery.eq('departemen', departemen)
  if (nama) empQuery = empQuery.ilike('nama', `%${nama}%`)

  const { data: employees, error: empErr } = await empQuery
  if (empErr) return NextResponse.json({ error: empErr.message }, { status: 500 })

  const employeesOk = (employees || []).filter((e: any) => !karyawanSampah(e))
  const nrpList = employeesOk.map((e: any) => e.nrp)
  if (nrpList.length === 0) {
    return NextResponse.json({
      ok: true, jmlHari, groups: [], summary: {},
      permission: {
        canEdit: isSuperAdmin || SITE_EDIT.includes(role) || LEADER_EDIT.includes(role),
        role,
        isViewOnly: HO_VIEW_ONLY.includes(role)
      }
    })
  }

  // ═══════════════════════════════════════════════════
  // Fetch dengan pagination (bypass Supabase default limit 1000)
  // ═══════════════════════════════════════════════════
  async function fetchAllRosters(): Promise<any[]> {
    const PAGE_SIZE = 1000
    let all: any[] = []
    let from = 0
    while (true) {
      const { data, error } = await supabaseAdmin
        .from('rosters')
        .select('nrp, tanggal, shift_code')
        .in('nrp', nrpList)
        .gte('tanggal', startDate)
        .lte('tanggal', endDate)
        .range(from, from + PAGE_SIZE - 1)
      if (error) throw error
      if (!data || data.length === 0) break
      all = all.concat(data)
      if (data.length < PAGE_SIZE) break
      from += PAGE_SIZE
    }
    return all
  }

  async function fetchAllAttendance(): Promise<any[]> {
    const PAGE_SIZE = 1000
    let all: any[] = []
    let from = 0
    while (true) {
      const { data, error } = await supabaseAdmin
        .from('attendance')
        .select('nrp, tanggal, shift, clock_in, clock_out, status, jam_kerja_menit, terlambat_menit, clock_in_lokasi, clock_out_lokasi, clock_in_lat, clock_in_lng, clock_out_lat, clock_out_lng, keterangan')
        .in('nrp', nrpList)
        .gte('tanggal', startDate)
        .lte('tanggal', endDate)
        .range(from, from + PAGE_SIZE - 1)
      if (error) throw error
      if (!data || data.length === 0) break
      all = all.concat(data)
      if (data.length < PAGE_SIZE) break
      from += PAGE_SIZE
    }
    return all
  }

  let rosters: any[] = []
  let attendances: any[] = []
  try {
    rosters = await fetchAllRosters()
    attendances = await fetchAllAttendance()
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal fetch data' }, { status: 500 })
  }

  const tsOptKodeMap = new Map<string, 'DS' | 'NS'>()
  const tsOptBarisMap = new Map<string, any[]>()
  const setTs = (key: string, kode: 'DS' | 'NS', baris?: any) => {
    if (!key) return
    const old = tsOptKodeMap.get(key)
    tsOptKodeMap.set(key, old === 'NS' || kode === 'NS' ? 'NS' : kode)
    if (baris) {
      if (!tsOptBarisMap.has(key)) tsOptBarisMap.set(key, [])
      tsOptBarisMap.get(key)!.push(baris)
    }
  }
  try {
    const PAGE_SIZE = 1000
    let from = 0
    while (true) {
      const { data, error } = await supabaseAdmin
        .from('ts_opt')
        .select('tanggal, nama_operator, nrp, shift, kode_unit, hm_awal, hm_akhir, hm_total')
        .gte('tanggal', startDate)
        .lte('tanggal', endDate)
        .range(from, from + PAGE_SIZE - 1)
      if (error || !data || data.length === 0) break
      for (const r of data as any[]) {
        const t = tglKey(r.tanggal)
        if (!t) continue
        const kode = kodeDariShiftTs(r.shift)
        const baris = {
          kode_unit: r.kode_unit || null,
          hm_awal: r.hm_awal ?? null,
          hm_akhir: r.hm_akhir ?? null,
          hm_total: r.hm_total ?? null,
          shift: r.shift || null,
        }
        const n = normNama(r.nama_operator)
        if (n) setTs(`${t}|${n}`, kode, baris)
        const nr = String(r.nrp || '').trim()
        if (nr) {
          setTs(`${t}|NRP:${nr}`, kode, baris)
          setTs(`${t}|NRP:${nr.replace(/^B/i, '')}`, kode, baris)
        }
      }
      if (data.length < PAGE_SIZE) break
      from += PAGE_SIZE
    }
  } catch {
    // ts_opt belum ada
  }

  const aliasByInti = new Map<string, Set<string>>()
  for (const e of employeesOk) {
    const inti = String(e.nrp || '').trim().replace(/^B/i, '').toUpperCase()
    if (!inti) continue
    if (!aliasByInti.has(inti)) aliasByInti.set(inti, new Set())
    const s = aliasByInti.get(inti)!
    if (e.kode_absensi) s.add(normNama(e.kode_absensi))
    if (e.nama) s.add(normNama(e.nama))
    s.add(String(e.nrp).trim().toUpperCase())
    s.add(inti)
  }
  function aliasEmp(emp: any): Set<string> {
    const inti = String(emp.nrp || '').trim().replace(/^B/i, '').toUpperCase()
    return aliasByInti.get(inti) || new Set<string>([normNama(emp.nama), normNama(emp.kode_absensi)].filter(Boolean) as string[])
  }
  function cariTsOpt(tgl: string, emp: any): 'DS' | 'NS' | null {
    for (const a of aliasEmp(emp)) {
      if (!a) continue
      const v = tsOptKodeMap.get(`${tgl}|${a}`) || tsOptKodeMap.get(`${tgl}|NRP:${a}`)
      if (v) return v
    }
    return null
  }
  function ringkasTsOpt(tgl: string, emp: any): { unit: string | null; hm_awal: any; hm_akhir: any; hm_total: number | null } {
    const seen = new Set<string>()
    const list: any[] = []
    for (const a of aliasEmp(emp)) {
      if (!a) continue
      const arr = tsOptBarisMap.get(`${tgl}|${a}`) || tsOptBarisMap.get(`${tgl}|NRP:${a}`) || []
      for (const r of arr) {
        const id = String(r.kode_unit || '') + '|' + String(r.shift || '') + '|' + String(r.hm_awal ?? '') + '|' + String(r.hm_akhir ?? '')
        if (seen.has(id)) continue
        seen.add(id)
        list.push(r)
      }
    }
    if (!list.length) return { unit: null, hm_awal: null, hm_akhir: null, hm_total: null }
    const units = Array.from(new Set(list.map((x) => x.kode_unit).filter(Boolean)))
    const awals = list.map((x) => x.hm_awal).filter((v) => v != null && v !== '')
    const akhirs = list.map((x) => x.hm_akhir).filter((v) => v != null && v !== '')
    const totals = list.map((x) => Number(x.hm_total)).filter((n) => !isNaN(n))
    return {
      unit: units.length ? units.join(', ') : null,
      hm_awal: awals.length === 1 ? awals[0] : (awals.length ? awals.join(' / ') : null),
      hm_akhir: akhirs.length === 1 ? akhirs[0] : (akhirs.length ? akhirs.join(' / ') : null),
      hm_total: totals.length ? Number(totals.reduce((a, b) => a + b, 0).toFixed(2)) : null,
    }
  }

  

  const rosterMap: Record<string, string> = {}
  rosters.forEach((r: any) => {
    rosterMap[`${r.nrp}_${r.tanggal}`] = r.shift_code
  })

  // ---------- LEMBUR disetujui pada bulan ini ----------
  const nrpSemua = employeesOk.map((e: any) => e.nrp)
  const lemburMap: Record<string, any[]> = {}
  const lemburMenungguMap: Record<string, any[]> = {}
  if (nrpSemua.length) {
    const awalBln = tahun + '-' + String(bln).padStart(2,'0') + '-01'
    const akhirBln = tahun + '-' + String(bln).padStart(2,'0') + '-' + String(jmlHari).padStart(2,'0')
    const { data: lemburRows } = await supabaseAdmin
      .from('overtime_requests')
      .select('id, nrp, tanggal, alasan, jenis_lembur, jam_mulai, jam_selesai, total_jam, status_final, status_atasan, status_pjo, atasan_nrp, pjo_nrp')
      .in('nrp', nrpSemua).gte('tanggal', awalBln).lte('tanggal', akhirBln)

    const disetujui = (lemburRows || []).filter((l) =>
      String(l.status_final || '').toUpperCase().includes('APPROVED') ||
      String(l.status_final || '').toUpperCase().includes('DISETUJUI') ||
      (String(l.status_atasan).toUpperCase() === 'APPROVED' &&
       String(l.status_pjo).toUpperCase() === 'APPROVED'))

    const approverNrp = Array.from(new Set(
      (lemburRows || []).flatMap((l: any) => [l.pjo_nrp, l.atasan_nrp]).filter(Boolean).map(String)))
    const namaMap: Record<string, string> = {}
    if (approverNrp.length) {
      const { data: ap } = await supabaseAdmin
        .from('employees').select('nrp, nama, jabatan').in('nrp', approverNrp)
      ;(ap || []).forEach((x: any) => {
        namaMap[String(x.nrp)] = x.jabatan ? x.nama + ' (' + x.jabatan + ')' : x.nama
      })
    }

    const jamLembur = (l: any) => {
      const a = String(l.jam_mulai || '').slice(0, 5)
      const b = String(l.jam_selesai || '').slice(0, 5)
      if (!a || !b) return 0
      const [h1, m1] = a.split(':').map(Number)
      const [h2, m2] = b.split(':').map(Number)
      let menit = (h2 * 60 + m2) - (h1 * 60 + m1)
      if (menit < 0) menit += 1440
      return Math.round((menit / 60) * 100) / 100
    }

    disetujui.forEach((l: any) => {
      const k = String(l.nrp)
      if (!lemburMap[k]) lemburMap[k] = []
      lemburMap[k].push({
        id: l.id,
        tanggal: l.tanggal, alasan: l.alasan || '-',
        jenis_lembur: l.jenis_lembur || 'BIASA',
        jam_mulai: l.jam_mulai || null, jam_selesai: l.jam_selesai || null,
        jam: jamLembur(l),
        status: 'DISETUJUI',
        atasan_nrp: l.atasan_nrp || null,
        atasan_nama: namaMap[String(l.atasan_nrp)] || null,
        pjo_nrp: l.pjo_nrp || null,
        pjo_nama: namaMap[String(l.pjo_nrp)] || null,
        disetujui_oleh: namaMap[String(l.pjo_nrp)] || namaMap[String(l.atasan_nrp)] || null,
      })
    })

    // lembur yang BELUM disetujui — ikut ditampilkan supaya HR tahu ada yang menggantung
    const disetujuiSet = new Set(disetujui.map((l: any) => String(l.nrp) + '|' + String(l.tanggal) + '|' + String(l.jam_mulai)))
    ;(lemburRows || []).forEach((l: any) => {
      const kunci = String(l.nrp) + '|' + String(l.tanggal) + '|' + String(l.jam_mulai)
      if (disetujuiSet.has(kunci)) return
      const k = String(l.nrp)
      if (!lemburMenungguMap[k]) lemburMenungguMap[k] = []
      const stAtasan = String(l.status_atasan || '').toUpperCase()
      const stPjo = String(l.status_pjo || '').toUpperCase()
      const tahap = stAtasan !== 'APPROVED'
        ? 'MENUNGGU_ATASAN'
        : (stPjo !== 'APPROVED' ? 'MENUNGGU_PJO' : 'MENUNGGU')
      lemburMenungguMap[k].push({
        id: l.id,
        tanggal: l.tanggal, alasan: l.alasan || '-',
        jenis_lembur: l.jenis_lembur || 'BIASA',
        jam_mulai: l.jam_mulai || null, jam_selesai: l.jam_selesai || null,
        jam: jamLembur(l),
        status: tahap,
        status_final: l.status_final || null,
        atasan_nrp: l.atasan_nrp || null,
        atasan_nama: namaMap[String(l.atasan_nrp)] || null,
        pjo_nrp: l.pjo_nrp || null,
        pjo_nama: namaMap[String(l.pjo_nrp)] || null,
      })
    })
    Object.keys(lemburMap).forEach((k: string) =>
      lemburMap[k].sort((x: any, y: any) => String(x.tanggal).localeCompare(String(y.tanggal))))
  }

  const attMap: Record<string, any> = {}
  attendances.forEach((a: any) => {
    attMap[`${a.nrp}_${a.tanggal}`] = a
  })

  // ═══════════════════════════════════════════════
  // KOMPENSASI CUTI (input manual HR per bulan)
  // ═══════════════════════════════════════════════
  const kompMap: Record<string, { hari: number; keterangan: string | null; oleh: string | null }> = {}
  try {
    const { data: kompRows } = await supabaseAdmin
      .from('kompensasi_cuti')
      .select('nrp, jumlah_hari, keterangan, diubah_oleh')
      .eq('periode', bulan)
    ;(kompRows || []).forEach((k: any) => {
      kompMap[String(k.nrp)] = {
        hari: Number(k.jumlah_hari) || 0,
        keterangan: k.keterangan || null,
        oleh: k.diubah_oleh || null,
      }
    })
  } catch { /* tabel belum dibuat → anggap 0 */ }

  // Pengajuan CUTI KOMPENSASI yang belum final → ditandai kecil di tabel
  const kompMenungguMap: Record<string, number> = {}
  try {
    const { data: kompLeaves } = await supabaseAdmin
      .from('leave_requests')
      .select('nrp, tanggal_mulai, tanggal_selesai, jenis_cuti, status_final')
      .in('nrp', nrpList)
      .lte('tanggal_mulai', endDate)
      .gte('tanggal_selesai', startDate)
    ;(kompLeaves || []).forEach((lr: any) => {
      if (!String(lr.jenis_cuti || '').toUpperCase().includes('KOMPENSASI')) return
      const fin = String(lr.status_final || '').toUpperCase()
      if (fin.includes('DISETUJUI') || fin.includes('APPROVED')) return
      const st = new Date(`${lr.tanggal_mulai}T00:00:00`)
      const en = new Date(`${lr.tanggal_selesai}T00:00:00`)
      const hari = Math.max(1, Math.round((en.getTime() - st.getTime()) / 86400000) + 1)
      const k = String(lr.nrp)
      kompMenungguMap[k] = (kompMenungguMap[k] || 0) + hari
    })
  } catch { /* abaikan */ }

  const rows = employeesOk.map((emp: any) => {
    const days: any[] = []
    let hariKerja = 0, hariHadir = 0, shiftS = 0, shiftM = 0
    let off = 0, cuti = 0, sakit = 0, izin = 0, alpha = 0, stb = 0

    const resignDate: string | null = emp.tanggal_resign || null

    for (let d = 1; d <= jmlHari; d++) {
      const tgl = `${tahun}-${String(bln).padStart(2,'0')}-${String(d).padStart(2,'0')}`
      const roster = rosterMap[`${emp.nrp}_${tgl}`] || null
      const att    = attMap[`${emp.nrp}_${tgl}`] || null

      const isFuture = tgl > todaySite
      const isAfterResign = !!(resignDate && tgl > resignDate)

      const isOperator = isJabatanOperator(emp.jabatan)
      const tsOptKode = cariTsOpt(tgl, emp)
      const tsHm = ringkasTsOpt(tgl, emp)
      const cell = konversiCell(roster, att, isFuture, isAfterResign, tsOptKode, isOperator)

      days.push({
        tanggal: tgl,
        day: d,
        code: cell.code,
        type: cell.type,
        roster,
        unit: tsHm.unit,
        hm_awal: tsHm.hm_awal,
        hm_akhir: tsHm.hm_akhir,
        hm_total: tsHm.hm_total,
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
      if (['DS','NS','DW','NW'].includes(cell.code)) hariHadir++
      if (cell.code === 'DS' || cell.code === 'DW') shiftS++
      if (cell.code === 'NS' || cell.code === 'NW') shiftM++
      if (cell.code === 'OFF') off++
      if (['CR','CT','LV','SCK','MCK'].includes(cell.code)) cuti++
      if (cell.code === 'S') sakit++
      if (cell.code === 'I' || cell.code === 'IR') izin++
      if (cell.code === 'A') alpha++
      if (cell.code === 'ID' || cell.code === 'TR') stb++
    }

    const persen = hariKerja > 0 ? Math.round((hariHadir / hariKerja) * 100) : 0

    const lemburList = lemburMap[String(emp.nrp)] || []
    const lemburMenunggu = lemburMenungguMap[String(emp.nrp)] || []
    const totalJam = (arr: any[]) => Math.round(arr.reduce((a, l) => a + Number(l.jam || 0), 0) * 100) / 100

    return {
      nrp: emp.nrp,
      nama: emp.nama,
      lembur: lemburList,
      lembur_menunggu: lemburMenunggu,
      jabatan: emp.jabatan || '-',
      departemen: grupAbsensi(emp.departemen, emp.jabatan),
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
        lembur: lemburList.length,
        lembur_menunggu: lemburMenunggu.length,
        jam_lembur: totalJam(lemburList),
        jam_lembur_menunggu: totalJam(lemburMenunggu),
        kompensasi_cuti: kompMap[String(emp.nrp)]?.hari || 0,
        kompensasi_keterangan: kompMap[String(emp.nrp)]?.keterangan || null,
        kompensasi_oleh: kompMap[String(emp.nrp)]?.oleh || null,
        kompensasi_menunggu: kompMenungguMap[String(emp.nrp)] || 0,
        persen
      }
    }
  })

  function intiNrp(nrp: any): string {
    return String(nrp || '').trim().toUpperCase().replace(/^B/, '')
  }
  function kunciOrang(r: any): string {
    const inti = intiNrp(r.nrp)
    if (inti) return 'NRP:' + inti
    return 'NAMA:' + String(r.nama || '').trim().toUpperCase().replace(/\s+/g, ' ')
  }
  function skorHari(d: any): number {
    if (!d) return 0
    if (d.clock_in || ['DS', 'NS', 'DW', 'NW'].includes(d.code)) return 4
    if (['OFF', 'CR', 'CT', 'S', 'I', 'IR', 'ID', 'TR', 'LV', 'SCK', 'MCK'].includes(d.code)) return 3
    if (d.code === 'A') return 2
    if (d.code && d.code !== '-') return 1
    return 0
  }
  const byKey = new Map<string, any>()
  for (const r of rows) {
    const k = kunciOrang(r)
    const ada = byKey.get(k)
    if (!ada) { byKey.set(k, r); continue }
    const n = Math.max(ada.days?.length || 0, r.days?.length || 0)
    const days = Array.from({ length: n }, (_, i) => {
      const x = ada.days?.[i]
      const y = r.days?.[i]
      if (x && y) {
        const pilih = skorHari(y) > skorHari(x) ? y : x
        const lain = pilih === y ? x : y
        return {
          ...pilih,
          unit: pilih.unit || lain.unit || null,
          hm_awal: pilih.hm_awal ?? lain.hm_awal ?? null,
          hm_akhir: pilih.hm_akhir ?? lain.hm_akhir ?? null,
          hm_total: pilih.hm_total ?? lain.hm_total ?? null,
        }
      }
      return x || y
    })
    const skorA = (ada.days || []).reduce((s: number, d: any) => s + skorHari(d), 0)
    const skorB = (r.days || []).reduce((s: number, d: any) => s + skorHari(d), 0)
    const aB = String(ada.nrp || '').toUpperCase().startsWith('B')
    const bB = String(r.nrp || '').toUpperCase().startsWith('B')
    const utama = skorA !== skorB ? (skorA > skorB ? ada : r) : (aB && !bB ? r : ada)
    byKey.set(k, { ...utama, days })
  }
  const rowsGabung = Array.from(byKey.values())

  const DEPT_ORDER = ['Staff','Plant','Operator','Lainnya']
  const grouped: Record<string, any[]> = {}
  rowsGabung.forEach(r => {
    const dept = grupAbsensi(r.departemen, r.jabatan)
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

  const canEdit = isSuperAdmin ||
                  SITE_EDIT.includes(role) ||
                  LEADER_EDIT.includes(role)

  return NextResponse.json({
    ok: true,
    bulan,
    jmlHari,
    todayWita: todaySite,  // Backward compat
    todaySite,
    siteTimezone: siteTz,
    groups,
    permission: {
      canEdit,
      role,
      isViewOnly: HO_VIEW_ONLY.includes(role)
    }
  })
}