// Service Worker — Terras de Aldenmoor
// Versão do cache — atualize ao modificar o jogo
const CACHE_NAME = 'aldenmoor-v1';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  // Three.js e NippleJS serão cacheados na primeira visita
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/nipplejs/0.10.1/nipplejs.min.js',
  // Google Fonts
  'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;900&family=Crimson+Pro:ital,wght@0,300;0,400;1,300;1,400&display=swap'
];

// Install — cacheia assets essenciais
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url =>
          cache.add(url).catch(() => console.log('Cache skip:', url))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate — remove caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — serve do cache, fallback para rede
self.addEventListener('fetch', event => {
  // Não intercepta requisições da API Anthropic ou WebLLM
  const url = event.request.url;
  if (url.includes('anthropic.com') || url.includes('mlc.ai') || url.includes('huggingface')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cacheia novas respostas de CDNs
        if (response.ok && (url.includes('cdnjs') || url.includes('googleapis'))) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
