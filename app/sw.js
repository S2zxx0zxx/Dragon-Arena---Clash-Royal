const CACHE_NAME = 'dragon-arena-aaa-v3.0.1-preview';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './.well-known/assetlinks.json',
  './icons/dragon-192.png',
  './icons/dragon-512.png',
  './src/styles.css',
  './src/main.js',
  './src/config/dragons.js',
  './src/config/arenas.js',
  './src/engine/spatial_grid.js',
  './src/engine/pool.js',
  './src/engine/ai.js',
  './src/engine/physics.js',
  './src/render/mesh_builder.js',
  './src/render/webgl_engine.js',
  './src/render/canvas2d_fallback.js',
  './src/audio/sound_engine.js',
  './src/systems/storage_security.js',
  './src/systems/dragon_pass.js',
  './src/systems/play_billing_sync.js',
  './src/systems/progression.js',
  './src/ui/hud.js',
  './src/ui/screens.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME && (k.startsWith('dragon-arena-aaa-') || k.startsWith('dragon-arena-shell-'))).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;
  event.respondWith(
    caches.match(event.request).then((hit) => hit || fetch(event.request).then((resp) => {
      if (resp.ok) {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
      }
      return resp;
    }))
  );
});
