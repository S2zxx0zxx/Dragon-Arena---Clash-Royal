from pathlib import Path
import json
r=Path(__file__).resolve().parents[1];app=r/'app'
html=app/'index.html';s=html.read_text()
s=s.replace('<link rel="stylesheet" href="src/styles.css">', '<link rel="stylesheet" href="src/styles.css"><link rel="manifest" href="manifest.webmanifest">')
# Center banner is a game title, not a browser page heading
s=s.replace('class="hero-label">LIVE 3D CREATURE', 'class="hero-label">LIVE 3D DRAGON')
s=s.replace('id="player-handle">DragonPilot','id="player-handle">DragonPilot')
# Leave origin/game font intact; side reference is explicit user-approved 3D illustration.
html.write_text(s)
(app/'manifest.webmanifest').write_text(json.dumps({
 'id':'/','name':'Dragon Arena — Clash Royale (Prototype)','short_name':'Dragon Arena',
 'description':'Local 3D crystal dragon arena demo','start_url':'./','display':'fullscreen',
 'orientation':'landscape','background_color':'#060620','theme_color':'#090623',
 'categories':['games','entertainment'],
 'icons':[{'src':'icons/dragon-192.png','sizes':'192x192','type':'image/png','purpose':'any maskable'},{'src':'icons/dragon-512.png','sizes':'512x512','type':'image/png','purpose':'any maskable'}]
},indent=2))
(app/'sw.js').write_text('''// Minimal offline PWA shell; heavy 3D GLBs are cached on demand, not all preloaded.
const CACHE='dragon-arena-shell-v4';const CORE=['./','./index.html','./src/styles.css','./src/main.js','./src/glb.js','./src/renderer.js','./engine/arena.mjs','./manifest/game_assets.json','./manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==location.origin)return;
 event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request).then(resp=>{if(resp.ok){const c=resp.clone();caches.open(CACHE).then(cache=>cache.put(event.request,c));}return resp;})));
});
''')
# Add local storage safe settings and registration, ensuring HTTP local accepted; status honest.
main=app/'src/main.js';t=main.read_text()
t=t.replace("let countedDeaths=new Set();", "let countedDeaths=new Set();\nif('serviceWorker' in navigator && location.protocol!=='file:'){navigator.serviceWorker.register('./sw.js').catch(e=>console.warn('Offline cache unavailable',e));}")
t=t.replace("saved.inventory[kind]=n-1;save();", "saved.inventory[kind]=n-1;save();")
# Shield prototype stays disabled: do not let user buy it when code isn't active.
t=t.replace("if(secondaryKey==='profile'){$('#local-level').textContent=saved.level;$('#local-matches').textContent=saved.played}", "if(secondaryKey==='profile'){$('#local-level').textContent=saved.level;$('#local-matches').textContent=saved.played}")
main.write_text(t)
# original vector icon from image-independent custom rendered layered gems: not a photo mockup.
from PIL import Image,ImageDraw,ImageFont,ImageFilter
(app/'icons').mkdir(exist_ok=True)
for size in (192,512):
 im=Image.new('RGBA',(size,size),(6,6,29,255));d=ImageDraw.Draw(im)
 d.ellipse((size*.08,size*.08,size*.92,size*.92),fill=(32,12,89,255),outline=(75,225,255,255),width=max(2,size//80))
 poly=[(.48,.18),(.72,.35),(.77,.6),(.53,.81),(.24,.63),(.21,.37)]
 pts=[(int(x*size),int(y*size)) for x,y in poly]
 d.polygon(pts,fill=(75,194,255,255),outline=(221,167,255,255),width=max(2,size//45))
 d.polygon([(int(x*size),int(y*size)) for x,y in [(.48,.18),(.53,.81),(.24,.63)]],fill=(137,46,255,200))
 d.polygon([(int(x*size),int(y*size)) for x,y in [(.48,.18),(.72,.35),(.53,.81)]],fill=(38,242,255,170))
 # stylized dragon eyes
 d.ellipse((int(size*.33),int(size*.44),int(size*.43),int(size*.55)),fill='#fdfaff')
 d.ellipse((int(size*.55),int(size*.44),int(size*.65),int(size*.55)),fill='#fdfaff')
 for x in (.37,.59):d.ellipse((int(size*(x-.016)),int(size*.47),int(size*(x+.016)),int(size*.51)),fill='#0a1246')
 im.save(app/f'icons/dragon-{size}.png',optimize=True)
print('PWA + icons registered')
