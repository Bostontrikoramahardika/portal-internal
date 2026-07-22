// ============================================
// BTM PORTAL - SERVICE WORKER v5
// Fix: Route ke /offline (Next.js route)
// Sinkron dengan app/offline/page.tsx
// ============================================

const CACHE_NAME = 'btm-portal-v5'
const OFFLINE_URL = '/offline'  // ✅ Next.js route

// Halaman yang langsung di-cache saat install
const PRECACHE_URLS = [
  '/',
  '/dashboard',
  '/offline',           // ✅ Next.js route
  '/manifest.json',
  '/btm-fix.png',
  '/bg-login.jpg',
  '/bg-pattern.png',
]

// ============ INSTALL ============
self.addEventListener('install', (event) => {
  console.log('🔧 SW v5: Installing...')
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        PRECACHE_URLS.map(url => 
          cache.add(new Request(url, { cache: 'reload' }))
            .then(() => console.log(`✅ Cached: ${url}`))
            .catch(err => console.log(`⚠️ Failed: ${url}`, err.message))
        )
      )
    })
  )
  self.skipWaiting()
})

// ============ ACTIVATE ============
self.addEventListener('activate', (event) => {
  console.log('✅ SW v5: Activated')
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

// ============ FETCH ============
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  
  // SKIP: API requests → biarkan browser handle (biar bisa detect offline)
  if (url.pathname.startsWith('/api/')) return
  
  // SKIP: Domain lain
  if (!url.origin.includes(self.location.origin)) return
  
  // SKIP: Bukan GET
  if (event.request.method !== 'GET') return
  
  // SKIP: Chrome extension
  if (url.protocol === 'chrome-extension:') return
  
  // Strategy: Network First, fallback cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
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
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            console.log('📦 SW: Serving from cache:', url.pathname)
            return cachedResponse
          }
          
          // Untuk halaman HTML: tampilkan offline page
          if (event.request.mode === 'navigate' || 
              event.request.headers.get('accept')?.includes('text/html')) {
            console.log('📴 SW: Serving offline page for:', url.pathname)
            return caches.match(OFFLINE_URL).then(offlinePage => {
              if (offlinePage) return offlinePage
              // Fallback terakhir
              return new Response(
                '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Offline</title></head><body style="font-family:sans-serif;text-align:center;padding:50px;background:#f4f7fa"><h1 style="color:#003D79">📡 BTM Portal Offline</h1><p>Tidak ada koneksi. <a href="/dashboard">Buka Dashboard</a></p></body></html>',
                { headers: { 'Content-Type': 'text/html' } }
              )
            })
          }
          
          return new Response('Offline', { status: 503 })
        })
      })
  )
})

// ============ MESSAGE ============
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// ============ BACKGROUND SYNC ============
self.addEventListener('sync', (event) => {
  console.log('🔄 SW: Sync event:', event.tag)
  
  if (event.tag === 'sync-attendance') {
    event.waitUntil(notifyClientsToSync())
  }
})

async function notifyClientsToSync() {
  const clients = await self.clients.matchAll({ type: 'window' })
  clients.forEach(client => {
    client.postMessage({ 
      type: 'SYNC_ATTENDANCE',
      timestamp: new Date().toISOString()
    })
  })
}