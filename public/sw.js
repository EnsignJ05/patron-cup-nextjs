// Minimal shell-caching service worker (LIVE_SCORING_PLAN.md Task P7.2).
//
// Scope: surviving a dead zone between holes on a course with patchy signal --
// keeping the app loadable, not an offline-first data layer. Live scoring data
// itself is handled client-side by the offline write queue (src/hooks/useOfflineScoreQueue.ts)
// and localStorage, not by this worker.
//
// Deliberately does not intercept:
//   - non-GET requests
//   - cross-origin requests (Supabase REST/Realtime/Auth)
//   - same-origin /api/** routes
// so nothing here can serve a stale or stale-auth response for live data.

const CACHE_NAME = 'patron-cup-shell-v1';
const SHELL_URLS = ['/', '/dashboard', '/matches', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_URLS))
      .catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // Network-first: always prefer a live response, and opportunistically cache
  // successful page navigations so the current round's pages are available if the
  // connection drops later. Falls back to whatever's cached (or the shell root) only
  // when the network request itself fails.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && request.mode === 'navigate') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('/'))),
  );
});
