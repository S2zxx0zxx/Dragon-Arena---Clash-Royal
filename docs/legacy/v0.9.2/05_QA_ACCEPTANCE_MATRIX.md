# QA acceptance matrix — no screenshots may silently be treated as implementation

## A. Visual acceptance (currently NOT PASSED)

For each S00–S09 obtain a live render at 1920×1080 desktop and 1080×1920 physical Android in **landscape orientation** (Android landscape usually maps 1920×1080 logical before density scaling), including at least one 20:9 screen with letterbox/reflow. Compare against `app/references/LOCKED_BLUEPRINT_SHEET_v2.png` as source, then a high-resolution **individual screen** approved by the user. Required manually reviewed properties: hero 3D silhouette; material and eye readability; shape, palette, lettering, hierarchy, spacing, control placement, relevant states, animation timing and legibility. Record with `PASS/FAIL/NEEDS_ART_APPROVAL`, screenshot path and reviewer. Poster composite panels are too low-resolution for a defensible 1-to-1 automated per-pixel diff.

## B. 3D model acceptance (currently FAIL)

- Actual WebGL2 3D hero is animated live and never billboard-substituted.
- Final premium sculpt/lighting at accepted 3D art quality matches the illustrated dragon look (NOT YET).
- Render head/body/tail forward orientation, uniform normal/tangent, no jumping joints at turns.
- All 24 skin models load; no corrupted mesh/material; on phone eye, horns and crystalline scales remain recognizable.
- 24 unique death sequences animate and transition to drops; peak 3D burst presence alone is insufficient.
- Trail sample meshes must become animated trails with budget limits.

## C. Gameplay regression acceptance (unit PASS / runtime NOT VERIFIED)

- Start 8, add one per three earned mass, cap 220 physical nodes; no data races.
- Pickup radius consistent among tiers; food worth 1/2/3/5 where configured.
- Head-head collisions symmetric, head-to-body kills victim, kill credit assigned to owner, drops conserve 65% mass.
- Player camera/HUD/interpolation tested at head rotations/long trails.
- Revive spawn safe, no instant-repeat kill, currency deducted once.
- Match finish rank/XP/coin reward committed only once; test background/resume, page reload and network-loss outcomes.

## D. Controls and platform

- Android 16:9, 18:9, 19.5:9, 20:9, tablet 16:10 and desktop landscape; no clipping at notches/gesture navigation bars.
- Joystick pointer capture, boost touch down/up/cancel, keyboard and pointer; multi-touch stress test; controller mapping TBD.
- Real-device 30 FPS minimum low graphics; 60 FPS preferred for 2D UI and supported devices. 95th/99th percentile frame-time profiles required (not measured in this pack).
- 20 bots / 220 segments performance test with instancing and food particles; no assumptions from lightweight desktop renders.
- Browser visibility pause/resume must not rack up timers; audio and haptics opt-in.

## E. Shop / security / policy (NOT READY)

- Ads never promise a reward unless successful SDK callbacks confirm reward.
- Purchase ack, restore purchase, pending transaction reconciliation and region pricing are not coded. **No public paid release.**
- Creature rarity affects cosmetic visuals only. No pay-to-win collider changes.
- Online game requires server-authoritative room, anti-spoofed movement, chat safeguards, auth/session expiry and abuse controls.
- Privacy, age suitability, data safety and billing policies need legal/product owner approval.

## Acceptance record format

`SCREEN_ID | REFERENCE_VERSION | DEVICE | SNAPSHOT_PATH | VISUAL_APPROVED | FUNCTION_APPROVED | PERF_APPROVED | ISSUE_ID | REVIEWER | DATE`

## Current evidence

- `node --test app/tests/*.test.mjs` — **8/8 passed**, validates 7 arena physics cases and GLB loader of 24 head/body/tail models, all 24 death peak models and 5 representative food models.
- `python tests/validate_bundle.py` — **passed** for manifest, source hashes, 10 screen crops, 24 character/death sets, 10 food GLBs, six trails, HTML control IDs and syntax.
- **Browser smoke: unavailable**: Chromium navigation returned `ERR_BLOCKED_BY_ADMINISTRATOR` for local HTTP and file URLs in this workspace. Standalone headless Chromium also failed to initialize GPU (EGL/ANGLE). Do **not** claim screenshot parity, actual FPS or Android device QA.
