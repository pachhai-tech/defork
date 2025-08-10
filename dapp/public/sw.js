// Basic cache for model assets (best-effort)
const CACHE = 'model-cache-v1'
const ASSET_HOSTS = [
  'https://huggingface.co',
  'https://cdn.jsdelivr.net',
  'https://unpkg.com',
]

self.addEventListener('install', (e) => { self.skipWaiting() })
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()) })
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (ASSET_HOSTS.some(h => url.href.startsWith(h))) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE)
      const cached = await cache.match(e.request)
      if (cached) return cached
      const res = await fetch(e.request)
      if (res && res.ok) cache.put(e.request, res.clone())
      return res
    })())
  }
})
