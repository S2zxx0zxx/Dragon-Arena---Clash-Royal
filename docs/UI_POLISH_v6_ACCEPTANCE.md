# Dragon Arena — locked polish scope (v0.6.0)

References: user-approved `92601.png` (Arena gameplay polish) and `92600.png` (premium UI polish). Originals supplied in chat; re-attach when doing pixel-level visual QA. They are *concept illustrations*, not executable assets or a claim of measured pixel coordinates.

## Changes implemented

- [x] Splash: Dragon Arena identity centered, animated WebGL dragon and two smaller GLB previews (where GPU supports WebGL2), branded portal, clear loading state; removed direct Clash Royale tagline from splash.
- [x] Home: hide diagnostic "LIVE 3D..." label; physically separate floating 3D dragon from underlying stage; idle hover and tail sway.
- [x] Dragon Lab: foreground procedural GLB spine, per-rarity stage treatment, rotate buttons, drag and wheel zoom; locked skins have dimmed preview, card-level lock/price, and legible names.
- [x] Arena: ground plane spans beyond camera world; deep space procedural shader without square edges or distracting math-grid; larger existing 3D GLB food.
- [x] Minimap: render real food and player coordinates, not decorative grid; player and bots have distinct directional arrows.
- [x] Arena edge: 3D world-space glowing fence, lethal head collision constrained before exiting, bounded smoothly moving camera.
- [x] Result: 2x2 stats, compact trophy and 3 evenly spaced actions for small landscape screens.
- [x] Automated tests for world edge, coordinate mapping, camera, no duplicate colors and existing arena state.

## Verification gate

- Unit/contract suite is executable with Node 22 and is not a substitute for screenshot-perfect QA.
- CI must pass asset pack restore, Android debug compilation, and package manifest inspection.
- Physical Android GPU rendering, interactive drag, soft-keyboard/safe-area, WebView frame-rate/thermals, release signing, accessibility and Play Store compliance are **NOT verified** by headless Node tests.
- Server-authoritative multiplayer, global rankings, commerce, Play Billing and server validated rewards are **NOT implemented**. Their UI must not misrepresent sample or offline data as live online events.

## Acceptance prerequisites for merging

1. Compare each installed Android screen against provided approved artwork at one 16:9 and one 20:9 landscape device; fix regression before marking complete.
2. Validate all 24 creature GLB assets on physical GPUs and confirm premium detailed sculpt requirement separately (procedural GLBs are not equivalent to cinematic art).
3. Verify boundary never exposes a hard edge and no player can leave world; ensure frame-rate/thermal budget on Android.
4. Complete offline control/revive/result/coin transaction E2E; verify installation upgrade behavior and debug signing.
5. Keep main unchanged while production gates are outstanding.
