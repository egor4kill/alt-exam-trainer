// Service Worker for Alt Linux Exam Trainer PWA
const CACHE_NAME = 'alt-exam-v1.3';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './css/style.css',
  './js/app.js',
  './js/data.js',
  './js/stand_simulator.js',
  './js/terminal.js',
  './js/text_editor.js',
  './js/tab_completion.js',
  './js/breakdown.js',
  './js/exam_mode.js',
  './js/qa.js',
  './js/sync.js',
  './js/teacher.js',
  './js/topology.js',
  './js/troubleshoot.js'
];

// Install: pre-cache all static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Cache addAll warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean up old cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network-First strategy (always get fresh version if online, fallback to cache if offline)
self.addEventListener('fetch', (event) => {
  // Only handle GET requests and http/https
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Ignore Google Apps Script or external sync endpoints
  if (url.origin.includes('script.google.com') || url.origin.includes('google.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Offline: try to serve from cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
