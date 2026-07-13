/**
 * 🔐 PERMISSION HELPER v1.0
 * 
 * Central utility untuk cek hak akses user di seluruh aplikasi.
 * 
 * Rules:
 * - Super Admin (Ricky) SELALU return true (bypass semua permission)
 * - User biasa dicek berdasarkan array permissions dari session
 */

export interface UserContext {
  is_super_admin?: boolean
  permissions?: string[]
  roles?: string[]
}

/**
 * Cek apakah user punya SATU permission tertentu
 * @example hasPermission(user, 'karyawan_edit')
 */
export function hasPermission(user: UserContext | null | undefined, permKey: string): boolean {
  if (!user) return false
  if (user.is_super_admin) return true
  return (user.permissions || []).includes(permKey)
}

/**
 * Cek apakah user punya SALAH SATU dari beberapa permissions (OR logic)
 * @example hasAnyPermission(user, ['karyawan_edit', 'karyawan_delete'])
 */
export function hasAnyPermission(user: UserContext | null | undefined, permKeys: string[]): boolean {
  if (!user) return false
  if (user.is_super_admin) return true
  return permKeys.some(k => (user.permissions || []).includes(k))
}

/**
 * Cek apakah user punya SEMUA permissions dari list (AND logic)
 * @example hasAllPermissions(user, ['karyawan_edit', 'karyawan_delete'])
 */
export function hasAllPermissions(user: UserContext | null | undefined, permKeys: string[]): boolean {
  if (!user) return false
  if (user.is_super_admin) return true
  return permKeys.every(k => (user.permissions || []).includes(k))
}

/**
 * Shortcut untuk cek Super Admin
 */
export function isSuperAdmin(user: UserContext | null | undefined): boolean {
  return !!user?.is_super_admin
}