// app/lib/gps-cache.ts
// GPS cache 5 menit untuk hindari minta permission berulang

export type GpsCoords = {
  lat: number
  lng: number
  accuracy: number
  timestamp: number
}

const CACHE_KEY = 'btm_gps_cache_v1'
const CACHE_DURATION = 5 * 60 * 1000 // 5 menit

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
    return parsed
  } catch {
    return null
  }
}

export function setCachedGps(lat: number, lng: number, accuracy: number) {
  if (typeof window === 'undefined') return
  try {
    const data: GpsCoords = { lat, lng, accuracy, timestamp: Date.now() }
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data))
  } catch {}
}

export function getGpsWithCache(options?: PositionOptions): Promise<GpsCoords> {
  // Coba cache dulu
  const cached = getCachedGps()
  if (cached) {
    return Promise.resolve(cached)
  }
  
  // Kalau tidak ada, minta GPS baru
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
        }
        setCachedGps(coords.lat, coords.lng, coords.accuracy)
        resolve(coords)
      },
      (err) => reject(err),
      options || {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 menit
      }
    )
  })
}

export function clearGpsCache() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(CACHE_KEY)
}