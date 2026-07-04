// OneJobs PWA service worker.
// Strategy: network-first for navigations and API (always fresh data,
// never a stale deploy), cache-first for hashed static assets.
const CACHE = "onejobs-v1";

self.addEventListener("install", e => {
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  // Never cache API calls
  if (url.pathname.startsWith("/api/")) return;

  // Navigations: network first, fall back to cached shell when offline
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request)
        .then(r => {
          const copy = r.clone();
          caches.open(CACHE).then(c => c.put("/", copy)).catch(() => {});
          return r;
        })
        .catch(() => caches.match("/"))
    );
    return;
  }

  // Hashed assets (immutable): cache first
  if (url.pathname.startsWith("/assets/") || /\.(png|svg|jpg|woff2?)$/.test(url.pathname)) {
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return r;
      }))
    );
  }
});
