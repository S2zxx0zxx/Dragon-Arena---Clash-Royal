# Dragon Arena — Reference-Locked UI + 3D Production Contract v4

## Critical authority and naming

1. `app/references/LOCKED_BLUEPRINT_SHEET_v2.png` is the **primary** style/structure target; `app/references/LOCKED_GAME_FLOW_SHEET_v1.png` is the second approved UI flow target.
2. The sheets are conceptual *composite posters*, not exportable pixel-coordinate Figma files. Individual panels have scale distortions, inconsistent pricing, and illustrative text. **True pixel-perfect acceptance requires a rendered capture at the same logical screen size and device QA.** Do not claim pixel perfection from matching a poster crop.
3. New repo is `S2zxx0zxx/Dragon-Arena---Clash-Royal` (verified). Game display brand requested: `Dragon Arena — Clash Royale`. `Crystal Creatures` is reserved as the internal technical asset family—not the consumer title. **Brand legal gate:** `Clash Royale` is another publisher's title; legal/store clearance is required before public launch. Don't imply association.
4. 24 character families: four each Common / Uncommon / Rare / Epic / Legendary / Mythic. Character meshes must remain original. Cosmetics must never increase competitive hitbox, speed, chance, or kill power.

## Screen flow and reference coverage

| ID | State | Visual composition and placement | Interaction/state contract |
|---|---|---|---|
| S00 | Splash | Center hero logo, crystal backdrop, progress bottom-center | Load GLB manifest/shaders, show failures, enter button |
| S01 | Consent | Center embellished gem-frame dialog over dark-lit crystals | Explicit acceptance in preview; no pretend production ToS |
| S02 | Home | Top-left profile, top-right currencies; giant 3D dragon centered left on magical podium; big gold Play button upper-right; left tasks; bottom 3D-styled navigation | No website-style article cards; dragon rendered from GLB, all present buttons bind correctly |
| S03 | Arena | Live overhead 3D creature in the center, leaderboard top-left, quest near top, minimap top-right; virtual stick bottom-left, powers bottom-center | Actual 60Hz simulation, collision, mass growth, bots, save-independent per-match status |
| S04 | Death / revive | 3D character-specific bursting crystals, central gold countdown, score, rank, bottom CTA | Revive via demo coins with retained match state; no fake rewarded ad action |
| S05 | Results | Trophy hero, stats, share, restart; crystalline edge framing | All stats pulled from finished match, no static placeholder score |
| S06 | Shop / offers | Shared violet-gold vault, tabs along upper panel, 3D-styled offer cards | Free daily chest and welcome reward once; external payment disabled until implemented |
| S07 | Shop / energy | Same shell and tabs, resource progression cards | Daily free energy claim works in local save |
| S08 | Shop / coins | Same shell and tabs, gold bundles | No unsupported ₹ checkout routes |
| S09 | Shop / powerups | Same shell and tabs, magnet/speed/shield cards and inventory | Only functional boosts purchasable; shield must be implemented before enabling |
| S10 | Dragon Lab | Full 24-variant selection with each character's actual GLB in hero view | Character name, rarity, applied selection persist locally |
| S11 | Settings and related panels | Same embellished arcade visual system | Profile, settings, missions/rewards/inventory/leaderboard explicitly mark unimplemented backend features |

## 3D geometry and frame budget

- Character source files in `app/assets/characters/{rarity}/{id}/3d`: `head.glb`, `body.glb`, `tail.glb`, `preview_10_parts.glb`. Every one of 24 upgraded with reproducible `tools/premium_meshes.py` geometry pipeline.
- Original 3D lobby `app/assets/scene/lobby_stage.glb`.
- PBR-like faceted shader uses real `dFdx` normals, rim/specular and animated opalescent highlights. Browser shader compilation remains unverified in this environment.
- Arena uses WebGL2 GPU instancing of body segments; gameplay supports up to 220 tracked nodes, renderer uses bounded LOD (120) with state preserving total mass. This is **not** an Android FPS certification.
- Runtime gameplay constants remain in `app/engine/arena.mjs`, not hardcoded UI pixels: 180 world units, 0.62 world-unit body spacing, 8 base nodes, maximum 220 nodes, 3 mass for additional node, 65% earned mass on defeat. These are tuneable defaults, **not** final balanced values.
- Use compressed on-demand asset caching, device resolution cap (DPR ≤1.5 home; ≤1.25 arena). Measure real 30/60fps on lower-end Android before shipping.

## Responsive sizing and hitboxes

- Logical layout baseline: 1536×702 landscape, matching user's competitor screenshots; additional full-HD style posters are visual references, not precise runtime geometry.
- Use viewport-based percentage anchors, safe-area insets, and portrait fallback; actual touch target aim 44–48 CSS px, test with landscape 16:9, 20:9, 4:3, and narrow split-screen.
- Top profile/currencies and left navigation must not overlap at 1536×702 or on device; preserve live 3D scene behind HUD. Touch gestures operate from joystick, not over buttons.
- Native Android QA and actual side-by-side screenshot diff are release-blocking; **the container's Chromium navigation is `ERR_BLOCKED_BY_ADMINISTRATOR` even for localhost/file/data URLs**.

## Mandatory release verification (not optional)

**Static automatic:** JS syntax, Node tests, GLB geometry+safe bounds, manifest references, unique DOM IDs, PWA shell, no misleading pay/ad behavior.

**Visual manual with evidence:** 1536×702 screen captures S00–S09, character GLB 24/24 turntable clips, alive-to-death-to-revive animation captures, UI contrast/readability and exact reference side-by-side; readable labels and no clipping.

**Hardware manual:** Android Chrome/WebView at least low/mid/high GPU, portrait-entry rotation handling, touch joystick/buttons, performance/memory, offline reconnection, pause/background/resume, 220-node growth, death/restore, screen-reader basic operation.

**Publication:** Google Play SDK/ads/payment/privacy/age rating and trademark clearance. Networked PvP is intentionally out of this UI-first project and cannot be presented as live.

**Merge rule:** Do not merge this branch until the complete visual/hardware/release gates are marked PASS with evidence. Unit test pass is insufficient.
