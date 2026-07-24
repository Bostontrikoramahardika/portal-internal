// app/lib/timezone.ts
// ═══════════════════════════════════════════════════════════
// 🕐 TIMEZONE HELPER — WITA (UTC+8)
// ═══════════════════════════════════════════════════════════
// Gunakan helper ini di SEMUA endpoint yang butuh tanggal/jam lokal
// JANGAN pakai new Date().toISOString().split('T')[0] langsung!
// karena itu return UTC, bukan WITA.
// ═══════════════════════════════════════════════════════════

const WITA_OFFSET_MS = 8 * 60 * 60 * 1000  // +8 jam

/**
 * Get current date in WITA timezone (UTC+8)
 * Return: Date object (yang jam-nya sudah geser ke WITA)
 * Note: getUTCHours() di object ini akan return jam WITA (bukan UTC)
 */
export function getWitaNow(): Date {
  return new Date(Date.now() + WITA_OFFSET_MS)
}

/**
 * Get today's date in WITA as YYYY-MM-DD string
 * Contoh: "2026-07-24"
 */
export function getWitaToday(): string {
  return getWitaNow().toISOString().split('T')[0]
}

/**
 * Convert Date/string ke WITA Date object
 * Berguna untuk convert clockTime ke WITA sebelum ambil tanggal
 */
export function toWita(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Date(d.getTime() + WITA_OFFSET_MS)
}

/**
 * Get tanggal WITA (YYYY-MM-DD) dari Date object apapun
 */
export function toWitaDate(date: Date | string): string {
  return toWita(date).toISOString().split('T')[0]
}

/**
 * Get jam WITA (0-23)
 * Pengganti getHours() yang default pakai UTC
 */
export function getWitaHour(date?: Date | string): number {
  const d = date ? toWita(date) : getWitaNow()
  return d.getUTCHours()
}

/**
 * Get menit WITA (0-59)
 */
export function getWitaMinute(date?: Date | string): number {
  const d = date ? toWita(date) : getWitaNow()
  return d.getUTCMinutes()
}

/**
 * Get first day of current month in WITA (YYYY-MM-DD)
 * Contoh: "2026-07-01"
 */
export function getWitaFirstDayOfMonth(): string {
  const wita = getWitaNow()
  wita.setUTCDate(1)
  return wita.toISOString().split('T')[0]
}

/**
 * Get first day of any month in WITA (YYYY-MM-DD)
 * @param year - Tahun (e.g. 2026)
 * @param month - Bulan 1-12
 */
export function getWitaFirstDayOfMonthByYearMonth(year: number, month: number): string {
  const paddedMonth = String(month).padStart(2, '0')
  return `${year}-${paddedMonth}-01`
}

/**
 * Get last day of any month
 * @param year - Tahun (e.g. 2026)
 * @param month - Bulan 1-12
 */
export function getWitaLastDayOfMonth(year: number, month: number): string {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const paddedMonth = String(month).padStart(2, '0')
  const paddedDay = String(lastDay).padStart(2, '0')
  return `${year}-${paddedMonth}-${paddedDay}`
}

/**
 * Format Date ke jam WITA "HH:MM" atau "HH:MM:SS"
 */
export function formatWitaTime(date: Date | string, withSeconds = false): string {
  const wita = toWita(date)
  const h = String(wita.getUTCHours()).padStart(2, '0')
  const m = String(wita.getUTCMinutes()).padStart(2, '0')
  if (!withSeconds) return `${h}:${m}`
  const s = String(wita.getUTCSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
}

/**
 * Format Date ke "DD/MM/YYYY" WITA
 */
export function formatWitaDate(date: Date | string): string {
  const wita = toWita(date)
  const d = String(wita.getUTCDate()).padStart(2, '0')
  const m = String(wita.getUTCMonth() + 1).padStart(2, '0')
  const y = wita.getUTCFullYear()
  return `${d}/${m}/${y}`
}