# Dragon Arena v3.0 — 3D Sovereign Colosseum (AAA PWA & Play Store TWA)

A zero-dependency, Unity-inspired **WebGL2 3D Dragon Colosseum** Progressive Web App (PWA) designed for static hosting; Android WebView preview included. TWA setup and store acceptance are not verified.

## v3.0 Peak AAA Architecture
- **WebGL2 3D Engine + Offscreen HDR Bloom + GPU Instancing** (`render/webgl_engine.js`, `mesh_builder.js`): Batched `drawArraysInstanced` rendering for dragon bodies, 3D food, and particles; HDR Bloom post-processing; procedural bite-lunge, boost wing-fold, Lv.1–Lv.5 visual evolution scaling, 3D Crate Opening Ceremony, and automatic **Canvas2D Emergency Fallback** (`canvas2d_fallback.js`).
- **O(1) Spatial Hash Grid & Zero-GC Object Pooling** (`engine/spatial_grid.js`, `pool.js`, `physics.js`): Spatially partitioned collision checks (performance not benchmarked), 4 paired Runic Teleport Portals, 6 Floor Boost Pads, 4 Destructible Crystal Pillars, Wanted Bounty 2× rewards, 120ms Hit-Stop micro-freeze, Dragon Emotes, and Ghost Rival recording.
- **Retention & Progression** (`systems/dragon_pass.js`, `progression.js`): 30-tier Free + Premium **Dragon Pass**, **Weekly Leagues & Ghost Rivals**, 24 scaling dragons (Lv.1–5), 3D Crate Opening Ceremony, and 15-second interactive first-time tutorial.
- **Security & Play Store Production** (`systems/storage_security.js`, `play_billing_sync.js`, `.well-known/assetlinks.json`): Tamper-resistant salted save signatures + IndexedDB persistence, Strict CSP in `index.html`, crash telemetry ring buffer, Play Digital Goods API adapter, and TWA `assetlinks.json`.

## Quick Start & Verification
```bash
npm test
python3 serve.py
```
Open `http://localhost:8000/` in Chrome.

## Android preview release
Version 3.0.1-preview, code 14, same application ID as 0.9.2. CI builds a debug-signed APK after tests and browser smoke; publishes a new prerelease only from main. Debug signing may require reinstall. No production billing, live multiplayer, secure server-side rankings, or verified TWA association. The old save key is not migrated by this build; preserve the prior APK and data before upgrading.

### v3.0.1 startup hotfix
Inactive result and revive screens no longer override the active screen. Browser regression checks assert real computed visibility, pause/resume, short-landscape result controls and rematch/lobby navigation. Physical Android confirmation remains required.
