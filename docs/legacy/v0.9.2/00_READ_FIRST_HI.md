# CRYSTAL CREATURES — REFERENCE-LOCKED 3D BUILD v3.0

**Date:** 2026-11-23  
**Decision:** Screenshot `92541.png` (COMPLETE GAME UI SPECIFICATION SHEET v2.0) is the **PRIMARY VISUAL SOURCE OF TRUTH**. Screenshot `92540.png` (FULL GAME UI FLOW v1.0) is **SECONDARY**, used for flow and details only. Where they differ, v2 wins until explicitly approved otherwise.

## Important: exactness means no invented acceptance

- The art in the approved reference sheets is **a final target, not existing layered sprites/models**. A screenshot montage cannot supply exact vector paths, shader values, animations, rigging, 3D textures, or final clickable coordinates.
- The previous kit *does* contain actual 3D GLB meshes; these are low-poly procedural **prototype meshes** that do **not** match the highly detailed dragon depicted in the poster. This is an explicit **P0 fidelity blocker**; do not mark artwork complete.
- The project under `app/` is a **runnable standalone WebGL2 local gameplay foundation**, not a complete production/release build. It deliberately includes no network multiplayer, actual purchases, rewarded ads or Play Store SDK.
- The actual game-world objects are GLB **3D meshes rendered through WebGL2**. HUD/text/buttons are screen-space controls (standard in 3D games) but use the approved rich arcade-game style. Never replace the 3D hero/arena with 2D screenshot billboards.
- `app/references/` stores approved images and exact cropped panels for **visual comparison** only, never as a shortcut to falsely claim that a screenshot is interactive.

## Run this game foundation

From the project root:

```bash
python -m http.server 8000 --directory app
```

Open `http://localhost:8000/` on a Chromium/WebGL2-compatible browser in **landscape**. The initial splash has an Enter button; accept the local prototype notice; choose Play Arena. Shop uses **demo currency only**, not real-money checkout.

Tests:

```bash
node --test app/tests/*.test.mjs
python tests/validate_bundle.py
```

No npm install and no external CDN are needed. WebGL2 and a modern browser are required. Do not load via `file://` unless allowing module fetches.

## Where is everything?

- `app/`: actual HTML/CSS/JS runtime, raw-WebGL2 GLB loader, playable simulation, genuine 3D creature GLBs, UI routes.
- `app/references/`: original v1/v2 images and 10 source-panel crops.
- `app/manifest/game_assets.json`: inherited 24-character asset registry and physical sizing rules.
- `docs/01_SCREEN_LOCK_SPEC_HI.md`: scene-by-scene visual and functional contract.
- `docs/02_3D_CHARACTER_FIDELITY_GATE.md`: 3D dragon production requirements/gaps.
- `docs/03_GAMEPLAY_NETWORK_AND_MONETIZATION.md`: engine rules and online/revenue boundary.
- `docs/04_AGENT_EXECUTION_ORDER.md`: exact build sequence and release gates.
- `docs/SCREEN_LOCK.json`: machine-readable screens, placements and original panel coordinates.
- `docs/ASSET_AUDIT.json`: machine-readable 3D/food/death catalog.
- `docs/BUILD_STATUS.json`: passes, limitations, blockers and untested items.

## Strong engineering principle

**Reference-matched design and correct code are different acceptance gates.** Both are required for final delivery; passing tests alone is not enough.
