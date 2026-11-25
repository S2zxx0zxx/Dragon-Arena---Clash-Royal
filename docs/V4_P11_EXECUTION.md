# Dragon Arena v4 P11 execution ledger

Status on 25 November 2026 IST: **P11 in progress. Native release blocked.**

PR #4 is the only target. The verified starting head is `7c4f30cf084485cffcd7b6aab506f254d4eb0e60` on `feat/dragon-arena-v4-unity-rebuild`. The verified base is `b6d130742a87c11840e77510f2744eeaf4672da8` on `main`. Query the current PR head before attaching additional evidence. Keep this ledger updated as gates are resolved.

| Work item | Status | Evidence and continuation |
| --- | --- | --- |
| P11-01 Input and source continuity | Pass | Verified SHA-256 and size for all three handoff inputs. The PR head matches eight overlay manifests, the P09 status, and the P10 lock, checker and test files. |
| P11-02 P00–P10 baseline re-run | Pass, static | 2,812 assertions, 1,091 exact project hashes, 1,068 original payload and metadata hashes, 2,019 archive members, 564 distinct GUIDs. The reconstructed report equals the supplied report after sorting paths and reference locations. Five importer, eight Android helper, seven migration and six P10 tests passed. The release-hold check exited 1 as intended. |
| P11-03 Native baseline and dependencies | Static overlay verified, native blocked | Unity 2021.3.8f1 revision `b30333d56e81` launched in the previous workspace and stopped at license activation before import. Its bundled UGUI 1.0.0 matched all 18 UI GUIDs. The new compatibility overlay resolves all nine references to the four missing non-UI GUIDs. It changes seven asset files and one original Android build script among the 1,091 source files, leaving exactly 680 UGUI occurrences. A second apply writes zero files. Unity import, compilation and visual comparison still require an activated builder. |
| P11-04 Android acceptance | Blocked | Android Platform-Tools and Build-Tools 36.0.0 were installed for analysis. ADB found zero connected devices. Complete the 57-row matrix in the private checkpoint on the compiled baseline and signed candidate, including 20 matches across all five modes, catalog and presentation checks, save recovery, and measured performance. The matrix remains 7 pass, 7 blocked, 43 not run. |
| P11-05 Legacy APK identity and migration compilation | Export route tested with fixtures, device blocked | Both published v3 APKs use different verified signing certificates and both declare `application-debuggable`. The previously compiled v3 exporter still needs the installed copy's signer. The read-only WebView export route uses the existing installation and the pinned P10 v3 backup code. Four fixture checks passed, including byte-for-byte original envelope preservation and rejection of wrong origin, missing save, and changed helper input. Seven P10 migration tests also passed. Unity manifest merge and the real device export/import remain open. |
| P11-06 Release artifact tooling | Implemented and unit-tested | The Android verifier can retain the exact universal APK derived from the inspected AAB. It checks the APK before writing the output, records both digests and preserves pre-existing files. Release-path tests cover retention, rejection, source mutation and overwrite protection. The legacy identity checker exits nonzero on a mismatched signer and was exercised on the two published APKs. |
| P11-07 Production toolchain, package, and signing | Android verification tools installed, release blocked | Reinstalled Android API 36, Build-Tools 36.0.0 and platform-tools. Verified the official bundletool 1.18.3 release digest and ran its version command. The official Unity CLI resolved Unity 6000.3.29f1 with JDK 17, NDK r27c, Build-Tools 36.0.0 and API 36 among its modules. Added a Unity 6 Activity entry-point pin and an APK check requiring exactly one launcher, the migration activity. Verified acceptance of a single launcher and rejection of two using real AAPT-generated API 36 fixture APKs. Requires authorized source, a separate private Unity 6 upgrade, the registered release ID and secure signing access. ADB reported zero attached devices. |
| P11-08 Exact-head merge and publication | On hold | At implementation commit `d6db35960a8ef65f47388c8a0c4e5a4a855c11c7`, GitHub run 45464930815 passed public integration and rejected release via the intentional native hold. A detached checkout of that head passed 10 Android verifier and six integration unit tests. Confirm all release-blocking rows with native evidence, use the expected PR head for merge, then verify the merged revision and signed artifacts before publication. |

The [UGUI evidence](V4_P01_UGUI_GUID_EVIDENCE.csv) records the package-relative metadata paths. It verifies the GUID mapping independently of the remaining scene-import and runtime gates.

## Resume checkpoint from `6fe1201`

Reopened the recorded private handoff in the fresh workspace and matched its three input digests. Reconstructed P09 from the supplied original ZIP and reproduced 2,812 assertions before preparing the P11 overlay.

### Non-UI reference overlay

| Missing dependency | Compatibility change | Source evidence and required acceptance |
| --- | --- | --- |
| Background texture | Bind the supplied `GameBg-02-Wide.psd` in `Background-02` and `GameoverPanel`, retaining each material's scale and color. | `Background-01` uses the same shader and supplied texture. The four affected materials have no direct serialized runtime consumers and are explicitly used by the P06 legacy-art fixture. Compare the fixture renders, including result-panel tint and texture tiling. |
| Solid-color texture | Clear the texture slots in `SolidColor-White` and `SolidColor-Cyan`, keeping their original shader and authored colors. | Their original files differ only by material name and color. Compare both fixture swatches in Unity. |
| Particle light prefab | Clear four references to the absent Light and disable the three enabled modules using it. | No source Light component was available to use as an original prototype. Preserve the particle systems, renderers and other module fields. Verify both referenced hit effects during gameplay. |
| Game lighting settings | Clear the missing asset reference and use Unity's scene default. | Game has no baked lighting data and the other three scenes serialize the default. Keep its inline settings and rendering configuration. Check gameplay frame appearance and lighting before accepting. |

Generate the overlay from the immutable P10 Unity project, then apply it to a separate project copy for native validation. The lock pins eight before/after hash pairs and six supporting source files. The additional source change selects the Unity 6 Activity entry point for the migration bridge's `UnityPlayerActivity` target. Unity 2021 excludes that setting at compile time. Keep the private overlay outputs on the licensed builder.

```sh
python unity-integration/prepare_p11_dependencies.py "$p10_project" "$overlay"
python unity-integration/apply_verified_overlay.py "$qa_project" "$overlay" "$overlay/P11_OVERLAY_MANIFEST.json"
```

The native runner reconstructs the private baseline, applies the overlay, verifies the complete candidate file manifest, and executes the editor scene/prefab validation, save fixture, legacy art fixture and Android QA build in order. Run it against a fresh output directory. Omit `--unity` to reproduce the candidate without running the editor. That mode verified all 1,091 files and wrote a canonical manifest with SHA-256 `d7bb16e0bb8e4285192468b93c00e6569acbc673f09388d3515c18d87443329d`. The output status keeps device QA and release blocked even when Unity produces a QA APK.

```sh
python unity-integration/run_p11_native.py --checkpoint "$private_p10" --source "$original_zip" \
  --output "$fresh_evidence_dir" --unity "$unity_2021_executable"
```

Keep the shipped source untouched until the candidate's in-engine comparisons pass. The 57-row acceptance matrix retains 7 passed, 7 blocked and 43 pending execution.

### Unity activation checkpoint

Extracted Unity Hub 4.0.1 after package verification against Unity's signed package index. Its official CLI 1.0.0 reports no signed-in Unity account. The full baseline install stopped at the SDK and NDK license prompt. On the build machine, sign in to Unity Hub and complete any browser MFA. In **Settings → Licenses**, verify that Personal is active. If needed, select **Add license → Get a free personal license** and review the terms. On **Installs**, select **Unity 2021.3.8f1** from the archive and include **Android Build Support**, **Android SDK & NDK Tools**, and **OpenJDK**. Review and accept the Android module terms there. [Unity Hub license instructions](https://docs.unity.com/en-us/hub/manage-license)

The official CLI separately installed the 2021.3.8f1 Linux editor and Android Build Support module. The SDK, NDK and JDK child modules remain pending. On commit `3e8ccb50122144cadb2ad58e9615020bdc6918ea`, the native runner rechecked the candidate manifest, launched that exact editor with the Android target, and recorded `validate` exit code 1. The editor reported that it could not connect to its licensing client, a Unity service timeout, and denied network interface enumeration in the workspace. It produced no scene/prefab inspection marker. Import, compilation, runtime checks and APK generation remain unverified. ADB reported no attached device.

At that tested commit, the 11 Android verifier tests and six integration tests passed from the remote tree. [GitHub Actions run 45475717733](https://github.com/S2zxx0zxx/Dragon-Arena---Clash-Royal/actions/runs/45475717733) passed public integration and stopped at the native release hold.

## Legacy signer evidence

| Published preview | Version code | Verified certificate SHA-256 |
| --- | --- | --- |
| `android-preview-v3.0.0` | 13 | `e679caeedb20f3c9118761fc415a7c38deaf643758759fcd690d2846ea48b447` |
| `android-preview-v3.0.1` | 14 | `be068bacaec0d7c36fcab23d8742ec490dc3b475ea62493adb4937bbb6a601e0` |

Check a candidate against the APK matching the installation that holds the save.

```sh
python unity-integration/android/verify_legacy_upgrade.py installed-v3.apk v3-exporter.apk \
  --aapt /path/to/aapt --apksigner /path/to/apksigner
```

An identity match permits proceeding to on-device export and import tests. It records no device installation or save-export result.

### Export from the existing debug installation

With a supported Android System WebView and authorized USB debugging, use Chrome DevTools to inspect the installed v3 WebView at `https://appassets.androidplatform.net/assets/index.html`. Both public v3 APKs declare the debug flag. WebView 113.0.5656.0 and later enables inspection for debuggable apps by default.

```sh
node unity-integration/android/prepare_legacy_webview_export.mjs "$private_p10/migration" legacy-export-console.js
```

Run the generated script in the selected WebView's DevTools Console and save the clipboard text as `legacy-v3-import.json`. It reads only the legacy v3 local-storage key and the original IndexedDB save, validates and chooses the candidate with the P10 logic, and copies a native-import envelope. Keep the backup private. Import it into v4's separate application ID and verify the resulting save and preservation of the v3 installation on-device. If the WebView is unavailable for inspection, the separate matching-signer route remains required.

## Artifact verification

### Windows QA checkpoint

The operator reports Unity Personal active and Unity `6000.6.10f1` launching from `C:\Unity`. The current Linux workspace has no mount or remote editor access to that Windows PC. The actual Windows Android modules and baseline editor have yet to be observed.

The Windows runner uses the approved private handoff ZIP by SHA-256. From the PR checkout on the activated Windows PC, run the following with Python 3.11 or newer. By default it finds the handoff in Downloads. Supply `--handoff` with its local path if stored elsewhere.

```powershell
py -3 .\unity-integration\run_p11_windows.py
```

It reports Android Build Support, the required SDK platform and build tools, NDK and OpenJDK for each discovered editor. It checks `C:\Unity` and Unity Hub's default Windows install path. Use `--unity-root` for an additional install layout or `--preflight-only` to report modules without building. The automatic profile prefers the complete 2021.3.8f1 baseline and can use the verified executable version `6000.6.10f1` when baseline modules are missing. Pass `--editor-version 6000.6.10f1` to explicitly choose the new QA profile. The Unity 6 API updater runs against the freshly reconstructed copy only. The original checkpoint and production build configuration are preserved.

The candidate keeps `io.dragonarena.unityqa`, version 4.0.0, separate from v3. The baseline targets API 30 and the Unity 6.6 QA profile targets API 36. Both require the migration activity as sole launcher and pass signature, package, SDK and native ABI checks before the wrapper reports a verified APK. Default build evidence is under `%USERPROFILE%\P11\<timestamp>\`. Send `QA/P11_NATIVE_STATUS.json` and the failing step log for blockers, or `QA/P11_APK_VERIFICATION.json` after a build. Installation, launch and gameplay on a real phone are separate acceptance gates.

The resumed source run reproduced 2,812 static assertions and prepared all 1,091 files. Canonical candidate manifest SHA-256 is `3a73cdf694b01111ef1bc07a7370a04c7f55d2591fe79a68ab8ced5d0ccd6bf6`. Local fixture checks verified Windows module detection, the modern fallback and QA APK metadata verification. No Windows editor command or device test was executed in this workspace and no playable APK was produced. Both native QA builds and all remaining release gates stay open.

Run `python -m unittest discover -s unity-integration/android -v` for verifier unit cases. Run `python unity-integration/android/verify_android_artifact.py --help` for the private builder command. Pass `--apk-output` with a fresh path to retain the verified release APK. Supply signing inputs only through the private builder. Record device acceptance and source provenance separately.

Use the [Google Play target API requirements](https://developer.android.com/google/play/requirements/target-sdk), [Android page-size guidance](https://developer.android.com/guide/practices/page-sizes), and [Unity Android dependencies](https://docs.unity3d.com/6000.0/Documentation/Manual/android-supported-dependency-versions.html) to confirm the production toolchain before building.

## Local Windows execution, 25 November 2026

Authorized short workspace: `C:/DA4`; PR worktree: `C:/DA4/repo`, starting head `b1984830121e0617f7546625cfbc1385ab2c64bc`. Live GitHub inspection confirms PR #4 open/draft with that head and base `b6d1307`. Existing main worktree left intact.

Both downloaded archives passed full CRC checks. Handoff SHA-256 `ef6b31387d92745fcfe0eb40971944ffe4b28fc93fbf540c40daf076d7e5780e`; GitHub checkpoint ZIP SHA-256 `25a90067f45736ef7ad04f07bedce06f9a83a929ab21b9a24ead4a876e91d328`. All three nested INPUT_SHA256 entries match size and digest and pass CRC. Private checkpoint, original package and master planning recovered outside Git. Initial free space: C 59.1 GB, G 56.2 GB.

Python 3.14 and Git 2.51 present. Unity Personal active and signed in. Unity 6000.6.10f1 Android preflight passes SDK API36, Build-Tools36, NDK27.2.12479018 and OpenJDK17.0.21. Exact 2021.3.8f1 absent; official Unity CLI1.0.1 installed with its installer checksum check, baseline installation started separately.

First runner attempt (`build-001`) failed before Unity because the checkpoint verifier uses default text decoding on Windows. Runner now explicitly enables PYTHONUTF8 for descendants. Git autocrlf also changed hash-locked manifest bytes; LF checkout plus `.gitattributes` resolves this without changing expected hashes. All 11 importer/public integration tests and 11 Android verifier tests pass after correction.

Second attempt `C:/DA4/build-002` reproduced 2,812 assertions and all 1,091 candidate files, manifest SHA-256 `3a73cdf694b01111ef1bc07a7370a04c7f55d2591fe79a68ab8ced5d0ccd6bf6`. Unity6 entitlement succeeded and native import/compilation is running in the fresh copy. Original checkpoint remains immutable. No APK yet; no gameplay or release gate claimed. ADB initially had no device; existing Chess_Test_API36 emulator started for later smoke tests. Physical QA and existing-user migration remain open.

### Unity 6 compiler remediation

`build-002/QA/validate.log` reached actual C# compilation and failed CS0619 in the original integration validator: Unity 6.6 removes `SerializedProperty.objectReferenceInstanceIDValue`. The pinned P11 overlay now uses `objectReferenceEntityIdValue != EntityId.None` on Unity6000.3+, retaining the old API for the 2021 baseline. Updated only the integration script output hash to `323b4c39fb31e2af22bc784e080688a3f1ab6d5638e2bb719e6c155da67775ae`. The overlay regenerated successfully against immutable P10, and both 11-test public suites passed again. Retry compilation produced Assembly-CSharp-Editor.dll with warnings and no CS0619; asset import and scene validation are still running. Private `COMPILER_FIX_OVERLAY.json` retains before/after evidence.

Existing emulator `Chess_Test_API36` booted as emulator-5554, supporting x86_64 and arm64-v8a via libndk_translation.so. No old Dragon Arena package is installed in this emulator. This is an emulator test target, not physical-device performance evidence.

### Native validation and fixture checkpoint

Actual Unity6000.6.10f1 validation passed all four scenes, prefab component/reference inspection, installed-package GUID resolution and material shader references (`validate-retry1.log` and `validate-retry2.log`, exit0). Actual C# isolated storage self-test passed (`save_fixture-retry1.log` and `save_fixture-retry2.log`, exit0). These are editor checks, not gameplay or rendering acceptance.

The P06 generator initially failed because a new batch Editor starts in an unsaved untitled scene, which prevents additive scene creation. Added an integration wrapper opening the existing saved Init scene before calling the unchanged fixture generator. Retry2 generated the fixture successfully, exit0, and excluded it from production build settings. Reviewed output hash is pinned in P11_DEPENDENCY_LOCK. `build-retry2.log` is now running Android packaging using bundled Gradle9.3.1, AGP9.1.1, SDK36, JDK17 and NDKr27c. No APK or runtime pass claimed yet.

Private execution state, blocker register, 57-row matrix and logs live under `C:/DA4`. N04 scene/prefab compile inspection and N06 native storage fixture now have actual evidence on Unity6; N01 exact2021 baseline remains open. The local debug keystore certificate does not match either recorded v3 signer. Requested existing signing configuration paths and physical Android connection while continuing the independent QA build.

### Resumed after usage interruption, 25 November 2026

Re-read private execution state and fetched PR #4: head remains `93b868a221c1c14769b6b1ff96aec6ff8ea647e1`, open/draft. The prior build ended without an APK: native backend and clang jobs returned Windows termination code `1073807364` (`0x40010004`), followed by the internal-build missing-finish-message error. It is a failed/interrupted build, not artifact evidence. Retry3 invokes the same checked build method against the preserved candidate and caches; actual ARM32/ARM64 clang jobs are advancing without compiler failures so far.

The baseline installer left an incomplete `C:/Unity/2021.3.8f1`: executable probe exits `0xC0000135`, and Data contains only MonoBleedingEdge. Keep N01 blocked; repair using the verified cached official installer after the immediate QA build. Unity6 license and full Android preflight remain valid.

Searched relevant local repository/project directories, Downloads, Android/Gradle locations and standard `.android` keys. Inventory found only the standard local debug keystore (different certificate from both published v3 APKs) and an unrelated CMake fixture certificate; six relevant Android property files contain no signing settings. The v3 workflow assembles debug APKs on ephemeral GitHub runners and does not persist a signing key. Original signer not recovered. Per user instruction, defer production signing/upgrade identity and continue QA and all independent gates. Do not uninstall existing v3. Physical phone will be connected when available.

### First verified v4 QA APK

Retry3 completed successfully at 12:09 IST on25 November2026, exact public head `93b868a221c1c14769b6b1ff96aec6ff8ea647e1` plus recorded engine import conversion. Actual APK: `C:/DA4/build-002/QA/DragonArena-P11-QA.apk`, 54,769,897bytes, SHA-256 `1bae5652a02124b37baadac87c0b1603d28445c9b57d23e8ea755f5c6a5307d4`. Artifact verifier passes package `io.dragonarena.unityqa`, code15/version4.0.0, minSDK26/target36, ARM64+ARMv7, sole migration launcher, signature and permissions. Local debug signer fingerprint `d23d1c4ab4f4feae36a428b4c059ebe9a2ad48b1c03c3f19c8ff5b2bf5803902`. Additional native ELF inspection passes16KB segment alignment for all three ARM64 libraries. No production-signing or device-runtime claim.

All564 checkpoint metadata GUID identities remain unchanged after Unity6 import. Runtime emulator testing is starting; source, key and old-release preservation remain enforced. Keep draft/release hold until remaining acceptance gates genuinely pass.

### First actual Android startup and insets fix

QA01 installed successfully in the existing emulator. Actual screenshots001-008 and package logcat are retained privately under `C:/DA4/evidence/android`. Migration chooser and fresh-start confirmation respond. Android16 forced edge-to-edge exposes a real header/status-bar overlap (screenshot003). Added a pinned ninth overlay for the original integration `MigrationActivity.java`: system bar/cutout insets with API26 fallback; save/import behavior unchanged. Source before `6fe5b327925a649b2d5221e857b7bdf0dbb7c8bcbce543bdfbbfc300e35e5469`, after `a01de9285d24e64347bb3d95f9304f9399a0c553fa38c415888c6e77a644b452`. Nine-file overlay regeneration and11 public integration/import tests pass. Runtime layout verification awaits QA02. QA01 retained unchanged.

The initial emulator36.2/SwiftShader provides only GLES3.0; actual Unity6.6 startup reports a hardware warning. Unity6.6 requires GLES3.1+ or supported Vulkan; no app requirement is lowered and no compatibility pass claimed. Found newer emulator37.3.10 already installed in `C:/Android/sdk`; switching uses it without duplicate installation. New emulator rejects the old AVD's conflicting720x1280 skin versus1080x2340 LCD config. Created isolated `DragonArena_QA_API36` using the existing API36.1 image and consistent720x1280 resolution, preserving the existing AVD. Host AMD GPU selected.

### QA02 native runtime and renderer remediation

QA02 build succeeded on source `5aa2a5c2d62cf80aea82eca3537e83450f78c647`; APK54,776,157bytes, SHA-256 `073310703b2477044d7cc330e07f9ab509f2b79f47de0da0258fd2c6a6b1a92f`. Signature/package/version/SDK/bothARM ABIs/sole launcher and additional ARM64 ELF16KB checks pass. QA01 remains unchanged. Screenshot013/014 shows the first-launch header clear of the Android16 system bar; native fresh-start confirmation responds.

After a long host pause, the emulator system_server crashed in AppOps with a negative-duration assertion, before QA02 installation; captured separately and cold-booted without wiping data. New emulator37.3.10 reports actual GLES3.1. Actual QA02 native Unity startup then crashed in `vulkan.ranchu.so` via `libndk_translation_proxy_libvulkan.so`, at `vk_common_SetDebugUtilsObjectNameEXT`; exit-info confirms native SIGSEGV. Retained native crash buffer and screenshot015-016. This is a failed runtime attempt, not playable acceptance.

Pinning the modern QA profile to the supported OpenGLES3 backend (GLES3.1 minimum on Unity6.6), retaining legacy shader compilation and original artwork. Production configuration and its Vulkan acceptance remain unchanged/unverified. This changes only the integration build script and its pinned output hash. QA03 will require actual rendering/gameplay evidence before a playable claim.

The cached native installer repaired exact Unity2021.3.8f1; version probe returns2021.3.8f1 exit0. Android module and official downloaded baseline ZIP dependencies installed privately; native baseline checks remain pending.

### Playable QA03 and Android gameplay evidence

QA03 compiled successfully from `bcfc0fd0563198e040c136be1c0ad2a8181a1971`. APK `C:/DA4/build-002/QA/DragonArena-P11-QA03.apk`, 55,380,329 bytes, SHA-256 `94ee0352af94486e69d1a59c222a9cc22d353dbad7ae1d5dc9e97ec75dfc540f`. A convenient identical copy and checksum are retained in `C:/DA4/artifacts/Dragon-Arena-v4-QA03.apk`. Package `io.dragonarena.unityqa`, version4.0.0/code15, min26/target36, ARM64+ARMv7, debug certificate, sole migration launcher and native ARM64 16KB ELF alignment verified. Installed APK was pulled back and its full digest matched the source artifact.

Actual emulator37.3.10/AMD host GPU/GLES3.1 runs the first-launch chooser, tutorial, original-art lobby, all-five-mode selector and arena. Screenshots039–041 show a held touch joystick and visible right steering; collision VFX and results follow. Four Quick Play matches ended by normal collisions, with score/rank/reward recorded privately: 6/26/10, 9/25/15, 5/26/8, 6/24/10. Returning to menu shows43 coins and best9. Native two-generation save checksum validation agrees with43 coins and240 XP. A subsequent Infinity collision result shows6/26/10; after emulator cold boot the actual native save retains GameModeID1, GamesPlayed5, coins53 andXP300. These are playable smoke and settlement observations, not a claim that all mode rules or the 20-match soak passed.

Private evidence remains outside Git: `evidence/android`, `MATCH_LEDGER.jsonl`, installed APK comparison, build/artifact reports and save snapshots. Exact2021 baseline native import, remaining runtime matrix, physical-device performance/compatibility and production signer remain open. PR stays draft and release remains on hold. Long host pauses have twice killed the emulator system_server; capture those guest-system failures separately and cold boot without wiping old application data.
