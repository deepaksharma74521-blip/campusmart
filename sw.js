// Campus Mart - Ultra-Fast Service Worker (Network-First for HTML, CSS & JS so updates are instant)
const CACHE_NAME = 'campus-mart-v20.0-fixed-upi';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/menu.html',
  '/cart.html',
  '/orders.html',
  '/print.html',
  '/tokens.html',
  '/marketing_kit.html',
  '/delivery.html',
  '/parcel.html',
  '/admin.html',
  '/login.html',
  '/profile.html',
  '/css/style.css',
  '/js/api.js',
  '/js/print.js',
  '/js/menu.js',
  '/js/orders.js',
  '/js/cart.js',
  '/js/squad.js',
  '/js/badges.js',
  '/js/spatial.js',
  '/js/sound-engine.js',
  '/js/dynamic-island.js',
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

  // 1. Pass API requests directly to network
  if (url.pathname.startsWith('/api/') || event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }

  // 2. Network-First strategy for HTML navigation so updates are instant on website
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(
      fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // 3. Network-First strategy for CSS & JS so style and script updates apply IMMEDIATELY
  if (url.pathname.endsWith('.css') || url.pathname.endsWith('.js')) {
    event.respondWith(
      fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // 4. Stale-While-Revalidate Strategy for Images, Media & Fonts
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
