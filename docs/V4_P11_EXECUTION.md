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
