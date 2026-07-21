// ============================================
// BTM PORTAL - SERVICE WORKER v3
// Fix: Auto-cache halaman login saat install
// ============================================

const CACHE_NAME = 'btm-portal-v3'
const OFFLINE_URL = '/offline'

// Halaman yang langsung di-cache saat install
const PRECACHE_URLS = [
  '/',
  '/login',
  '/dashboard',
  '/offline',
  '/manifest.json',
  '/logo.png',
  '/bg-login.jpg',
]

// ============ INSTALL ============
// Cache halaman PENTING langsung saat pertama kali install
self.addEventListener('install', (event) => {
  console.log('🔧 SW: Installing & pre-caching important pages...')
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache satu per satu (jangan gagalkan semuanya kalau 1 error)
      return Promise.allSettled(
        PRECACHE_URLS.map(url => 
          cache.add(new Request(url, { cache: 'reload' }))
            .catch(err => console.log(`⚠️ Failed to cache ${url}:`, err))
        )
      )
    })
  )
  self.skipWaiting()
})

// ============ ACTIVATE ============
self.addEventListener('activate', (event) => {
  console.log('✅ SW: Activated v3')
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
  
  // SKIP: API requests
  if (url.pathname.startsWith('/api/')) return
  
  // SKIP: Domain lain
  if (!url.origin.includes(self.location.origin)) return
  
  // SKIP: Bukan GET
  if (event.request.method !== 'GET') return
  
  // Strategy: Network First, fallback cache
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
          
          // Untuk halaman HTML: redirect ke /offline
          if (event.request.mode === 'navigate' || 
              event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match(OFFLINE_URL)
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