// sw.server.js — Service Worker for Home Server mode
// server.js serves this file as /sw.js automatically

const CACHE_NAME = 'coffee-mgr-local-v1';
const FONT_CACHE = 'coffee-mgr-fonts-v1';

// ไม่มี /coffee-manager/ prefix เพราะ serve จาก root โดยตรง
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/db.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME && k !== FONT_CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // ไม่ cache API calls — ต้องการข้อมูลล่าสุดเสมอ
  if (url.pathname.startsWith('/api/')) return;

  // Google Fonts — cache first
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(FONT_CACHE).then(cache =>
        cache.match(e.request).then(cached => {
          if (cached) return cached;
          return fetch(e.request).then(res => { cache.put(e.request, res.clone()); return res; });
        })
      )
    );
    return;
  }

  // Static assets — cache first, network fallback
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
