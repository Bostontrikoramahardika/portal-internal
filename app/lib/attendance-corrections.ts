import { supabaseAdmin } from '@/app/lib/supabase'

const SUPER_ADMIN_NRP = '0530224'
const APP_TZ_OFFSET = '+08:00'

const EMPLOYEE_ROLES = ['employee', 'karyawan']
const LEADER_ROLES = [
  'gl_produksi',
  'gl_plant',
  'she_site',
  'pjo_site',
  'atasan',
  'pjo',
  'admin_plant',
]
const HR_SITE_ROLES = ['hr_site', 'hrga_site']
const HR_HO_ROLES = ['hr_ho', 'hrga_pusat', 'hrga_oprek']
const HO_EXEC_ROLES = ['manager_ops', 'director_ops', 'business_dev', 'spv_she_ho']

export type CorrectionType = 'LUPA_CLOCK_IN' | 'LUPA_CLOCK_OUT' | 'KOREKSI_JAM'
export type CorrectionStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type ApproverRule =
  | 'ATASAN'
  | 'HR_SITE'
  | 'PJO'
  | 'HR_HO'
  | 'SUPER_ADMIN'
  | 'FALLBACK'

type SessionLike = {
  nrp?: string
  employee_nrp?: string
  roles?: string[] | unknown
  scope_site?: string | null
  is_super_admin?: boolean
  user?: {
    nrp?: string
    employee_nrp?: string
  }
}

type EmployeeBasic = {
  nrp: string
  nama: string | null
  site: string | null
}

type RoleRow = {
  nrp: string
  role: string
  scope_site: string | null
  active: boolean | null
}

type ApprovalMatrixRow = {
  employee_nrp: string
  atasan_nrp: string
  pjo_nrp: string
  active: boolean | null
}

type AttendanceRow = {
  id: string
  nrp: string
  tanggal: string
  shift: string | null
  clock_in: string | null
  clock_in_lokasi: string | null
  clock_out: string | null
  clock_out_lokasi: string | null
  status: string
  jam_kerja_menit: number | null
  terlambat_menit: number | null
  keterangan: string | null
  site: string | null
  updated_at: string | null
}

type SiteConfigRow = {
  kode_site: string | null
  nama_site: string | null
  siang_jam_masuk: string | null
  malam_jam_masuk: string | null
}

type CorrectionRow = {
  id: string
  employee_nrp: string
  employee_site: string | null
  tanggal: string
  tipe: CorrectionType
  requested_clock_in: string | null
  requested_clock_out: string | null
  requested_shift: string | null
  alasan: string
  bukti_url: string | null
  status: CorrectionStatus
  approver_nrp: string | null
  approver_rule: ApproverRule | null
  approved_by_nrp: string | null
  approved_at: string | null
  approval_note: string | null
  is_hr_override: boolean
  override_by_nrp: string | null
  override_at: string | null
  attendance_before: Record<string, unknown>
  attendance_after: Record<string, unknown>
  created_at: string
  updated_at: string
}

type CreateCorrectionInput = {
  employeeNrp: string
  tanggal: string
  tipe: CorrectionType
  requestedClockIn?: string | null
  requestedClockOut?: string | null
  requestedShift?: string | null
  alasan: string
  buktiUrl?: string | null
  sessionRoles: string[]
  sessionScopeSite?: string | null
  sessionIsSuperAdmin?: boolean
    approverTargetNrp?: string | null
  approverTargetNama?: string | null
  approverTargetRole?: string | null
}

type ApproveInput = {
  correctionId: string
  approverNrp: string
  approverRoles: string[]
  approvalNote?: string | null
  isSuperAdmin?: boolean
}

type RejectInput = {
  correctionId: string
  approverNrp: string
  approverRoles: string[]
  approvalNote?: string | null
  isSuperAdmin?: boolean
}

type OverrideInput = {
  actorNrp: string
  actorRoles: string[]
  actorIsSuperAdmin?: boolean
  employeeNrp: string
  tanggal: string
  tipe: CorrectionType
  requestedClockIn?: string | null
  requestedClockOut?: string | null
  requestedShift?: string | null
  alasan: string
  buktiUrl?: string | null
  approvalNote?: string | null
}

function normalizeText(value: unknown) {
  return String(value || '').trim()
}

function normalizeRole(value: unknown) {
  return normalizeText(value).toLowerCase()
}

function normalizeRoles(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  return input
    .map((item) => normalizeRole(item))
    .filter(Boolean)
}

function uniqueStrings(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)))
}

function hasAnyRole(roles: string[], expected: string[]) {
  const roleSet = new Set(roles.map(normalizeRole))
  return expected.some((role) => roleSet.has(normalizeRole(role)))
}

function ensureDateString(value: unknown) {
  const raw = normalizeText(value)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new Error('Format tanggal harus YYYY-MM-DD')
  }
  return raw
}

function normalizeTime(value: unknown) {
  const raw = normalizeText(value)
  if (!raw) return null
  if (/^\d{2}:\d{2}$/.test(raw)) return `${raw}:00`
  if (/^\d{2}:\d{2}:\d{2}$/.test(raw)) return raw
  throw new Error('Format jam harus HH:mm atau HH:mm:ss')
}

function normalizeShift(value: unknown) {
  const raw = normalizeText(value).toLowerCase()
  if (!raw) return null
  if (raw.includes('malam')) return 'MALAM'
  if (raw.includes('siang')) return 'SIANG'
  return raw.toUpperCase()
}

function inferShiftFromInput(args: {
  existingShift?: string | null
  requestedShift?: string | null
  requestedClockIn?: string | null
  requestedClockOut?: string | null
}) {
  const existingShift = normalizeShift(args.existingShift)
  if (existingShift) return existingShift

  const requestedShift = normalizeShift(args.requestedShift)
  if (requestedShift) return requestedShift

  const basis =
    normalizeTime(args.requestedClockIn) || normalizeTime(args.requestedClockOut)

  if (!basis) return null

  const hour = Number(basis.slice(0, 2))
  if (hour >= 17 || hour < 6) return 'MALAM'
  return 'SIANG'
}

function isNightShift(shift?: string | null) {
  return normalizeShift(shift) === 'MALAM'
}

function addDays(dateString: string, days: number) {
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function buildLocalDate(dateString: string, timeString: string, dayOffset = 0) {
  const safeDate = addDays(dateString, dayOffset)
  return new Date(`${safeDate}T${timeString}${APP_TZ_OFFSET}`)
}

function buildAttendanceTimestamp(args: {
  tanggal: string
  time: string | null
  shift?: string | null
  kind: 'clock_in' | 'clock_out'
}) {
  if (!args.time) return null

  const normalizedTime = normalizeTime(args.time)
  if (!normalizedTime) return null

  let dayOffset = 0

  if (args.kind === 'clock_out' && isNightShift(args.shift)) {
    const hour = Number(normalizedTime.slice(0, 2))
    if (hour < 12) dayOffset = 1
  }

  return buildLocalDate(args.tanggal, normalizedTime, dayOffset)
}

function ensureChronological(clockIn: Date | null, clockOut: Date | null) {
  if (!clockIn || !clockOut) {
    return { clockIn, clockOut }
  }

  if (clockOut.getTime() <= clockIn.getTime()) {
    return {
      clockIn,
      clockOut: new Date(clockOut.getTime() + 24 * 60 * 60 * 1000),
    }
  }

  return { clockIn, clockOut }
}

function minutesDiff(start: Date, end: Date) {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000))
}

function appendKeterangan(existing: string | null | undefined, line: string) {
  const base = normalizeText(existing)
  if (!base) return line
  if (base.includes(line)) return base
  return `${base}\n${line}`
}

function snapshotAttendance(row: AttendanceRow | null) {
  if (!row) return {}
  return {
    id: row.id,
    nrp: row.nrp,
    tanggal: row.tanggal,
    shift: row.shift,
    clock_in: row.clock_in,
    clock_in_lokasi: row.clock_in_lokasi,
    clock_out: row.clock_out,
    clock_out_lokasi: row.clock_out_lokasi,
    status: row.status,
    jam_kerja_menit: row.jam_kerja_menit,
    terlambat_menit: row.terlambat_menit,
    keterangan: row.keterangan,
    site: row.site,
    updated_at: row.updated_at,
  }
}

function deriveStatus(args: {
  previousStatus?: string | null
  clockIn: Date | null
  clockOut: Date | null
  terlambatMenit: number | null
}) {
  const previousStatus = normalizeText(args.previousStatus).toUpperCase()

  if (!args.clockIn && !args.clockOut) {
    return previousStatus || 'PENDING'
  }

  if (args.clockIn && !args.clockOut) {
    return 'BELUM CLOCK OUT'
  }

  if (!args.clockIn && args.clockOut) {
    return 'BELUM CLOCK IN'
  }

  if (['IZIN', 'CUTI', 'SAKIT', 'LIBUR', 'OFF'].includes(previousStatus)) {
    return previousStatus
  }

  if ((args.terlambatMenit || 0) > 0) {
    return 'TERLAMBAT'
  }

  return 'HADIR'
}

export function extractSessionNrp(session: SessionLike) {
  return normalizeText(
    session?.nrp ||
      session?.employee_nrp ||
      session?.user?.nrp ||
      session?.user?.employee_nrp
  )
}

export async function getRolesForSession(session: SessionLike) {
  const sessionRoles = normalizeRoles(session?.roles)
  if (sessionRoles.length > 0) return uniqueStrings(sessionRoles)

  const nrp = extractSessionNrp(session)
  if (!nrp) return []

  const { data, error } = await supabaseAdmin
    .from('roles')
    .select('role')
    .eq('nrp', nrp)
    .eq('active', true)

  if (error) {
    throw new Error(`Gagal ambil role user: ${error.message}`)
  }

  return uniqueStrings((data || []).map((row) => normalizeRole(row.role)))
}

async function getEmployeeBasic(nrp: string): Promise<EmployeeBasic | null> {
  const { data, error } = await supabaseAdmin
    .from('employees')
    .select('nrp, nama, site')
    .eq('nrp', nrp)
    .maybeSingle()

  if (error) {
    throw new Error(`Gagal ambil employee ${nrp}: ${error.message}`)
  }

  return data || null
}

async function getApprovalMatrixRow(nrp: string): Promise<ApprovalMatrixRow | null> {
  const { data, error } = await supabaseAdmin
    .from('approval_matrix')
    .select('employee_nrp, atasan_nrp, pjo_nrp, active')
    .eq('employee_nrp', nrp)
    .eq('active', true)
    .maybeSingle()

  if (error) {
    throw new Error(`Gagal ambil approval_matrix ${nrp}: ${error.message}`)
  }

  return data || null
}

async function getActiveRoleRows(role: string): Promise<RoleRow[]> {
  const { data, error } = await supabaseAdmin
    .from('roles')
    .select('nrp, role, scope_site, active')
    .eq('role', role)
    .eq('active', true)

  if (error) {
    throw new Error(`Gagal ambil role ${role}: ${error.message}`)
  }

  return (data || []) as RoleRow[]
}

async function findRoleHolderBySite(role: string, site?: string | null) {
  const candidates = await getActiveRoleRows(role)
  if (candidates.length === 0) return null

  const normalizedSite = normalizeText(site).toLowerCase()

  if (normalizedSite) {
    const scopeMatch = candidates.find(
      (row) => normalizeText(row.scope_site).toLowerCase() === normalizedSite
    )
    if (scopeMatch?.nrp) return scopeMatch.nrp

    const nrps = candidates.map((row) => row.nrp).filter(Boolean)
    if (nrps.length > 0) {
      const { data, error } = await supabaseAdmin
        .from('employees')
        .select('nrp, site')
        .in('nrp', nrps)

      if (error) {
        throw new Error(`Gagal cari ${role} by site: ${error.message}`)
      }

      const employeeMatch = (data || []).find(
        (row) => normalizeText(row.site).toLowerCase() === normalizedSite
      )
      if (employeeMatch?.nrp) return employeeMatch.nrp
    }
  }

  return candidates[0]?.nrp || null
}

async function findSingleRoleHolder(role: string) {
  const rows = await getActiveRoleRows(role)
  return rows[0]?.nrp || null
}

async function getAttendanceByDate(
  nrp: string,
  tanggal: string
): Promise<AttendanceRow | null> {
  const { data, error } = await supabaseAdmin
    .from('attendance')
    .select(
      'id, nrp, tanggal, shift, clock_in, clock_in_lokasi, clock_out, clock_out_lokasi, status, jam_kerja_menit, terlambat_menit, keterangan, site, updated_at'
    )
    .eq('nrp', nrp)
    .eq('tanggal', tanggal)
    .maybeSingle()

  if (error) {
    throw new Error(`Gagal ambil attendance ${nrp} ${tanggal}: ${error.message}`)
  }

  return (data as AttendanceRow | null) || null
}

async function getSiteConfig(site: string | null): Promise<SiteConfigRow | null> {
  const safeSite = normalizeText(site)
  if (!safeSite) return null

  let result = await supabaseAdmin
    .from('sites_config')
    .select('kode_site, nama_site, siang_jam_masuk, malam_jam_masuk')
    .eq('kode_site', safeSite)
    .maybeSingle()

  if (result.error) {
    throw new Error(`Gagal ambil sites_config by kode_site: ${result.error.message}`)
  }

  if (result.data) return result.data as SiteConfigRow

  result = await supabaseAdmin
    .from('sites_config')
    .select('kode_site, nama_site, siang_jam_masuk, malam_jam_masuk')
    .eq('nama_site', safeSite)
    .maybeSingle()

  if (result.error) {
    throw new Error(`Gagal ambil sites_config by nama_site: ${result.error.message}`)
  }

  return (result.data as SiteConfigRow | null) || null
}

function ensureNotSelf(requesterNrp: string, candidate: string | null) {
  if (!candidate) return null
  if (normalizeText(candidate) === normalizeText(requesterNrp)) return null
  return candidate
}

export async function resolveCorrectionApprover(args: {
  requesterNrp: string
  requesterRoles: string[]
  requesterSite?: string | null
  requesterIsSuperAdmin?: boolean
}) {
  const requesterNrp = normalizeText(args.requesterNrp)
  const requesterRoles = uniqueStrings(args.requesterRoles.map(normalizeRole))
  const requesterProfile = await getEmployeeBasic(requesterNrp)
  const requesterSite =
    normalizeText(args.requesterSite) ||
    normalizeText(requesterProfile?.site) ||
    null

  const approvalMatrix = await getApprovalMatrixRow(requesterNrp)

  if (args.requesterIsSuperAdmin || requesterNrp === SUPER_ADMIN_NRP) {
    return {
      approverNrp: SUPER_ADMIN_NRP,
      approverRule: 'SUPER_ADMIN' as ApproverRule,
      requesterSite,
    }
  }

  if (hasAnyRole(requesterRoles, HR_HO_ROLES) || hasAnyRole(requesterRoles, HO_EXEC_ROLES)) {
    return {
      approverNrp: SUPER_ADMIN_NRP,
      approverRule: 'SUPER_ADMIN' as ApproverRule,
      requesterSite,
    }
  }

  if (hasAnyRole(requesterRoles, HR_SITE_ROLES)) {
    const pjoBySite = ensureNotSelf(
      requesterNrp,
      await findRoleHolderBySite('pjo_site', requesterSite)
    )
    if (pjoBySite) {
      return {
        approverNrp: pjoBySite,
        approverRule: 'PJO' as ApproverRule,
        requesterSite,
      }
    }

    const pjoFromMatrix = ensureNotSelf(requesterNrp, approvalMatrix?.pjo_nrp || null)
    if (pjoFromMatrix) {
      return {
        approverNrp: pjoFromMatrix,
        approverRule: 'PJO' as ApproverRule,
        requesterSite,
      }
    }

    const hrHo = ensureNotSelf(requesterNrp, await findSingleRoleHolder('hr_ho'))
    if (hrHo) {
      return {
        approverNrp: hrHo,
        approverRule: 'HR_HO' as ApproverRule,
        requesterSite,
      }
    }

    return {
      approverNrp: SUPER_ADMIN_NRP,
      approverRule: 'SUPER_ADMIN' as ApproverRule,
      requesterSite,
    }
  }

  if (hasAnyRole(requesterRoles, LEADER_ROLES)) {
    const hrSiteBySite = ensureNotSelf(
      requesterNrp,
      await findRoleHolderBySite('hr_site', requesterSite)
    )
    if (hrSiteBySite) {
      return {
        approverNrp: hrSiteBySite,
        approverRule: 'HR_SITE' as ApproverRule,
        requesterSite,
      }
    }

    const pjoBySite = ensureNotSelf(
      requesterNrp,
      await findRoleHolderBySite('pjo_site', requesterSite)
    )
    if (pjoBySite) {
      return {
        approverNrp: pjoBySite,
        approverRule: 'PJO' as ApproverRule,
        requesterSite,
      }
    }

    const pjoFromMatrix = ensureNotSelf(requesterNrp, approvalMatrix?.pjo_nrp || null)
    if (pjoFromMatrix) {
      return {
        approverNrp: pjoFromMatrix,
        approverRule: 'PJO' as ApproverRule,
        requesterSite,
      }
    }

    return {
      approverNrp: SUPER_ADMIN_NRP,
      approverRule: 'SUPER_ADMIN' as ApproverRule,
      requesterSite,
    }
  }

  if (hasAnyRole(requesterRoles, EMPLOYEE_ROLES) || requesterRoles.length === 0) {
    const atasan = ensureNotSelf(requesterNrp, approvalMatrix?.atasan_nrp || null)
    if (atasan) {
      return {
        approverNrp: atasan,
        approverRule: 'ATASAN' as ApproverRule,
        requesterSite,
      }
    }

    const hrSiteBySite = ensureNotSelf(
      requesterNrp,
      await findRoleHolderBySite('hr_site', requesterSite)
    )
    if (hrSiteBySite) {
      return {
        approverNrp: hrSiteBySite,
        approverRule: 'HR_SITE' as ApproverRule,
        requesterSite,
      }
    }

    const pjoBySite = ensureNotSelf(
      requesterNrp,
      await findRoleHolderBySite('pjo_site', requesterSite)
    )
    if (pjoBySite) {
      return {
        approverNrp: pjoBySite,
        approverRule: 'PJO' as ApproverRule,
        requesterSite,
      }
    }

    return {
      approverNrp: SUPER_ADMIN_NRP,
      approverRule: 'SUPER_ADMIN' as ApproverRule,
      requesterSite,
    }
  }

  return {
    approverNrp: SUPER_ADMIN_NRP,
    approverRule: 'FALLBACK' as ApproverRule,
    requesterSite,
  }
}

function validateCorrectionPayload(args: {
  tipe: string
  tanggal: string
  alasan: string
  requestedClockIn?: string | null
  requestedClockOut?: string | null
}) {
  const tanggal = ensureDateString(args.tanggal)
  const tipe = normalizeText(args.tipe) as CorrectionType
  const alasan = normalizeText(args.alasan)

  if (!['LUPA_CLOCK_IN', 'LUPA_CLOCK_OUT', 'KOREKSI_JAM'].includes(tipe)) {
    throw new Error('Tipe koreksi tidak valid')
  }

  if (!alasan) {
    throw new Error('Alasan wajib diisi')
  }

  const requestedClockIn = normalizeTime(args.requestedClockIn)
  const requestedClockOut = normalizeTime(args.requestedClockOut)

  if (tipe === 'LUPA_CLOCK_IN' && !requestedClockIn) {
    throw new Error('Jam clock in wajib diisi')
  }

  if (tipe === 'LUPA_CLOCK_OUT' && !requestedClockOut) {
    throw new Error('Jam clock out wajib diisi')
  }

  if (tipe === 'KOREKSI_JAM' && !requestedClockIn && !requestedClockOut) {
    throw new Error('Isi minimal salah satu jam koreksi')
  }

  return {
    tanggal,
    tipe,
    alasan,
    requestedClockIn,
    requestedClockOut,
  }
}

async function enrichCorrections(rows: CorrectionRow[], viewerNrp: string, viewerRoles: string[], isSuperAdmin: boolean) {
  const nrps = uniqueStrings(
    rows.flatMap((row) => [row.employee_nrp, row.approver_nrp || '', row.approved_by_nrp || ''])
  )

  const employeeMap = new Map<string, EmployeeBasic>()
  if (nrps.length > 0) {
    const { data, error } = await supabaseAdmin
      .from('employees')
      .select('nrp, nama, site')
      .in('nrp', nrps)

    if (error) {
      throw new Error(`Gagal enrich employee corrections: ${error.message}`)
    }

    for (const row of (data || []) as EmployeeBasic[]) {
      employeeMap.set(row.nrp, row)
    }
  }

  return rows.map((row) => {
    const employee = employeeMap.get(row.employee_nrp)
    const approver = row.approver_nrp ? employeeMap.get(row.approver_nrp) : null
    const approvedBy = row.approved_by_nrp ? employeeMap.get(row.approved_by_nrp) : null

    const canApprove =
      row.status === 'PENDING' &&
      (isSuperAdmin || normalizeText(row.approver_nrp) === normalizeText(viewerNrp))

    const canOverride =
      isSuperAdmin ||
      hasAnyRole(viewerRoles, HR_SITE_ROLES) ||
      hasAnyRole(viewerRoles, HR_HO_ROLES)

    return {
      ...row,
      employee_nama: employee?.nama || null,
      employee_site_resolved: employee?.site || row.employee_site || null,
      approver_nama: approver?.nama || null,
      approved_by_nama: approvedBy?.nama || null,
      can_approve: canApprove,
      can_override: canOverride,
      is_mine: normalizeText(row.employee_nrp) === normalizeText(viewerNrp),
    }
  })
}

function canViewCorrection(args: {
  correction: CorrectionRow
  viewerNrp: string
  viewerRoles: string[]
  isSuperAdmin: boolean
}) {
  if (args.isSuperAdmin) return true

  const viewerNrp = normalizeText(args.viewerNrp)
  if (!viewerNrp) return false

  if (normalizeText(args.correction.employee_nrp) === viewerNrp) return true
  if (normalizeText(args.correction.approver_nrp) === viewerNrp) return true

  if (hasAnyRole(args.viewerRoles, HR_SITE_ROLES)) return true
  if (hasAnyRole(args.viewerRoles, HR_HO_ROLES)) return true

  return false
}

function canOverrideByRole(roles: string[], isSuperAdmin: boolean) {
  if (isSuperAdmin) return true
  if (hasAnyRole(roles, HR_SITE_ROLES)) return true
  if (hasAnyRole(roles, HR_HO_ROLES)) return true
  return false
}

async function prepareAttendanceMutation(args: {
  correction: CorrectionRow
  attendance: AttendanceRow | null
}) {
  const correction = args.correction
  const attendance = args.attendance

  const effectiveShift = inferShiftFromInput({
    existingShift: attendance?.shift || null,
    requestedShift: correction.requested_shift,
    requestedClockIn: correction.requested_clock_in,
    requestedClockOut: correction.requested_clock_out,
  })

  const currentClockIn = attendance?.clock_in ? new Date(attendance.clock_in) : null
  const currentClockOut = attendance?.clock_out ? new Date(attendance.clock_out) : null

  const nextClockIn =
    correction.requested_clock_in !== null
      ? buildAttendanceTimestamp({
          tanggal: correction.tanggal,
          time: correction.requested_clock_in,
          shift: effectiveShift,
          kind: 'clock_in',
        })
      : currentClockIn

  const nextClockOut =
    correction.requested_clock_out !== null
      ? buildAttendanceTimestamp({
          tanggal: correction.tanggal,
          time: correction.requested_clock_out,
          shift: effectiveShift,
          kind: 'clock_out',
        })
      : currentClockOut

  const normalizedPair = ensureChronological(nextClockIn, nextClockOut)

  const employee = await getEmployeeBasic(correction.employee_nrp)
  const site = attendance?.site || correction.employee_site || employee?.site || null
  const siteConfig = await getSiteConfig(site)

  let terlambatMenit: number | null = attendance?.terlambat_menit ?? null
  if (normalizedPair.clockIn && siteConfig) {
    const scheduledTime = isNightShift(effectiveShift)
      ? siteConfig.malam_jam_masuk
      : siteConfig.siang_jam_masuk

    if (scheduledTime) {
      const scheduledClockIn = buildAttendanceTimestamp({
        tanggal: correction.tanggal,
        time: scheduledTime,
        shift: effectiveShift,
        kind: 'clock_in',
      })

      if (scheduledClockIn) {
        terlambatMenit = Math.max(0, minutesDiff(scheduledClockIn, normalizedPair.clockIn))
      }
    }
  }

  const jamKerjaMenit =
    normalizedPair.clockIn && normalizedPair.clockOut
      ? minutesDiff(normalizedPair.clockIn, normalizedPair.clockOut)
      : null

  const status = deriveStatus({
    previousStatus: attendance?.status,
    clockIn: normalizedPair.clockIn,
    clockOut: normalizedPair.clockOut,
    terlambatMenit,
  })

  const note = `[KOREKSI ABSENSI] ${correction.tipe} disetujui via sistem`

  const payload = {
    nrp: correction.employee_nrp,
    tanggal: correction.tanggal,
    shift: effectiveShift,
    clock_in: normalizedPair.clockIn ? normalizedPair.clockIn.toISOString() : null,
    clock_out: normalizedPair.clockOut ? normalizedPair.clockOut.toISOString() : null,
    clock_in_lokasi:
      correction.requested_clock_in !== null
        ? attendance?.clock_in_lokasi || 'KOREKSI ABSENSI - SISTEM'
        : attendance?.clock_in_lokasi || null,
    clock_out_lokasi:
      correction.requested_clock_out !== null
        ? attendance?.clock_out_lokasi || 'KOREKSI ABSENSI - SISTEM'
        : attendance?.clock_out_lokasi || null,
    status,
    jam_kerja_menit: jamKerjaMenit,
    terlambat_menit: terlambatMenit,
    site,
    keterangan: appendKeterangan(attendance?.keterangan, note),
    updated_at: new Date().toISOString(),
  }

  return payload
}

async function applyCorrectionToAttendance(args: {
  correction: CorrectionRow
}) {
  const correction = args.correction
  const currentAttendance = await getAttendanceByDate(correction.employee_nrp, correction.tanggal)
  const before = snapshotAttendance(currentAttendance)

  const payload = await prepareAttendanceMutation({
    correction,
    attendance: currentAttendance,
  })

  let result
  if (currentAttendance?.id) {
    result = await supabaseAdmin
      .from('attendance')
      .update(payload)
      .eq('id', currentAttendance.id)
      .select(
        'id, nrp, tanggal, shift, clock_in, clock_in_lokasi, clock_out, clock_out_lokasi, status, jam_kerja_menit, terlambat_menit, keterangan, site, updated_at'
      )
      .single()
  } else {
    result = await supabaseAdmin
      .from('attendance')
      .insert(payload)
      .select(
        'id, nrp, tanggal, shift, clock_in, clock_in_lokasi, clock_out, clock_out_lokasi, status, jam_kerja_menit, terlambat_menit, keterangan, site, updated_at'
      )
      .single()
  }

  if (result.error) {
    throw new Error(`Gagal apply koreksi ke attendance: ${result.error.message}`)
  }

  const after = snapshotAttendance(result.data as AttendanceRow)

  return {
    attendance: result.data as AttendanceRow,
    before,
    after,
  }
}

async function closePendingCorrections(args: {
  employeeNrp: string
  tanggal: string
  tipe: CorrectionType
  actorNrp: string
  note: string
}) {
  const { error } = await supabaseAdmin
    .from('attendance_corrections')
    .update({
      status: 'REJECTED',
      approved_by_nrp: args.actorNrp,
      approved_at: new Date().toISOString(),
      approval_note: args.note,
      updated_at: new Date().toISOString(),
    })
    .eq('employee_nrp', args.employeeNrp)
    .eq('tanggal', args.tanggal)
    .eq('tipe', args.tipe)
    .eq('status', 'PENDING')

  if (error) {
    throw new Error(`Gagal menutup pending correction lama: ${error.message}`)
  }
}

export async function createCorrectionRequest(input: CreateCorrectionInput) {
  const employeeNrp = normalizeText(input.employeeNrp)
  if (!employeeNrp) throw new Error('NRP employee tidak valid')

  const validated = validateCorrectionPayload({
    tipe: input.tipe,
    tanggal: input.tanggal,
    alasan: input.alasan,
    requestedClockIn: input.requestedClockIn,
    requestedClockOut: input.requestedClockOut,
  })

  const employee = await getEmployeeBasic(employeeNrp)
  if (!employee) {
    throw new Error('Data karyawan tidak ditemukan')
  }

  const existingAttendance = await getAttendanceByDate(employeeNrp, validated.tanggal)

  const requestedShift = normalizeShift(input.requestedShift)
  const inferredShift = inferShiftFromInput({
    existingShift: existingAttendance?.shift || null,
    requestedShift,
    requestedClockIn: validated.requestedClockIn,
    requestedClockOut: validated.requestedClockOut,
  })

  if (!existingAttendance && !inferredShift) {
    throw new Error('Shift wajib dipilih jika data attendance hari itu belum ada')
  }

  const approver = await resolveCorrectionApprover({
    requesterNrp: employeeNrp,
    requesterRoles: input.sessionRoles,
    requesterSite: employee.site || input.sessionScopeSite || null,
    requesterIsSuperAdmin: input.sessionIsSuperAdmin,
  })

  const payload = {
    employee_nrp: employeeNrp,
    employee_site: employee.site || input.sessionScopeSite || null,
    tanggal: validated.tanggal,
    tipe: validated.tipe,
    requested_clock_in: validated.requestedClockIn,
    requested_clock_out: validated.requestedClockOut,
    requested_shift: inferredShift,
    alasan: validated.alasan,
    bukti_url: normalizeText(input.buktiUrl) || null,
    status: 'PENDING' as CorrectionStatus,
    approver_nrp: approver.approverNrp,
    approver_rule: approver.approverRule,
    attendance_before: snapshotAttendance(existingAttendance),
    approver_target_nrp: normalizeText(input.approverTargetNrp) || null,
    approver_target_nama: normalizeText(input.approverTargetNama) || null,
    approver_target_role: normalizeText(input.approverTargetRole) || null,
  }

  const { data, error } = await supabaseAdmin
    .from('attendance_corrections')
    .insert(payload)
    .select('*')
    .single()

  if (error) {
    if ((error as { code?: string }).code === '23505') {
      throw new Error(
        'Masih ada pengajuan pending untuk tanggal dan tipe koreksi yang sama'
      )
    }
    throw new Error(`Gagal membuat pengajuan koreksi: ${error.message}`)
  }

  const enriched = await enrichCorrections(
    [data as CorrectionRow],
    employeeNrp,
    input.sessionRoles,
    !!input.sessionIsSuperAdmin
  )

  return enriched[0]
}

export async function listCorrections(args: {
  viewerNrp: string
  viewerRoles: string[]
  isSuperAdmin: boolean
  view: 'my' | 'approval'
  status?: string | null
  limit?: number
}) {
  const limit = Math.min(Math.max(Number(args.limit || 50), 1), 200)
  const normalizedStatus = normalizeText(args.status).toUpperCase()

  let query = supabaseAdmin
    .from('attendance_corrections')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (args.view === 'my') {
    query = query.eq('employee_nrp', args.viewerNrp)
  } else if (!args.isSuperAdmin) {
    query = query.eq('approver_nrp', args.viewerNrp)
  }

  if (['PENDING', 'APPROVED', 'REJECTED'].includes(normalizedStatus)) {
    query = query.eq('status', normalizedStatus)
  }

  const { data, error, count } = await query

  if (error) {
    throw new Error(`Gagal ambil list correction: ${error.message}`)
  }

  const myPendingRes = await supabaseAdmin
    .from('attendance_corrections')
    .select('id', { count: 'exact', head: true })
    .eq('employee_nrp', args.viewerNrp)
    .eq('status', 'PENDING')

  if (myPendingRes.error) {
    throw new Error(`Gagal hitung my pending correction: ${myPendingRes.error.message}`)
  }

  let approvalPendingRes
  if (args.isSuperAdmin) {
    approvalPendingRes = await supabaseAdmin
      .from('attendance_corrections')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'PENDING')
  } else {
    approvalPendingRes = await supabaseAdmin
      .from('attendance_corrections')
      .select('id', { count: 'exact', head: true })
      .eq('approver_nrp', args.viewerNrp)
      .eq('status', 'PENDING')
  }

  if (approvalPendingRes.error) {
    throw new Error(
      `Gagal hitung approval pending correction: ${approvalPendingRes.error.message}`
    )
  }

  const enriched = await enrichCorrections(
    (data || []) as CorrectionRow[],
    args.viewerNrp,
    args.viewerRoles,
    args.isSuperAdmin
  )

  return {
    items: enriched,
    total: count || 0,
    summary: {
      my_pending_count: myPendingRes.count || 0,
      approval_pending_count: approvalPendingRes.count || 0,
      show_approval_banner: (approvalPendingRes.count || 0) > 0,
    },
  }
}

export async function getCorrectionDetail(args: {
  correctionId: string
  viewerNrp: string
  viewerRoles: string[]
  isSuperAdmin: boolean
}) {
  const { data, error } = await supabaseAdmin
    .from('attendance_corrections')
    .select('*')
    .eq('id', args.correctionId)
    .maybeSingle()

  if (error) {
    throw new Error(`Gagal ambil detail correction: ${error.message}`)
  }

  if (!data) {
    throw new Error('Pengajuan koreksi tidak ditemukan')
  }

  const correction = data as CorrectionRow

  if (
    !canViewCorrection({
      correction,
      viewerNrp: args.viewerNrp,
      viewerRoles: args.viewerRoles,
      isSuperAdmin: args.isSuperAdmin,
    })
  ) {
    throw new Error('Tidak punya akses melihat pengajuan ini')
  }

  const enriched = await enrichCorrections(
    [correction],
    args.viewerNrp,
    args.viewerRoles,
    args.isSuperAdmin
  )

  return enriched[0]
}

export async function approveCorrectionRequest(input: ApproveInput) {
  const { data, error } = await supabaseAdmin
    .from('attendance_corrections')
    .select('*')
    .eq('id', input.correctionId)
    .maybeSingle()

  if (error) {
    throw new Error(`Gagal ambil correction untuk approve: ${error.message}`)
  }

  if (!data) {
    throw new Error('Pengajuan koreksi tidak ditemukan')
  }

  const correction = data as CorrectionRow

  if (correction.status !== 'PENDING') {
    throw new Error('Pengajuan ini sudah diproses sebelumnya')
  }

  const allowed =
    input.isSuperAdmin ||
    normalizeText(correction.approver_nrp) === normalizeText(input.approverNrp)

  if (!allowed) {
    throw new Error('Anda tidak berhak approve pengajuan ini')
  }

  const applied = await applyCorrectionToAttendance({ correction })

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('attendance_corrections')
    .update({
      status: 'APPROVED',
      approved_by_nrp: input.approverNrp,
      approved_at: new Date().toISOString(),
      approval_note: normalizeText(input.approvalNote) || null,
      attendance_before: applied.before,
      attendance_after: applied.after,
      updated_at: new Date().toISOString(),
    })
    .eq('id', correction.id)
    .select('*')
    .single()

  if (updateError) {
    throw new Error(`Gagal update status approved: ${updateError.message}`)
  }

  const enriched = await enrichCorrections(
    [updated as CorrectionRow],
    input.approverNrp,
    input.approverRoles,
    !!input.isSuperAdmin
  )

  return {
    correction: enriched[0],
    attendance: applied.attendance,
  }
}

export async function rejectCorrectionRequest(input: RejectInput) {
  const { data, error } = await supabaseAdmin
    .from('attendance_corrections')
    .select('*')
    .eq('id', input.correctionId)
    .maybeSingle()

  if (error) {
    throw new Error(`Gagal ambil correction untuk reject: ${error.message}`)
  }

  if (!data) {
    throw new Error('Pengajuan koreksi tidak ditemukan')
  }

  const correction = data as CorrectionRow

  if (correction.status !== 'PENDING') {
    throw new Error('Pengajuan ini sudah diproses sebelumnya')
  }

  const allowed =
    input.isSuperAdmin ||
    normalizeText(correction.approver_nrp) === normalizeText(input.approverNrp)

  if (!allowed) {
    throw new Error('Anda tidak berhak reject pengajuan ini')
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('attendance_corrections')
    .update({
      status: 'REJECTED',
      approved_by_nrp: input.approverNrp,
      approved_at: new Date().toISOString(),
      approval_note: normalizeText(input.approvalNote) || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', correction.id)
    .select('*')
    .single()

  if (updateError) {
    throw new Error(`Gagal update status rejected: ${updateError.message}`)
  }

  const enriched = await enrichCorrections(
    [updated as CorrectionRow],
    input.approverNrp,
    input.approverRoles,
    !!input.isSuperAdmin
  )

  return enriched[0]
}

export async function overrideCorrectionRequest(input: OverrideInput) {
  if (!canOverrideByRole(input.actorRoles, !!input.actorIsSuperAdmin)) {
    throw new Error('Hanya HR / super admin yang bisa override absensi')
  }

  const employeeNrp = normalizeText(input.employeeNrp)
  if (!employeeNrp) {
    throw new Error('NRP employee wajib diisi')
  }

  const validated = validateCorrectionPayload({
    tipe: input.tipe,
    tanggal: input.tanggal,
    alasan: input.alasan,
    requestedClockIn: input.requestedClockIn,
    requestedClockOut: input.requestedClockOut,
  })

  const employee = await getEmployeeBasic(employeeNrp)
  if (!employee) {
    throw new Error('Data karyawan tidak ditemukan')
  }

  const existingAttendance = await getAttendanceByDate(employeeNrp, validated.tanggal)
  const requestedShift = normalizeShift(input.requestedShift)
  const inferredShift = inferShiftFromInput({
    existingShift: existingAttendance?.shift || null,
    requestedShift,
    requestedClockIn: validated.requestedClockIn,
    requestedClockOut: validated.requestedClockOut,
  })

  if (!existingAttendance && !inferredShift) {
    throw new Error('Shift wajib dipilih jika data attendance hari itu belum ada')
  }

  const approverRule: ApproverRule = input.actorIsSuperAdmin
    ? 'SUPER_ADMIN'
    : hasAnyRole(input.actorRoles, HR_HO_ROLES)
    ? 'HR_HO'
    : 'HR_SITE'

  const insertRes = await supabaseAdmin
    .from('attendance_corrections')
    .insert({
      employee_nrp: employeeNrp,
      employee_site: employee.site || null,
      tanggal: validated.tanggal,
      tipe: validated.tipe,
      requested_clock_in: validated.requestedClockIn,
      requested_clock_out: validated.requestedClockOut,
      requested_shift: inferredShift,
      alasan: validated.alasan,
      bukti_url: normalizeText(input.buktiUrl) || null,
      status: 'PENDING',
      approver_nrp: input.actorNrp,
      approver_rule: approverRule,
      is_hr_override: true,
      override_by_nrp: input.actorNrp,
      override_at: new Date().toISOString(),
      attendance_before: snapshotAttendance(existingAttendance),
    })
    .select('*')
    .single()

  if (insertRes.error) {
    throw new Error(`Gagal membuat log override correction: ${insertRes.error.message}`)
  }

  const correction = insertRes.data as CorrectionRow
  const applied = await applyCorrectionToAttendance({ correction })

  const note =
    normalizeText(input.approvalNote) ||
    `[OVERRIDE HR] Koreksi langsung oleh ${input.actorNrp}`

  const updateRes = await supabaseAdmin
    .from('attendance_corrections')
    .update({
      status: 'APPROVED',
      approved_by_nrp: input.actorNrp,
      approved_at: new Date().toISOString(),
      approval_note: note,
      attendance_before: applied.before,
      attendance_after: applied.after,
      updated_at: new Date().toISOString(),
    })
    .eq('id', correction.id)
    .select('*')
    .single()

  if (updateRes.error) {
    throw new Error(`Gagal finalisasi override correction: ${updateRes.error.message}`)
  }

  await closePendingCorrections({
    employeeNrp,
    tanggal: validated.tanggal,
    tipe: validated.tipe,
    actorNrp: input.actorNrp,
    note: `[AUTO CLOSED] Ditutup karena HR override oleh ${input.actorNrp}`,
  })

  const enriched = await enrichCorrections(
    [updateRes.data as CorrectionRow],
    input.actorNrp,
    input.actorRoles,
    !!input.actorIsSuperAdmin
  )

  return {
    correction: enriched[0],
    attendance: applied.attendance,
  }
}