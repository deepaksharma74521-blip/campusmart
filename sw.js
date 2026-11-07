// Campus Mart - Ultra-Fast Service Worker (Network-First for HTML, Stale-While-Revalidate for Assets)
const CACHE_NAME = 'campus-mart-v5.3-liquid-glass';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/menu.html',
  '/cart.html',
  '/orders.html',
  '/tokens.html',
  '/marketing_kit.html',
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

  // 3. Stale-While-Revalidate Strategy for CSS, JS, Images & Fonts
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
