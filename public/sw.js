// ============================================
// BTM PORTAL - SERVICE WORKER
// Fungsi: Cache semua halaman + Auto-sync absensi
// ============================================

const CACHE_NAME = 'btm-portal-v2'

// Install: langsung aktif
self.addEventListener('install', (event) => {
  console.log('🔧 SW: Installing...')
  self.skipWaiting()
})

// Activate: hapus cache lama
self.addEventListener('activate', (event) => {
  console.log('✅ SW: Activated')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('🗑️ SW: Deleting old cache:', name)
            return caches.delete(name)
          })
      )
    })
  )
  self.clients.claim()
})

// ============================================
// FETCH - Yang paling penting!
// ============================================
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  
  // SKIP: API requests
  if (url.pathname.startsWith('/api/')) {
    return
  }
  
  // SKIP: Request dari domain lain
  if (!url.origin.includes(self.location.origin)) return
  
  // SKIP: Bukan GET request
  if (event.request.method !== 'GET') return
  
  // Strategy untuk HTML pages: Network First, fallback ke cache
  if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Simpan ke cache
          if (response.status === 200) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone).catch(err => {
                console.log('⚠️ Cache put failed:', err)
              })
            })
          }
          return response
        })
        .catch(() => {
          // OFFLINE: ambil dari cache
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              console.log('📦 SW: Serving from cache:', url.pathname)
              return cachedResponse
            }
            // Tidak ada di cache sama sekali
            console.log('❌ SW: Not in cache:', url.pathname)
            return new Response(
              '<!DOCTYPE html><html><head><title>Offline</title></head><body style="font-family:Arial;text-align:center;padding:50px;"><h1>📡 Offline</h1><p>Halaman ini belum pernah dibuka saat online.</p><p>Silakan buka saat ada koneksi internet.</p></body></html>',
              { 
                status: 503, 
                statusText: 'Offline',
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
              }
            )
          })
        })
    )
    return
  }
  
  // Strategy untuk assets (JS, CSS, images): Cache First
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse
      
      return fetch(event.request).then((response) => {
        if (response.status === 200) {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone)
          })
        }
        return response
      }).catch(() => {
        return new Response('Asset not available', { status: 503 })
      })
    })
  )
})

// ============================================
// SYNC - Background Sync Attendance
// ============================================
self.addEventListener('sync', (event) => {
  console.log('🔄 SW: Sync triggered:', event.tag)
  
  if (event.tag === 'sync-attendance') {
    event.waitUntil(syncAttendance())
  }
})

async function syncAttendance() {
  console.log('📤 SW: Syncing attendance data...')
  
  try {
    const db = await openDB()
    const tx = db.transaction('pending_attendance', 'readonly')
    const store = tx.objectStore('pending_attendance')
    const allRecords = await getAllFromStore(store)
    
    console.log(`📊 SW: Found ${allRecords.length} pending records`)
    
    for (const record of allRecords) {
      try {
        const endpoint = record.type === 'clock_in' 
          ? '/api/attendance/clock-in' 
          : '/api/attendance/clock-out'
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: record.latitude,
            longitude: record.longitude,
            offline_time: record.timestamp,
            is_offline_sync: true
          })
        })
        
        if (response.ok) {
          const deleteTx = db.transaction('pending_attendance', 'readwrite')
          const deleteStore = deleteTx.objectStore('pending_attendance')
          deleteStore.delete(record.id)
          console.log(`✅ SW: Synced ${record.type} for ${record.timestamp}`)
          
          self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({
                type: 'SYNC_SUCCESS',
                data: record
              })
            })
          })
        }
      } catch (err) {
        console.log(`❌ SW: Error syncing:`, err)
      }
    }
  } catch (err) {
    console.log('❌ SW: Sync error:', err)
  }
}

// IndexedDB helpers
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('btm_portal_offline', 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains('pending_attendance')) {
        db.createObjectStore('pending_attendance', { keyPath: 'id', autoIncrement: true })
      }
    }
  })
}

function getAllFromStore(store) {
  return new Promise((resolve, reject) => {
    const request = store.getAll()
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})