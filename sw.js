// MacroForge Service Worker
// Bump CACHE_VERSION any time you deploy a new build to force cache refresh
const CACHE_VERSION = 'mf-v3f-1';
const CACHE_FILES = [
  '/macroforge/MacroForge_v3f.html'
];

// ── Install: cache the app shell immediately ──────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(CACHE_FILES))
      .then(() => self.skipWaiting()) // activate immediately, don't wait for old SW to die
  );
});

// ── Activate: delete any old cache versions ───────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_VERSION)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim()) // take control of all open tabs immediately
  );
});

// ── Fetch: cache-first, background refresh ────────────────────────────────────
self.addEventListener('fetch', event => {
  // Only intercept same-origin requests for the app HTML.
  // Let USDA API calls, YouTube links, etc. go straight to network.
  const url = new URL(event.request.url);
  const isAppShell = CACHE_FILES.some(f => url.pathname === f || url.pathname.endsWith('MacroForge_v3f.html'));

  if (!isAppShell) return; // pass through — don't intercept

  event.respondWith(
    caches.open(CACHE_VERSION).then(cache =>
      cache.match(event.request).then(cached => {
        // Kick off a background network fetch to keep cache fresh
        const networkFetch = fetch(event.request).then(response => {
          if (response && response.status === 200) {
            cache.put(event.request, response.clone());
          }
          return response;
        }).catch(() => {}); // silently fail if offline — cached version already served

        // Return cached version instantly if available, otherwise wait for network
        return cached || networkFetch;
      })
    )
  );
});
