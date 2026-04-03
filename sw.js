const CACHE = 'ccg-portal-v1';
const BASE = '/cyprus-college-portal';

const PRECACHE = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/login.html',
  BASE + '/student/index.html',
  BASE + '/staff/index.html',
  BASE + '/admin/index.html',
  BASE + '/js/api.js',
  BASE + '/manifest.json',
  BASE + '/icons/icon-192.png',
  BASE + '/icons/icon-512.png',
];

// Install — pre-cache shell assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate — clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — network-first for API, cache-first for assets
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Always go to network for API calls
  if (url.hostname.includes('railway.app') || url.pathname.includes('/api/')) {
    e.respondWith(fetch(e.request).catch(() => new Response(
      JSON.stringify({ error: 'You are offline. Please reconnect.' }),
      { headers: { 'Content-Type': 'application/json' } }
    )));
    return;
  }

  // Cache-first for everything else
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') return response;
        const clone = response.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return response;
      });
    })
  );
});
