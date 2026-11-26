# P13 combined gameplay and fullscreen patch

Status: P13 R2 BUILD RECOVERED / UNITY 6000.6.10F1 COMPILATION PASS / VERIFIED NON-DEV QA APK PRODUCED / EMULATOR-5554 DEVICE QA PASS.

Source recovered from the authorized private P10 checkpoint, SHA-256 adcd4be781fdecc571e89778ffd80e871a0f0ffc5cee7e64a49c200c4a632257. The public PR #4 head remains a9e2efe3e7cf1ab852e18b68f553a64021b87497. The P13 manifest pins 17 changed existing files and four new integration source/meta files. Actual vendor C# replacement files remain in the user's private patch ZIP, not this public repository.

Private deliverable: Dragon-Arena-P13-Combined-Private-Patch-R2.zip. Manifest SHA-256 6df3bcf7a3f5e77284164ac44566938949375b07ee24fba95b9140b88f7ef3c1. Existing private project C:/DA4/build-002/QA/UnityProject; Unity 6000.6.10f1. QA APK identity remains io.dragonarena.unityqa, version 4.0.0/code 16. No production signing or release.

## Build Recovery & Fixes Applied
1. R2 compiler fix: CS0619 in BotController.cs replaced obsolete GetInstanceID() with per-instance creation order `collisionOrder`.
2. Android SDK toolchain fix: Restored `cmdline-tools/21.0` in Unity Android SDK (`C:/unity/6000.6.10f1/Editor/Data/PlaybackEngines/AndroidPlayer/SDK/cmdline-tools/21.0`) and ensured full system PATH (Windows System32, PowerShell, Git) and PYTHONUTF8=1 in launch scripts.
3. Player compilation fix: Registered `com.unity.modules.androidjni` module in `Packages/manifest.json` resolving CS0103 for `AndroidApplication` and `AndroidWindowInsets` in `P13SafeArea.cs`.

## Implemented in private overlay
- Fullscreen: Unity 6.6 immersive settings, 2.4 aspect ratio support, hide bars on scene load/focus, full Menu camera viewport, safe-area mapping of top-level UI anchors without moving hierarchy; joystick and boost handle their own margins.
- Controls: original joystick background and handle +35%, boost button +30%, pointer ownership for independent two-thumb control, retain last steering event without emulated mouse dependence; exponential frame-rate-independent turn response factor 1.65 with minimum boost steering factor 0.8.
- Food: serialized food prefab GUID mapping identifies Sweets theme ID 5 (15 sprites). Set only when DurablePrefs creates a fresh, non-migrated profile. Existing selections remain untouched.
- Economy: original source grants IDs 0–2 free; keep all three. Price array by ID: 0,0,0,2000,3000,10000,20000,50000,100000,200000,350000,500000,1000000. UI and debit read same authoritative price method. Match multiplier 1.7 -> 1.25, rank multiplier retained, previously earned balances and owned skins preserved, no change to wheel or XP.
- Collision: player head/NPC head and NPC head/player body call one guarded NPC elimination method. Player head/NPC body still fatal to player; NPC/NPC head chooses larger snake then creation order. Bounded AI risk window allows player contacts; preserve border avoidance and death idempotence.
- Spawning: 36 Quick/Infinity bots, 28 Boss, 32 Ghetto, 80 Royale unchanged. 81 evenly distributed grid candidates, bounded replenishment of at most three NPCs per batch, no Royale respawns. Default 900 food and 0.9s reposition delay in replenishing modes; Boss zero normal food, Ghetto 300 and Royale 500 without normal-food replenishment.

## Verified Non-Development QA APK
- Path: `C:/DA4/artifacts/Dragon-Arena-v4-P13-20261126-102826-926116.apk`
- Evidence Directory: `C:/DA4/artifacts/P13-COMBINED-20261126-102826-926116`
- APK SHA-256: `3dbdae2137a10603e446dab0f1a1490d963439a5e33d529f42f1d978fcc89534`
- Size: 40,272,623 bytes
- Package: `io.dragonarena.unityqa`, version 4.0.0, versionCode 16
- Target SDK: 36, Min SDK: 26, debuggable: false
- Signer Certificate SHA-256: `d23d1c4ab4f4feae36a428b4c059ebe9a2ad48b1c03c3f19c8ff5b2bf5803902` (Matches P12 signer)
- ARM64 16KB ELF Alignment: PASS (libil2cpp.so: 16384, libmain.so: 16384, libunity.so: 16384)
- ZIP Alignment & CRC: PASS

## Device QA Verification (emulator-5554 / DragonArena_QA_API36)
- Platform: Android 16 (API 36) Google APIs x86_64, host GPU OpenGL ES 3.1 translation
- Streamed Install: PASS (`C:/DA4/evidence/android/p13-qa01-install-verification.json`, installed APK SHA-256 matches build exactly)
- Process: `io.dragonarena.unityqa/com.unity3d.player.UnityPlayerActivity` (pid 2534)
- Launch & Lobby: PASS (`p13-01-lobby.png`)
- Match Entry: PASS (`p13-04-match-entered.png`)
- Touch Steering Gestures: PASS (`p13-05-steer-left.png`, `p13-07-steer-right.png`)
- Rocket Boost Touch: PASS (`p13-06-steer-up-boost.png`)
- Unhandled Unity Exceptions: 0
- Prior APKs preserved intact: `Dragon-Arena-v4-P12.apk`, `Dragon-Arena-v4-QA03.apk`, `qa01-DragonArena-P11-QA.apk`
