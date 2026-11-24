# 3D dragon fidelity: final acceptance gate, not a cosmetic afterthought

## What actually exists today (inspect `app/assets/`)

- **24 separate skins** across Common, Uncommon, Rare, Epic, Legendary and Mythic.
- Per skin: actual glTF 2.0 `.glb` files for **head, body, tail** and a ten-part preview model.
- Per skin: static peak-burst 3D mesh, an 8-frame 2D reference atlas and death-effect config.
- Ten food collectible 3D GLBs, six 3D trail sample GLBs.
- These GLBs are **real geometry**, not fake images, but deliberately low-poly/procedural and their finish does **not** match v2 poster's sculpted blue/purple dragon. This is the user's central problem.

## Approved on-screen hero design — locked

- SPECIES: Crystal Dragonling. A stylized blue/cyan face, bright expressive eyes, angled blue/magenta crystal horns, dense layered crystal scales, curved sinuous segmented tail and reflective refractive gems.
- PRIMARY COLOR: cyan → indigo → violet with magenta highlights; optional gold for premium rarity. Keep the same cute-but-powerful head silhouette as the approved sheet.
- HEAD READABILITY: easily distinguish eyes and muzzle on a smartphone in the top-down arena; no opaque glow over eye pupils.
- BODY: 3D segments interlock visually at 0.62 world units base physical spacing; allow 8–220 actual physical nodes per gameplay rules. At high lengths, render LOD rather than removing collision nodes.
- ANIMATIONS: idle, forward glide, turning, boost, collect, head recoil, hurt, death burst, revive, selection pose, victory. Skin-specific FX must be authored as animation curves/particles, not simply one static snapshot.
- MATERIALS: energy core emissive layer, saturated gemstone facets, roughness differentiation, clear coat/glint (WebGL-compatible shader), fake refraction as a limited budget pass, not screen-wide expensive transmission.
- LOD: hero preview LOD0; arena near LOD1; far enemy LOD2; normalized silhouette and collider must stay consistent. Particle count scales with quality preset.
- ORIGINALITY: original sculpt, textures, rig, topology and animations. Do not trace or redistribute competitor characters, HUD or logos.

## Technical target proposals (not verified hardware limits)

| Asset | Desktop/Lobby LOD0 budget | Mobile Arena LOD1 budget | Far LOD2 |
|---|---:|---:|---:|
| Head | ~12k–30k triangles | ~2k–7k | ~300–900 |
| One body segment | ~2k–6k triangles | ~200–850 | ~50–120 |
| Tail | ~4k–10k triangles | ~400–1.5k | ~100–250 |
| Texture atlas | 1024–2048 px compressed | 512–1024 px compressed | 256–512 px |

At the **220-segment limit**, 220×200 triangles is already 44k triangles for a *single* body chain at the minimum proposed LOD1 budget, before bots, effects, HUD and fill-rate. Require instanced rendering and geometry/texture sharing. The current raw WebGL prototype does **not** implement GPU instancing or animation rigging and must not be rated production-ready for 20+ concurrent players.

## Required replacement deliverables, per hero and per skin

1. Approved orthographic front / profile / ¾ front / top concept art from the poster face, matched by artist or 3D reconstruction.
2. `head_LOD0/1/2.glb`, `body_LOD0/1/2.glb`, `tail_LOD0/1/2.glb`, with stable forward axis (`-X`) and scale in game units.
3. Material textures (base color, normal, metal/roughness, emissive) and compressed KTX2 / GPU-compatible alternatives.
4. Animation rig / clip timeline, including death timing and body chain-follow parameters.
5. Final transparent beauty render at game-view angle, 2D thumbnail and exact same 3D GLB appearance.
6. Device screenshot against screenshot `92541.png` S02/S03: eye/readability, silhouette, facet density, light/specular contrast, beam/glow.
7. GLB contract validation (triangle budgets, zero corrupt files, forward orientation, anchors/pivots, collisions).

## Gate FID-3D-01 — currently FAIL / NOT ACCEPTED

**PASS only when** a rotating hero-quality 3D dragon and active arena movement visibly match the premium sheet on a real Android device. No placeholder GLB, billboard, low-res screenshot crop or pre-rendered sprite may count as the hero. A 2D UI overlay/HUD is allowed and conventional even in genuine 3D games; the playable characters/food/environment must be 3D.

## Death FX gate FID-3D-02 — partially supported

The existing per-character config + 3D peak burst proves the file exists; it does not prove **complete animated 3D death**. Must implement event-driven 3D fragments, timed glow/particles, final food-drop positions and performance LOD for every one of the 24 characters, then real-device QA for frame-time spikes.
