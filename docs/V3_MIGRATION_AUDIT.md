# Dragon Arena v3.0 migration audit — 2026-11-24

## Verified baseline
- Repository: https://github.com/S2zxx0zxx/Dragon-Arena---Clash-Royal
- Default branch main inspected at `bf3ccb1b311a6be7ec8a321fac23a99774bed586`.
- Git tree: 95 tracked files, 9,286,773 bytes, including 13 packed assets and 14 app test files.
- Latest listed release: `android-preview-v0.9.2`, `app-debug.apk` (9,527,507 bytes). Existing release is untouched.
- Supplied ZIP: 69 entries including directories, 332,666 uncompressed bytes. Original npm tests 5/5 passed.

## Architecture comparison
Old `CrystalArena` and `CrystalRenderer` use GLB assets restored from packed files. New `DragonArenaEngine`, `DragonWebGLEngine`, `mesh_builder.js`, and `Canvas2DFallbackEngine` provide procedural rendering and physics with spatial hashing, pooled effects, instancing and bloom. These are implementation changes, not measured speed/FPS claims. New rules include portals, boost pads, destructible pillars, bounty, hit-stop, emotes, royale storm and Titan Hunt. Both versions contain 24 dragon/creature variants. New progression has level upgrades, pass tiers, local leagues, ghosts, crates, missions, signed saves and telemetry. Old progress also supported missions, events and login rewards. New local checksum is not cryptographic anti-cheat: the salt is client-visible. No real backend or real billing endpoint configured. TWA digital association has a placeholder signing fingerprint. No proof of online multiplayer. Old custom GLB visual fidelity and all 14 legacy test files are not established as equivalent.

## Local integration changes in this delivery
- Align package and Android versions to v3.0.0-preview (Android versionCode 13, same package ID).
- Remove obsolete self-applying workflow; rewrite validation and APK workflow for the new procedural runtime. PR builds do not publish. Main build publishes versioned debug APK only after tests, browser smoke and APK signature check. Preserve older prereleases.
- Replace legacy server requiring nonexistent `tools/unpack_assets.py`.
- Unignore original PNG icons; ignore build outputs, local SDK settings and keystores.
- Disable service worker registration in Android preview; bump PWA cache and limit cleanup to game caches.
- Replace WebGL-bound canvas before Canvas2D fallback; fix native back event code.
- Static import, syntax, icon and offline cache checks pass; 5 supplied test groups pass after local edits.
- Browser smoke script supplied for CI; local Chromium navigation blocked by environment administrator. No browser or physical device pass claimed. No local Gradle/Android SDK; APK not built or published here. No remote source changes made.

## Release gates
1. Compare live main and open PRs; preserve old commit and release history, never force push.
2. Apply complete new runtime as a dedicated branch; review obsolete asset/legacy tooling removals and any unrelated changes. Keep previous docs and license history. Verify both PNGs tracked.
3. Pass unit, static checks, WebGL2 and forced fallback browser smoke, and Android debug assemble/signature verification on the actual branch SHA. Review test parity loss; use a test preview, not a production claim.
4. Merge only the reviewed PR, then verify main workflow succeeds and the v3.0.0 prerelease contains the APK and matching SHA256. If CI fails, stop and fix instead of publishing broken build.
5. Test on physical Android, including touch, sound, render, offline restart, storage, pause/resume, back navigation and mode flow. Existing v0.9.2 debug key may not match; do not uninstall without data backup. Legacy key `dragon-arena-v4-demo` is not migrated to `dragon_arena_aaa_signed_v3`; local data may appear reset. Do not claim upgrade compatibility.

## Import execution review
- Live main matched bf3ccb1b311a6be7ec8a321fac23a99774bed586; no open PRs at inspection.
- Reviewed old asset restoration, mesh generators, server and workflows. All depended on the retired GLB runtime; none are dependencies of the new static procedural runtime. Removed legacy tools, packs, tests, QA output and self-applying patch workflow. Old docs archived under docs/legacy/v0.9.2; all previous source remains in Git history. No license or governance files were present in the baseline tree.
- Five supplied unit groups passed locally. Static validation initially failed on Windows CP1252; explicit UTF-8 reads fix the failure without removing assertions.
- Both PR workflows explicitly check out the PR head SHA. Existing v3 release is a publication failure, never a silently successful replacement.
- Legacy parity gaps remain: 14 legacy test files and custom GLB fidelity are not equivalent to the five procedural test groups. Legacy save migration, online multiplayer, real billing, production security, TWA verification and physical Android QA are unverified. Release is a debug test preview.
- Local browser and Android build results and remote gates must be checked separately; no physical-device pass is claimed.
- Browser smoke exposed a CSP incompatibility in Playwright string-expression polling. Changed both predicates to function expressions, preserving all assertions and the strict application CSP. Local pinned Chromium 1.56.0 smoke passes WebGL2 and forced Canvas2D boot/home/lab/local arena.
