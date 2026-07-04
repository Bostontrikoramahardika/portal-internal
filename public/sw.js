// ============================================
// BTM PORTAL - SERVICE WORKER
// Fungsi: Cache offline + Sync absensi
// ============================================

const CACHE_NAME = 'btm-portal-v1'
const OFFLINE_URL = '/offline'

// File yang di-cache agar bisa offline
const PRECACHE_URLS = [
  '/',
  '/login',
  '/dashboard',
  '/dashboard?menu=absensi_hari_ini',
  '/offline',
  '/manifest.json',
]

// ============ INSTALL ============
// Saat pertama kali Service Worker di-install
self.addEventListener('install', (event) => {
  console.log('🔧 SW: Installing...')
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('📦 SW: Caching app shell')
      return cache.addAll(PRECACHE_URLS).catch(err => {
        console.log('⚠️ SW: Some URLs failed to cache (OK)', err)
      })
    })
  )
  // Langsung aktif tanpa tunggu tab ditutup
  self.skipWaiting()
})

// ============ ACTIVATE ============
// Hapus cache lama saat update
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
  // Ambil kontrol semua tab
  self.clients.claim()
})

// ============ FETCH ============
// Intercept semua request jaringan
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  
  // SKIP: request ke API
  if (url.pathname.startsWith('/api/')) {
    return
  }
  
  // SKIP: extension chrome / bukan domain kita
  if (!url.origin.includes(self.location.origin)) return
  
  // SKIP: request method bukan GET
  if (event.request.method !== 'GET') return
  
  // Untuk HTML pages: Network First, fallback ke cache
  if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Simpan ke cache untuk offline nanti
          if (response.status === 200) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone)
            })
          }
          return response
        })
        .catch(() => {
          // OFFLINE: ambil dari cache
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse
            }
            // Kalau halaman tidak ada di cache, tampilkan offline page
            return caches.match('/offline').then((offlinePage) => {
              return offlinePage || new Response('Offline', { 
                status: 503, 
                statusText: 'Offline - Silakan buka aplikasi saat online' 
              })
            })
          })
        })
    )
    return
  }
  
  // Untuk assets (JS, CSS, images, fonts): Cache First
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

// ============ SYNC ============
// Background Sync: upload absensi saat online kembali
self.addEventListener('sync', (event) => {
  console.log('🔄 SW: Sync triggered:', event.tag)
  
  if (event.tag === 'sync-attendance') {
    event.waitUntil(syncAttendance())
  }
})

// Fungsi sync attendance dari IndexedDB ke server
async function syncAttendance() {
  console.log('📤 SW: Syncing attendance data...')
  
  try {
    // Buka IndexedDB
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
          // Hapus dari pending
          const deleteTx = db.transaction('pending_attendance', 'readwrite')
          const deleteStore = deleteTx.objectStore('pending_attendance')
          deleteStore.delete(record.id)
          console.log(`✅ SW: Synced ${record.type} for ${record.timestamp}`)
          
          // Notify user
          self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({
                type: 'SYNC_SUCCESS',
                data: record
              })
            })
          })
        } else {
          console.log(`❌ SW: Failed to sync ${record.type}:`, await response.text())
        }
      } catch (err) {
        console.log(`❌ SW: Error syncing record:`, err)
      }
    }
  } catch (err) {
    console.log('❌ SW: Sync error:', err)
  }
}

// ============ IndexedDB helpers untuk SW ============
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

// ============ MESSAGE ============
// Terima pesan dari frontend
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// ============ PERIODIC SYNC ============
// Coba sync setiap kali online (fallback kalau Background Sync tidak support)
self.addEventListener('online', () => {
  console.log('🌐 SW: Back online! Triggering sync...')
  syncAttendance()
})