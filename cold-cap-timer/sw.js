const CACHE = 'coldcap-v3';
const SHELL = ['./', './index.html', './logic.js', './manifest.webmanifest',
  './fonts/geist-latin-wght-normal.woff2', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// Network first (with a timeout so a flaky hospital network can't hang the app), cache fallback for offline.
// Only good responses are cached, so an error page never gets served later.
const NETWORK_TIMEOUT_MS = 4000;
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith((async () => {
    try {
      const r = await Promise.race([
        fetch(e.request),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), NETWORK_TIMEOUT_MS)),
      ]);
      if (r.ok) {
        const copy = r.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
      }
      return r;
    } catch {
      return (await caches.match(e.request)) || Response.error();
    }
  })());
});
