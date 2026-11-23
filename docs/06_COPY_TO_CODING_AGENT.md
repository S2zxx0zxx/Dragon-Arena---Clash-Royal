# Copy-paste instructions for a coding agent

You are developing **Crystal Creatures**, a genuine landscape 3D .io arena game. The two supplied UI images are visual contracts: `app/references/LOCKED_BLUEPRINT_SHEET_v2.png` is the PRIMARY approved design, `LOCKED_GAME_FLOW_SHEET_v1.png` is SECONDARY. They are NOT generic inspiration and you must NOT replace them with previously simplified flat SVG/web layouts.

Read in this strict sequence:
1. `docs/00_READ_FIRST_HI.md`
2. `docs/SCREEN_LOCK.json`
3. `docs/01_SCREEN_LOCK_SPEC_HI.md`
4. `docs/ASSET_AUDIT.json`, then `app/manifest/game_assets.json`
5. `docs/02_3D_CHARACTER_FIDELITY_GATE.md`
6. `docs/03_GAMEPLAY_NETWORK_AND_MONETIZATION.md`
7. `docs/04_AGENT_EXECUTION_ORDER.md` and `docs/05_QA_ACCEPTANCE_MATRIX.md`
8. `app/index.html`, `app/src/renderer.js`, `app/src/glb.js`, `app/src/main.js`, `app/src/styles.css`, `app/engine/arena.mjs`

Run the current foundation locally. Preserve actual 3D GLB models (no screenshots as game sprites), 24 skin IDs, 10 food models, 24 death IDs, 220 segment cap and 60 Hz fixed-step mechanics unless the gameplay spec is explicitly updated. Reference images are for visual regression, not executable asset packs.

**Most urgent unresolved blocker:** The current GLB shapes are low-poly procedural and NOT the high-quality crystal dragon in the PRIMARY sheet. A high-fidelity optimized 3D hero with LODs, textures, animation rig, lit glass/crystal material, chain articulation and unique death sequences is required. Fix this before claiming final UI fidelity. Don't paper over with a billboard or a glossy poster background.

Design every primary screen S00–S09 in high-resolution layered game UI art matching the exact v2 panel, then implement dynamic variables as actual game state. Avoid hardcoding screenshot numbers, product prices, NPC counts or reward claims. All UI hit targets should be usable and must either perform the action or clearly indicate it is not integrated; no invisible/dead buttons.

The supplied project intentionally has no designated GitHub repo and is not yet deployed. If the owner provides a repository, use a dedicated feature branch and report file-level evidence. **Do not push into Global Chess, ARKYVON or FinCoPilot by guessing.**

Run the two included validators and then real Chromium/Android screenshot, animation and performance QA. Report exact PASS/PARTIAL/FAIL/NOT TESTED per acceptance gate. Do not declare production-ready on basis of static asset validation alone.
