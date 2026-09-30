// Campus Mart - Ultra-Fast Service Worker (Stale-While-Revalidate for Instant Cold Start)
const CACHE_NAME = 'campus-mart-v2.5';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/menu.html',
  '/cart.html',
  '/orders.html',
  '/delivery.html',
  '/parcel.html',
  '/admin.html',
  '/login.html',
  '/profile.html',
  '/css/style.css',
  '/js/api.js',
  '/js/menu.js',
  '/js/orders.js',
  '/js/cart.js',
  '/manifest.json',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/assets/icons/logo.png',
  '/assets/icons/favicon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS).catch(err => {
        console.warn('[PWA] Cache preload note:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Pass API requests directly to network (no cache)
  if (url.pathname.startsWith('/api/') || event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }

  // 2. Fast Stale-While-Revalidate Strategy for all HTML, CSS, JS, Images & Fonts
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      // Return instant local cache if present, otherwise wait for network fetch
      return cachedResponse || fetchPromise;
    })
  );
});
