// Minimal offline PWA shell; heavy 3D GLBs are cached on demand, not all preloaded.
const CACHE='dragon-arena-shell-v7';const CORE=['./','./index.html','./src/styles.css','./src/secondary.css','./src/polish.css','./src/cinematic.css','./src/cosmic.mjs','./src/polish.mjs','./src/main.js','./src/secondary.js','./src/progression.mjs','./src/sound.mjs','./src/glb.js','./src/renderer.js','./engine/arena.mjs','./manifest/game_assets.json','./manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==location.origin)return;
 event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request).then(resp=>{if(resp.ok){const c=resp.clone();caches.open(CACHE).then(cache=>cache.put(event.request,c));}return resp;})));
});
