const CACHE_NAME = 'ledger-pwa-v3';
const MAP_TILES_CACHE = 'bigguy-map-tiles-v1';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-192.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
  '/favicon-64.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
];

// Install: Cache core application shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn('ServiceWorker precache failed:', err))
  );
});

// Activate: Purge old cache versions while preserving offline map tiles cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME && key !== MAP_TILES_CACHE) {
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// Helper to identify map tiles (Google Satellite, OpenStreetMap, ESRI)
function isMapTileRequest(url) {
  const host = url.hostname;
  const path = url.pathname;
  return (
    (host.includes('google.com') && path.includes('/vt')) ||
    host.includes('tile.openstreetmap.org') ||
    host.includes('arcgisonline.com') ||
    path.includes('/vt/lyrs=') ||
    path.includes('/vt?lyrs=')
  );
}

// Fetch: Network-first for dynamic app code, Cache-first for Map tiles and offline images
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip chrome-extension schemes
  if (url.protocol.startsWith('chrome-extension')) return;

  // 1. SPECIFIC MAP TILE INTERCEPTOR (Cache-First with offline resilience)
  if (isMapTileRequest(url)) {
    event.respondWith(
      caches.open(MAP_TILES_CACHE).then(async (mapCache) => {
        // Try Cache first
        const cachedTile = await mapCache.match(event.request);
        if (cachedTile) {
          return cachedTile;
        }

        // If not in cache and online, fetch and bank it
        try {
          const networkResponse = await fetch(event.request, { mode: 'no-cors' });
          // Note: opaque responses from cross-origin tile servers have status === 0
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque' || networkResponse.status === 0)) {
            mapCache.put(event.request, networkResponse.clone()).catch(() => {});
          }
          return networkResponse;
        } catch {
          // If completely offline and tile wasn't banked, return transparent 1x1 image so Leaflet doesn't display broken icon
          return new Response(
            Uint8Array.from(atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'), (c) => c.charCodeAt(0)),
            {
              headers: { 'Content-Type': 'image/gif' },
            }
          );
        }
      })
    );
    return;
  }

  // 2. Cache-first for images and static media assets
  if (
    event.request.destination === 'image' ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.webp')
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque' || networkResponse.status === 0)) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => caches.match('/icon-192.png'));
      })
    );
    return;
  }

  // 3. Network-first with Cache fallback for general pages and scripts
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        // Fallback to index.html for client-side routing if navigation
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        return new Response('Offline - No cached resource available', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({ 'Content-Type': 'text/plain' }),
        });
      })
  );
});

