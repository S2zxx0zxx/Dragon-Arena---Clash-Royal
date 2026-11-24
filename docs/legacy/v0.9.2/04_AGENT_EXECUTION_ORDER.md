# Exact build execution ledger — follow this order; do not skip gates

## RULES FOR ANY CODING AGENT

1. Open `app/references/LOCKED_BLUEPRINT_SHEET_v2.png` and `LOCKED_GAME_FLOW_SHEET_v1.png` **first**. V2 takes precedence; do not substitute the older simplified SVG/UI screens from earlier packs.
2. Parse `docs/SCREEN_LOCK.json`, `app/manifest/game_assets.json`, `docs/ASSET_AUDIT.json` before changing layouts, character models or physics parameters.
3. Preserve 24 character IDs, 10 food IDs, 24 death configs, rarity and model forward axis. No renamed filenames without a manifest migration.
4. The existing procedural GLBs are **temporary gameplay geometry**. Replace their visual finish before claiming final screenshot fidelity, never by simply overlaying a static poster.
5. Separate gameplay acceptance from 3D visual acceptance and real-device acceptance. Report every status with specific evidence, not blanket 'done/perfect'.
6. Use a new feature branch/PR if adding to a repository; no repository has been designated for this new Crystal Creatures game, so do not push into either of the user's chess repositories or FinCoPilot.
7. Do not invent purchases, ads, real online opponents, signed game bundles, legal documents or Play Store certification.
8. Keep module-based imports and a manifest-driven asset pipeline. Avoid hardcoded one-off character logic and cosmetics-dependent collision changes.

## Phase A — Source lock / final render references

- **CC-A01 [DONE]** Preserve BOTH supplied sheets byte-for-byte; SHA records.
- **CC-A02 [DONE]** Crop the ten primary V2 panels, store exact montage source rectangles.
- **CC-A03 [DONE]** Audit all 24 existing character GLBs, 10 food GLBs, death effects and trails.
- **CC-A04 [DONE]** Choose V2 poster as primary and V1 as secondary visual authority.
- **CC-A05 [PENDING]** Reconstruct each of the 10 individual screens into genuinely editable, high-resolution 1920×1080 layered art (not an AI poster collage); approve each separately.
- **CC-A06 [PENDING]** Freeze typography, exact button bevel/gloss material, borders, icons, crystal background atlases and z-order.
- **CC-A07 [PENDING]** Approve 3D hero silhouette front/top/profile and color/material variants against the image.

## Phase B — 3D character production (top blocker)

- **CC-B01 [PARTIAL]** Import low-poly GLB head/body/tail and ten-part preview (done for this prototype).
- **CC-B02 [PENDING]** Build a true high-fidelity, game-optimized 3D crystal dragon from the approved poster.
- **CC-B03 [PENDING]** Production GLB 3 LODs, pivots, shaders, KTX2, glTF validation and animation clips.
- **CC-B04 [PENDING]** Apply signed-off quality to all 24 skins, preserve identical collider geometry.
- **CC-B05 [PARTIAL]** Match 24 death IDs to GLB peak-burst (done) + animated 3D fracture timeline (pending).
- **CC-B06 [PARTIAL]** Import ten food GLBs (done) + refined 3D visuals, collectible halo/timing (pending).
- **CC-B07 [PENDING]** Six animated trail variants with instancing/particle LOD.
- **CC-B08 [PENDING]** Android fidelity, FPS, thermals/memory, long-session endurance tests.

## Phase C — App screens (order bound to source sheet)

- **CC-C00 [PARTIAL]** Splash state and loading/errors; refine art to exact V2.
- **CC-C01 [PARTIAL]** Prototype consent, but real policy text/legal version is pending.
- **CC-C02 [PARTIAL]** Live 3D lobby hero, profile and resources; exact gold button/art fidelity pending.
- **CC-C03 [PARTIAL]** 3D local arena, mass, food, bots, collisions, HUD, minimap. Live network and mobile controls QA pending.
- **CC-C04 [PARTIAL]** Countdown, revive resource, GLB burst. Revive safe spawn and full death VFX timeline pending.
- **CC-C05 [PARTIAL]** Rank/score/time/XP/result/restart. Final trophy/model art and idempotent online rewards pending.
- **CC-C06 [PARTIAL]** Shop Offers UI; real-money offer checkout intentionally disabled.
- **CC-C07 [PARTIAL]** Shop Energy UI; pricing/product catalog intentionally incomplete.
- **CC-C08 [PARTIAL]** Shop Coins UI; purchases intentionally unavailable.
- **CC-C09 [PARTIAL]** Shop Power-ups: demo magnet/speed work, shield blocked until implementation.
- **CC-C10 [PARTIAL]** Creature Lab: 24 previews and GLB switch; full rarity/evolution 3D UX and unlock ledger pending.
- **CC-C11 [PENDING]** Complete Profile, Settings, Workshop/Inventory, Missions, Leaderboard, Rewards, Event, Friends, matchmaking and pause art. Current secondary routes are functional placeholder copy.

## Phase D — Actual game features

- **CC-D01 [DONE-UNIT]** Segment mass math and 220 cap, 60 Hz step, deterministic food, symmetric head collisions, death mass conservation.
- **CC-D02 [PARTIAL]** Local AI and path following, scoring and local currency. Need kill credit, safe spawn, shield and extended bot AI tests.
- **CC-D03 [PENDING]** GPU instancing, spatial hash, frustum+segment LOD, real animation interpolation.
- **CC-D04 [PENDING]** Authoritative multiplayer, lobbies, matchmaking, reconnect, leaderboard, anti-cheat.
- **CC-D05 [PENDING]** Tutorials, accessibility, localization, device-based controls, pause/background state.
- **CC-D06 [PENDING]** Legal copy, audio, parental/age review, monetization setup, restore/refund.

## Phase E — Acceptance & release

- **CC-E01 [DONE]** Test loading 24 character heads/bodies/tails and food/death GLBs with a parser (automated unit tests).
- **CC-E02 [DONE]** Node simulation tests for physics basics.
- **CC-E03 [BLOCKED-ENV]** Automated graphical Chromium smoke: container browser navigation blocked by administrator; no visible render QA passed.
- **CC-E04 [PENDING]** Screenshot-by-screenshot human visual acceptance S00–S09 on real target devices.
- **CC-E05 [PENDING]** Low-end/high-end Android 30/60 FPS profiling, 8–220 segment load, memory, battery/thermal.
- **CC-E06 [PENDING]** PWA install/offline cache/update/resume acceptance or Android project AAB/TWA artifact; neither is delivered in this ZIP.
- **CC-E07 [PENDING]** Play Store release checklist, actual online load tests and billing verification.

**Overall status: reference-locked plan plus working local foundation, NOT final game or final visual fidelity.**
