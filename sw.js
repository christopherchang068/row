// Service worker — cache-first with background refresh.
// Bump CACHE_NAME when deploying breaking changes so stale files are cleared.
const CACHE_NAME = 'dashboard-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/health.html',
  '/gym.html',
  '/finance.html',
  '/topbar.js',
  '/manifest.json',
  '/icon-180.png',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith(self.location.origin)) return;

  const isNav = e.request.mode === 'navigate';

  if (isNav) {
    // Navigation: network-first so you always get fresh HTML when online,
    // fall back to cache when offline.
    e.respondWith(
      fetch(e.request)
        .then((resp) => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
          }
          return resp;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    // Assets (JS, images, etc.): cache-first, refresh in background.
    e.respondWith(
      caches.match(e.request).then((cached) => {
        const network = fetch(e.request)
          .then((resp) => {
            if (resp && resp.ok) {
              const clone = resp.clone();
              caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
            }
            return resp;
          })
          .catch(() => null);
        return cached || network;
      })
    );
  }
});
