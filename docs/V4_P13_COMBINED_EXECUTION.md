# P13 combined gameplay and fullscreen patch

Status: P13 R4 VERIFIED / UNITY 6000.6.10F1 COMPILATION PASS / 20-MATCH ALL-5-MODES EMULATOR SOAK PASS / REPRO OVERLAY 0-DIFF VERIFIED / NATIVE RELEASE HOLD ON PHYSICAL DEVICE & PRODUCTION SIGNING.

Source recovered from the authorized private P10 checkpoint, SHA-256 `adcd4be781fdecc571e89778ffd80e871a0f0ffc5cee7e64a49c200c4a632257`. The public PR #4 head remains `a9e2efe3e7cf1ab852e18b68f553a64021b87497`. Actual vendor C# replacement files, Unity scenes, prefabs, and private assets remain in the user's private local workspace/overlay and are never pushed to this public repository.

Private workspace path: `C:/DA4/build-002/QA/UnityProject` (Unity `6000.6.10f1`). Reproducible overlay workspace: `C:/DA4/repro-p13/UnityProject` (0 byte differences across all 1,078 files in `Assets/`, validated cleanly by `PreviewBuild.ValidateQA` and `P07SaveFixture.Run`). Local R4 private overlay backup: `C:/DA4/P13_R4_OVERLAY`. QA APK identity remains `io.dragonarena.unityqa`, version `4.0.0`/code `16`. Production keystore signing and production AAB remain held on missing release credentials and physical Android hardware.

## Build Recovery & P13 R2 -> R4 Fixes Applied
1. R2 compiler & SDK fixes: Replaced obsolete `GetInstanceID()` (`CS0619`) with per-instance `collisionOrder`, restored `cmdline-tools/21.0`, added `com.unity.modules.androidjni` in `Packages/manifest.json`.
2. R3 Competitive NPC AI (`BotController.cs`, `BotSensorController.cs`): Removed suicidal `RiskingPlayerContact` intercept (`BotController.cs`) and `BotSensorController.cs` sensor bypass; added speed-scaled raycast lookahead across all 3 sensors (`Sensor-Front/Left/Right`), non-alloc `Physics.OverlapSphereNonAlloc` threat avoidance, `GhostFood` + safe-food scoring, border margin steering, and safe tactical boosting.
   - `BotController.cs` SHA-256: `94b00bf8a5ee01d86d997c7c059b8492a133fbafa7c0e0f6ca9b3472631d3520` (`27,148` bytes)
   - `BotSensorController.cs` SHA-256: `2341bad41309645e0dc5008fde6cb47b3fbf88fc55159b3209eb9fc2de983d9d` (`3,336` bytes)
3. R3 Fullscreen Overlays & Loading Fix (`P13SafeArea.cs`): Exempted fullscreen modal roots (`LoadingPanel`, `GameoverPanel`, `ModeSelectionPanel`, `SettingsPanel`, `HelpPanel`, `WheelOfFortunePanel`, `PlayerProfilePanel`, `Skins`) from edge shrinking while keeping modal corner buttons inset cleanly so overlays render 100% edge-to-edge without left/right side cuts.
   - `P13SafeArea.cs` SHA-256: `789fc6569dc999496d0b68183aacd523e524ed3ccb27d6b91f1c11852373c02b` (`4,146` bytes)
4. R3 Skins Horizontal Sliding & Layout Polish (`ShopController.cs`, `Skins.unity`, `SkinItem.prefab`): Switched `Content` to `(0,0)-(0,1)` `PreferredSize` layout with `72px` safe-area edge padding, removed `-17` viewport crop, reduced `DragThreshold` to `8`, tuned `DecelerationRate` (`0.08`) & `ScrollSensitivity` (`25`), added `SkinsDragForwarder` + post-drag buy suppression (`0.2s`), and widened `PriceText` (`SkinItem.prefab`) so 6/7-digit prices (`100,000`–`1,000,000`) do not overlap the coin icon.
   - `ShopController.cs` SHA-256: `82bac57bf3aad4240b801f9a830400d3c009bac9c57a4e8409519267ae` (`8,066` bytes)
   - `Skins.unity` SHA-256: `3c070adcfdf05e79702666a0e712deaf917cfa6c49f5523678174856c61c6ef5` (`155,461` bytes)
   - `SkinItem.prefab` SHA-256: `909a2222412433adb0de51e9a83dbc1386543fe9e33a63168b820f178ba62631` (`22,185` bytes)
5. R4 Battle Royale 80-Bot Distributed Spawning (`BotSpawner.cs`): Upgraded spawn grid from `9x9` (`81` points) to `10x10` (`100` points) across `[-81, +81]` with progressive clearance radii (`8.5f -> 6.0f -> 4.2f`) and `>= 9f` player clearance, eliminating `Initial bot spawn incomplete; returning to lobby` in 80-bot Battle Royale.
   - `BotSpawner.cs` SHA-256: `a4a23c09b2224dc23a479d9fcf19ca39b5e18c79544ea815ba4016f9ae13018c` (`8,401` bytes)

## Verified Non-Development QA APK (Latest P13 R4)
- Path: `C:/DA4/artifacts/Dragon-Arena-v4-P13-R4-20261126-140737.apk`
- Evidence Directory: `C:/DA4/artifacts/P13-R4-20261126-140737`
- APK SHA-256: `a81a1544f97b59e75b25f455ee91a6eb875bb3fb5bd09aa52361c8f6964e257f`
- Size: `40,293,307` bytes
- Package: `io.dragonarena.unityqa`, version `4.0.0`, versionCode `16`
- Target SDK: `36`, Min SDK: `26`, `debuggable: false`, sole launcher `io.dragonarena.platform.MigrationActivity`
- Signer Certificate SHA-256: `d23d1c4ab4f4feae36a428b4c059ebe9a2ad48b1c03c3f19c8ff5b2bf5803902` (Matches P12/R2/R3 QA signer)
- ARM64 16 KB ELF Alignment: PASS (`libil2cpp.so`, `libmain.so`, `libunity.so` `PT_LOAD p_align = 0x4000`)
- ZIP Alignment (`zipalign -c -P 16 -v 4`) & CRC: PASS
- Prior working APKs preserved intact: `Dragon-Arena-v4-P13-R3-20261126-131313.apk`, `Dragon-Arena-v4-P13-20261126-102826-926116.apk`, `Dragon-Arena-v4-P12.apk`, `Dragon-Arena-v4-QA03.apk`, `qa01-DragonArena-P11-QA.apk`

## Emulator Device QA, 20-Match Soak & Migration Verification (`emulator-5554` / Android 16 API 36)
- Streamed Install (`adb install -r`): PASS (existing QA save preserved; restored `GamesPlayed=83`, `PlayerCoins=1886`, `SavedBestScore=260`, `SelectedSkinID=3`)
- UI & Controls Visual Verification: Full-bleed `ModeSelectionPanel`, `SettingsPanel`, `LoadingPanel`, and `GameoverPanel` with zero side cuts; smooth horizontal and diagonal touch sliding across all 13 skin cards without coin overlap or unintended purchases (`check-skins-0.png`, `check-skins-h.png`, `check-skins-diag.png`, `check-load-3.png`, `p13-r3-modes.png`, `p13-r4-soak-m4-r4-gameover.png`).
- 20-Match All-5-Modes Soak (`C:/DA4/evidence/android/p13-r4-20match-summary.json`): **20/20 PASS** on `Dragon-Arena-v4-P13-R4-20261126-140737.apk`:
  - `Battle Royale`: `4/4` (80 bots spawned cleanly, zero spawn/init errors)
  - `Quick Play`: `4/4`
  - `Infinity`: `4/4`
  - `Boss Hunt`: `4/4` (`food=+0` rule preserved, `+125` coins per match)
  - `Ghetto`: `4/4`
  - Fatal/Unhandled Logcat Errors: `0`
- Fresh-Install Default Food Theme: Verified `SelectedFoodSkinID = 5` (Sweets) in both `save-0.json` and `save-1.json` on clean `pm clear`, while upgraded/existing profile preserved `SelectedFoodSkinID = 1`.
- Legacy Upgrade / Migration (`io.dragonarena.preview` v3.0.0 side-by-side): `MigrationActivity` detected `io.dragonarena.preview`, opened Android DocumentsUI SAF picker (`ACTION_OPEN_DOCUMENT`) cleanly without modifying v3 data.
- Reproducibility & Local Repo CI: `repro-p13` `ValidateQA` and `P07SaveFixture` PASS (`rc=0`, 0/1,078 asset diffs); `npm test` (5/5), `tools/validate_aaa.py`, `test_v4_integration`, `test_verify_android`, and `check_v4_integration.py` PASS; `bundletool-all-1.17.2.jar` verified present (`version 1.17.2`).

## Remaining Release-Hold Gates (Requires User Hardware / Credentials)
1. **Physical Android Device Field QA (`A05`, `Q02`–`Q04`)**: No physical Android device attached (`adb devices` shows emulator only).
2. **Production Release Keystore & Signed AAB (`A03`, `A04`)**: Production release keystore, keystore/alias passwords, registered production package ID, and legacy v3 exporter private signing key are not present on this local machine, so `native-release-hold` (`check_v4_integration.py --require-release`) remains blocked cleanly without bypass.
