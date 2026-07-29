// app/lib/timezone.ts
// ═══════════════════════════════════════════════════════════
// 🌍 UNIVERSAL TIMEZONE HELPER v2.0 (Chat 30 FINAL)
// Multi-region support: WIB, WITA, WIT
// Strategy: Store UTC → Convert to Site Timezone on Display
// ═══════════════════════════════════════════════════════════

export type Timezone = 'Asia/Jakarta' | 'Asia/Makassar' | 'Asia/Jayapura'

export const DEFAULT_TIMEZONE: Timezone = 'Asia/Makassar'

// ═══════════════════════════════════════════════════════════
// CORE FUNCTIONS (v2.0 - Pakai Intl API, akurat & DST-safe)
// ═══════════════════════════════════════════════════════════

/**
 * Format Date/string ke jam site "HH:MM" atau "HH:MM:SS"
 */
export function formatSiteTime(
  date: Date | string | null | undefined,
  tz: Timezone = DEFAULT_TIMEZONE,
  format: 'time' | 'date' | 'datetime' | 'full' = 'time'
): string {
  if (!date) return '--:--'
  
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '--:--'

  const options: Intl.DateTimeFormatOptions = { timeZone: tz, hour12: false }
  
  switch (format) {
    case 'time':
      options.hour = '2-digit'
      options.minute = '2-digit'
      break
    case 'date':
      options.year = 'numeric'
      options.month = '2-digit'
      options.day = '2-digit'
      break
    case 'datetime':
      options.year = 'numeric'
      options.month = '2-digit'
      options.day = '2-digit'
      options.hour = '2-digit'
      options.minute = '2-digit'
      break
    case 'full':
      options.year = 'numeric'
      options.month = '2-digit'
      options.day = '2-digit'
      options.hour = '2-digit'
      options.minute = '2-digit'
      options.second = '2-digit'
      break
  }
  
  return new Intl.DateTimeFormat('en-CA', options).format(d)
}

/**
 * Get tanggal (YYYY-MM-DD) di timezone site
 */
export function getSiteDate(
  date: Date | string | null = null,
  tz: Timezone = DEFAULT_TIMEZONE
): string {
  const d = date ? (typeof date === 'string' ? new Date(date) : date) : new Date()
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d)
}

/**
 * Get jam (0-23) di timezone site
 */
export function getSiteHour(
  date: Date | string | null = null,
  tz: Timezone = DEFAULT_TIMEZONE
): number {
  const d = date ? (typeof date === 'string' ? new Date(date) : date) : new Date()
  const hourStr = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: '2-digit',
    hour12: false
  }).format(d)
  const h = parseInt(hourStr, 10)
  return h === 24 ? 0 : h
}

/**
 * Get menit (0-59) di timezone site
 */
export function getSiteMinute(
  date: Date | string | null = null,
  tz: Timezone = DEFAULT_TIMEZONE
): number {
  const d = date ? (typeof date === 'string' ? new Date(date) : date) : new Date()
  const minStr = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    minute: '2-digit'
  }).format(d)
  return parseInt(minStr, 10)
}

/**
 * Get bulan (1-12) di timezone site
 */
export function getSiteMonth(
  date: Date | string | null = null,
  tz: Timezone = DEFAULT_TIMEZONE
): number {
  const d = date ? (typeof date === 'string' ? new Date(date) : date) : new Date()
  const monthStr = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    month: '2-digit'
  }).format(d)
  return parseInt(monthStr, 10)
}

/**
 * Get tahun di timezone site
 */
export function getSiteYear(
  date: Date | string | null = null,
  tz: Timezone = DEFAULT_TIMEZONE
): number {
  const d = date ? (typeof date === 'string' ? new Date(date) : date) : new Date()
  const yearStr = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric'
  }).format(d)
  return parseInt(yearStr, 10)
}

/**
 * Get first day of current month (YYYY-MM-DD) di timezone site
 */
export function getSiteFirstDayOfMonth(tz: Timezone = DEFAULT_TIMEZONE): string {
  const today = getSiteDate(null, tz)
  return today.substring(0, 8) + '01'
}

/**
 * Get last day of any month
 */
export function getLastDayOfMonth(year: number, month: number): string {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
}

/**
 * Detect shift dari clockInTime UTC berdasarkan timezone site
 * SIANG: 04:00 - 15:59 (waktu site)
 * MALAM: 16:00 - 03:59 (waktu site)
 */
export function detectShiftFromClockIn(
  clockInUTC: Date | string,
  tz: Timezone = DEFAULT_TIMEZONE
): 'SIANG' | 'MALAM' {
  const hour = getSiteHour(clockInUTC, tz)
  return (hour >= 4 && hour < 16) ? 'SIANG' : 'MALAM'
}

/**
 * Get site date + shift dari clock-in time
 */
export function getSiteDateAndShift(
  clockInUTC: Date | string,
  tz: Timezone = DEFAULT_TIMEZONE
): { shiftDate: string; shift: 'SIANG' | 'MALAM' } {
  return {
    shiftDate: getSiteDate(clockInUTC, tz),
    shift: detectShiftFromClockIn(clockInUTC, tz)
  }
}

/**
 * Format Date ke "DD/MM/YYYY" di timezone site
 */
export function formatSiteDateID(
  date: Date | string,
  tz: Timezone = DEFAULT_TIMEZONE
): string {
  const iso = getSiteDate(date, tz)
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

/**
 * Format bulan+tahun Indonesia ("JULI 2026") di timezone site
 */
export function formatSiteMonthYear(
  date: Date | string | null = null,
  tz: Timezone = DEFAULT_TIMEZONE
): string {
  const bulanNama = ['JANUARI','FEBRUARI','MARET','APRIL','MEI','JUNI',
                     'JULI','AGUSTUS','SEPTEMBER','OKTOBER','NOVEMBER','DESEMBER']
  const m = getSiteMonth(date, tz)
  const y = getSiteYear(date, tz)
  return `${bulanNama[m - 1]} ${y}`
}

// ═══════════════════════════════════════════════════════════
// LEGACY COMPAT — Backwards compatible dengan v1
// (Semua file lama yang import fungsi ini tetap jalan)
// ═══════════════════════════════════════════════════════════

/**
 * @deprecated Pakai getSiteDate() dengan tz parameter
 */
export function getWitaToday(): string {
  return getSiteDate(null, 'Asia/Makassar')
}

/**
 * @deprecated Return Date UTC saja, jangan pakai untuk hitung
 */
export function getWitaNow(): Date {
  return new Date()
}

/**
 * @deprecated Pakai getSiteHour() dengan tz parameter
 */
export function getWitaHour(date?: Date | string): number {
  return getSiteHour(date || null, 'Asia/Makassar')
}

/**
 * @deprecated Pakai getSiteMinute() dengan tz parameter
 */
export function getWitaMinute(date?: Date | string): number {
  return getSiteMinute(date || null, 'Asia/Makassar')
}

/**
 * @deprecated Pakai formatSiteTime() dengan tz parameter
 */
export function formatWitaTime(date: Date | string, withSeconds = false): string {
  return formatSiteTime(date, 'Asia/Makassar', withSeconds ? 'full' : 'time')
}

/**
 * @deprecated Pakai formatSiteDateID() dengan tz parameter
 */
export function formatWitaDate(date: Date | string): string {
  return formatSiteDateID(date, 'Asia/Makassar')
}

/**
 * @deprecated Hindari - pakai formatSiteTime langsung
 */
export function toWita(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Date(d.getTime() + 8 * 60 * 60 * 1000)
}

/**
 * @deprecated Pakai getSiteDate() dengan tz parameter
 */
export function toWitaDate(date: Date | string): string {
  return getSiteDate(date, 'Asia/Makassar')
}

/**
 * @deprecated Pakai getSiteFirstDayOfMonth() dengan tz parameter
 */
export function getWitaFirstDayOfMonth(): string {
  return getSiteFirstDayOfMonth('Asia/Makassar')
}

export function getWitaFirstDayOfMonthByYearMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`
}

export function getWitaLastDayOfMonth(year: number, month: number): string {
  return getLastDayOfMonth(year, month)
}