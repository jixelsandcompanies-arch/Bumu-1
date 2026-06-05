const CACHE_NAME = 'bumu-agent-portal-v2';
const APP_SHELL = ['/Bumu/', '/Bumu/index.html', '/manifest.webmanifest'];

const isSameOrigin = (request) => new URL(request.url).origin === self.location.origin;
const isFreshAsset = (request) => {
  const url = new URL(request.url);
  return /\.(?:js|css|png|jpg|jpeg|webp|svg|ico|webmanifest)$/i.test(url.pathname);
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL).catch(() => undefined))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || !isSameOrigin(request)) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && (request.mode === 'navigate' || isFreshAsset(request))) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        }
        return response;
      })
      .catch(() => {
        if (request.mode === 'navigate') {
          return caches.match('/Bumu/index.html').then((cached) => cached || caches.match('/index.html'));
        }
        return caches.match(request);
      })
  );
});
