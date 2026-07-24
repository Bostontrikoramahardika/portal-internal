// app/lib/gps-cache.ts v2.0 — FAST GPS with 3-layer strategy
// Layer 1: Cache (< 5 menit) → INSTANT
// Layer 2: Low accuracy (WiFi/Cell) → 2-5 detik
// Layer 3: High accuracy (GPS satellite) → background upgrade

export type GpsCoords = {
  lat: number
  lng: number
  accuracy: number
  timestamp: number
  source?: 'cache' | 'fast' | 'accurate' | 'fallback'
}

const CACHE_KEY = 'btm_gps_cache_v1'
const CACHE_KEY_PERSIST = 'btm_gps_persist_v1' // untuk fallback last-known
const CACHE_DURATION = 5 * 60 * 1000 // 5 menit

// ═══════════════ CACHE MANAGEMENT ═══════════════
export function getCachedGps(): GpsCoords | null {
  if (typeof window === 'undefined') return null
  try {
    const cached = sessionStorage.getItem(CACHE_KEY)
    if (!cached) return null
    const parsed: GpsCoords = JSON.parse(cached)
    if (Date.now() - parsed.timestamp > CACHE_DURATION) {
      sessionStorage.removeItem(CACHE_KEY)
      return null
    }
    return { ...parsed, source: 'cache' }
  } catch {
    return null
  }
}

// Persistent cache (localStorage) — untuk fallback last-known
export function getPersistedGps(): GpsCoords | null {
  if (typeof window === 'undefined') return null
  try {
    const cached = localStorage.getItem(CACHE_KEY_PERSIST)
    if (!cached) return null
    return JSON.parse(cached) as GpsCoords
  } catch {
    return null
  }
}

export function setCachedGps(lat: number, lng: number, accuracy: number, source?: GpsCoords['source']) {
  if (typeof window === 'undefined') return
  try {
    const data: GpsCoords = { lat, lng, accuracy, timestamp: Date.now(), source }
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data))
    // Persist juga di localStorage untuk fallback
    localStorage.setItem(CACHE_KEY_PERSIST, JSON.stringify(data))
  } catch {}
}

export function clearGpsCache() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(CACHE_KEY)
}

// ═══════════════ FAST GPS (Low Accuracy) ═══════════════
function getFastGps(): Promise<GpsCoords> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Browser tidak support GPS'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: GpsCoords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: Date.now(),
          source: 'fast',
        }
        setCachedGps(coords.lat, coords.lng, coords.accuracy, 'fast')
        resolve(coords)
      },
      (err) => reject(err),
      {
        enableHighAccuracy: false, // ⚡ FAST — WiFi/Cell tower
        timeout: 8000,             // 8 detik cukup untuk low accuracy
        maximumAge: 60000,         // Terima cache OS 1 menit
      }
    )
  })
}

// ═══════════════ ACCURATE GPS (High Accuracy) ═══════════════
function getAccurateGps(): Promise<GpsCoords> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Browser tidak support GPS'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: GpsCoords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: Date.now(),
          source: 'accurate',
        }
        setCachedGps(coords.lat, coords.lng, coords.accuracy, 'accurate')
        resolve(coords)
      },
      (err) => reject(err),
      {
        enableHighAccuracy: true,  // 🎯 ACCURATE — GPS satellite
        timeout: 25000,            // 25 detik untuk lock satellite
        maximumAge: 30000,
      }
    )
  })
}

// ═══════════════ MAIN: SMART GPS (3-layer strategy) ═══════════════
export async function getSmartGps(opts?: {
  onProgress?: (msg: string) => void
  allowFallback?: boolean // izinkan pakai last-known kalau semua gagal
}): Promise<GpsCoords> {
  const { onProgress, allowFallback = true } = opts || {}

  // Layer 1: Cache session (< 5 menit) — INSTANT
  const cached = getCachedGps()
  if (cached) {
    onProgress?.('📍 GPS dari cache (instant)')
    // Background upgrade — refresh cache untuk next call (fire-and-forget)
    getAccurateGps().catch(() => {})
    return cached
  }

  // Layer 2: Fast GPS (WiFi/Cell) — 2-8 detik
  try {
    onProgress?.('🚀 Mencari lokasi cepat...')
    const fast = await getFastGps()
    // Background upgrade ke high accuracy (fire-and-forget)
    getAccurateGps().catch(() => {})
    return fast
  } catch (fastErr) {
    console.warn('[GPS] Fast failed, trying accurate...', fastErr)
  }

  // Layer 3: Accurate GPS — 25 detik
  try {
    onProgress?.('🎯 Mencari GPS akurat (bisa sampai 25 detik)...')
    const accurate = await getAccurateGps()
    return accurate
  } catch (accErr) {
    console.warn('[GPS] Accurate failed', accErr)
    
    // Layer 4: Fallback ke last-known (persist)
    if (allowFallback) {
      const persisted = getPersistedGps()
      if (persisted) {
        onProgress?.('⚠️ Pakai lokasi terakhir yang tersimpan')
        return { ...persisted, source: 'fallback' }
      }
    }
    
    throw new Error('GPS tidak bisa didapat. Pastikan lokasi HP aktif & sinyal ada.')
  }
}

// ═══════════════ BACKWARD COMPAT ═══════════════
// Alias supaya tidak breaking existing code
export function getGpsWithCache(options?: PositionOptions): Promise<GpsCoords> {
  return getSmartGps()
}