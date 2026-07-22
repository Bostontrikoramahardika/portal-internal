// ============================================
// BTM PORTAL - AUTH CACHE HELPER v2.0
// Simpan session user di localStorage
// Supaya dashboard bisa dibuka offline
// v2.0: Tambah token persistence untuk iPhone PWA
// ============================================

const CACHE_KEY_USER      = 'btm_user_cache_v1'
const CACHE_KEY_MENUS     = 'btm_menus_cache_v1'
const CACHE_KEY_TIMESTAMP = 'btm_cache_timestamp_v1'
const CACHE_KEY_TOKEN     = 'btm_session_token_v1'   // ← BARU v2.0
const CACHE_MAX_AGE_DAYS  = 7

// ============ TYPE DEFINITIONS ============
export interface CachedUser {
  nrp: string
  nama: string
  is_super_admin: boolean
  roles: any[]
  permissions?: string[]
  site?: string
  jabatan?: string
  departemen?: string
  [key: string]: any
}

export interface CachedMenus {
  menus: any[]
  [key: string]: any
}

// ============ SIMPAN USER ============
export function saveUserCache(userData: CachedUser): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CACHE_KEY_USER, JSON.stringify(userData))
    localStorage.setItem(CACHE_KEY_TIMESTAMP, new Date().toISOString())
    console.log('💾 Auth Cache: User saved for offline access')
  } catch (err) {
    console.warn('⚠️ Auth Cache: Failed to save user', err)
  }
}

// ============ AMBIL USER ============
export function getUserCache(): CachedUser | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CACHE_KEY_USER)
    if (!raw) return null
    return JSON.parse(raw)
  } catch (err) {
    console.warn('⚠️ Auth Cache: Failed to read user', err)
    return null
  }
}

// ============ SIMPAN MENUS ============
export function saveMenusCache(menusData: any): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CACHE_KEY_MENUS, JSON.stringify(menusData))
    console.log('💾 Auth Cache: Menus saved for offline access')
  } catch (err) {
    console.warn('⚠️ Auth Cache: Failed to save menus', err)
  }
}

// ============ AMBIL MENUS ============
export function getMenusCache(): any | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CACHE_KEY_MENUS)
    if (!raw) return null
    return JSON.parse(raw)
  } catch (err) {
    console.warn('⚠️ Auth Cache: Failed to read menus', err)
    return null
  }
}

// ============ SIMPAN TOKEN (v2.0 — untuk iPhone PWA) ============
export function saveToken(token: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CACHE_KEY_TOKEN, token)
    console.log('💾 Auth Cache: Token saved to localStorage')
  } catch (err) {
    console.warn('⚠️ Auth Cache: Failed to save token', err)
  }
}

// ============ AMBIL TOKEN (v2.0) ============
export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(CACHE_KEY_TOKEN)
  } catch (err) {
    console.warn('⚠️ Auth Cache: Failed to read token', err)
    return null
  }
}

// ============ HAPUS TOKEN (v2.0) ============
export function clearToken(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(CACHE_KEY_TOKEN)
  } catch {}
}

// ============ CEK VALIDITAS CACHE ============
export function isCacheValid(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const timestamp = localStorage.getItem(CACHE_KEY_TIMESTAMP)
    if (!timestamp) return false
    const cachedAt  = new Date(timestamp)
    const now       = new Date()
    const diffDays  = (now.getTime() - cachedAt.getTime()) / (1000 * 60 * 60 * 24)
    return diffDays < CACHE_MAX_AGE_DAYS
  } catch {
    return false
  }
}

// ============ UMUR CACHE (untuk display) ============
export function getCacheAge(): { days: number; hours: number } | null {
  if (typeof window === 'undefined') return null
  try {
    const timestamp = localStorage.getItem(CACHE_KEY_TIMESTAMP)
    if (!timestamp) return null
    const cachedAt = new Date(timestamp)
    const now      = new Date()
    const diffMs   = now.getTime() - cachedAt.getTime()
    return {
      days:  Math.floor(diffMs / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    }
  } catch {
    return null
  }
}

// ============ HAPUS SEMUA CACHE (SAAT LOGOUT) ============
export function clearAuthCache(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(CACHE_KEY_USER)
    localStorage.removeItem(CACHE_KEY_MENUS)
    localStorage.removeItem(CACHE_KEY_TIMESTAMP)
    localStorage.removeItem(CACHE_KEY_TOKEN)   // ← BARU v2.0
    console.log('🗑️ Auth Cache: Cleared')
  } catch (err) {
    console.warn('⚠️ Auth Cache: Failed to clear', err)
  }
}

// ============ DETEKSI ONLINE/OFFLINE ============
export function isOnline(): boolean {
  if (typeof window === 'undefined') return true
  return navigator.onLine
}

// ============ FETCH DENGAN FALLBACK CACHE ============
export async function fetchUserWithFallback(): Promise<{
  data: CachedUser | null
  fromCache: boolean
  isOffline: boolean
}> {
  try {
    const res = await fetch('/api/auth/me', {
      cache: 'no-cache',
      signal: AbortSignal.timeout(5000)
    })
    if (res.ok) {
      const data = await res.json()
      const user = data.user || data
      if (user) saveUserCache(user)
      return { data: user, fromCache: false, isOffline: false }
    }
    return { data: null, fromCache: false, isOffline: false }
  } catch (err) {
    console.log('🔴 Offline detected, loading from cache...')
    const cached = getUserCache()
    if (cached && isCacheValid()) {
      return { data: cached, fromCache: true, isOffline: true }
    }
    return { data: null, fromCache: false, isOffline: true }
  }
}

// ============ FETCH MENUS DENGAN FALLBACK ============
export async function fetchMenusWithFallback(): Promise<{
  data: any | null
  fromCache: boolean
}> {
  try {
    const res = await fetch('/api/menus', {
      cache: 'no-cache',
      signal: AbortSignal.timeout(5000)
    })
    if (res.ok) {
      const data = await res.json()
      saveMenusCache(data)
      return { data, fromCache: false }
    }
    return { data: null, fromCache: false }
  } catch (err) {
    const cached = getMenusCache()
    if (cached) return { data: cached, fromCache: true }
    return { data: null, fromCache: false }
  }
}