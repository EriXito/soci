const CACHE_NAME = 'soci-v2'

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      )
    })
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const url = event.request.url

  // No interceptar estas
  if (event.request.method !== 'GET') return
  if (url.includes('supabase.co')) return
  if (url.includes('/api/')) return
  if (url.includes('googleapis.com')) return
  if (url.startsWith('chrome-extension://')) return

  event.respondWith(
    caches.match(event.request).then((cached) => {
      // Siempre intentar red primero; usar cache solo si falla
      return fetch(event.request)
        .then((response) => {
          // Solo cachear respuestas válidas (status 200, tipo basic)
          if (
            response.ok &&
            response.status === 200 &&
            response.type === 'basic'
          ) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone)
            })
          }
          return response
        })
        .catch(() => {
          // Sin red — devolver del cache si existe
          return cached || new Response('Offline', { status: 503 })
        })
    })
  )
})
