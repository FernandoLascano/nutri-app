const CACHE_NAME = 'nutri-app-v2';
// No cachear index.html: cada deploy genera nuevo HTML con chunks distintos; cachearlo causa 404 del JS
const urlsToCache = [
  '/',
  '/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Nutr.io: Cache opened');
        return cache.addAll(urlsToCache);
      })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Nutr.io: Removing old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of all pages immediately
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests and API calls
  if (!event.request.url.startsWith(self.location.origin) ||
      event.request.url.includes('api.openai.com')) {
    return;
  }

  const isDocument = event.request.mode === 'navigate' || event.request.destination === 'document';

  event.respondWith(
    // Para el documento HTML: siempre red, no usar caché (cada deploy cambia los scripts)
    isDocument
      ? fetch(event.request).catch(() => caches.match('/'))
      : caches.match(event.request).then((response) => {
          if (response) return response;
          return fetch(event.request).then((response) => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
            return response;
          });
        }).catch(() => caches.match('/'))
  );
});
