# Dragon Arena v4 P11 execution ledger

Status on 25 November 2026 IST: **P11 in progress. Native release blocked.**

PR #4 is the only target. The verified starting head is `7c4f30cf084485cffcd7b6aab506f254d4eb0e60` on `feat/dragon-arena-v4-unity-rebuild`. The verified base is `b6d130742a87c11840e77510f2744eeaf4672da8` on `main`. Query the current PR head before attaching additional evidence. Keep this ledger updated as gates are resolved.

| Work item | Status | Evidence and continuation |
| --- | --- | --- |
| P11-01 Input and source continuity | Pass | Verified SHA-256 and size for all three handoff inputs. The PR head matches eight overlay manifests, the P09 status, and the P10 lock, checker and test files. |
| P11-02 P00–P10 baseline re-run | Pass, static | 2,812 assertions, 1,091 exact project hashes, 1,068 original payload and metadata hashes, 2,019 archive members, 564 distinct GUIDs. The reconstructed report equals the supplied report after sorting paths and reference locations. Five importer, eight Android helper, seven migration and six P10 tests passed. The release-hold check exited 1 as intended. |
| P11-03 Native baseline and dependencies | Blocked | The supplied native runner initially stopped at its executable check. A legitimate activated 2021.3.8f1 editor with Android modules is required. Resolve the 18 intended UGUI bindings against the installed package. The four missing non-UI GUIDs have nine references across four materials, two gameplay VFX prefabs and the Game scene. Preserve the original source until the genuine dependencies or a reviewable, visually verified repair are available. |
| P11-04 Android acceptance | Blocked | Android Platform-Tools and Build-Tools 36.0.0 were installed for analysis. ADB found zero connected devices. Complete the 57-row matrix in the private checkpoint on the compiled baseline and signed candidate, including 20 matches across all five modes, catalog and presentation checks, save recovery, and measured performance. The matrix remains 7 pass, 7 blocked, 43 not run. |
| P11-05 Legacy APK identity and migration compilation | Verified with blocker | Verified the signatures and release digests of both published v3 APKs. They share `io.dragonarena.preview` and use different debug certificates. Compiled the v3 exporter with JDK 17 and API 35, packaged a private unsigned standalone APK with D8 and AAPT2, and verified its manifest and embedded migration modules. The v4 migration activity independently compiled against API 35 and 36. Unity manifest merge and on-device export and import still require verification. Preserve the original app and use the signer corresponding to the installed copy. |
| P11-06 Release artifact tooling | Implemented and unit-tested | The Android verifier can retain the exact universal APK derived from the inspected AAB. It checks the APK before writing the output, records both digests and preserves pre-existing files. Release-path tests cover retention, rejection, source mutation and overwrite protection. The legacy identity checker exits nonzero on a mismatched signer and was exercised on the two published APKs. |
| P11-07 Production toolchain, package, and signing | Blocked | Requires an authorized source and a separate private Unity 6 upgrade. Unity's release feed listed 6000.3.29f1 LTS at the time of review. Qualify that editor with a registered release ID and private signing access. Verify target SDK 36 and 16 KB support with the pinned Android tools and a 16 KB Android runtime. Check Play App Signing separately if the app is submitted to Play. |
| P11-08 Exact-head merge and publication | On hold | Confirm all release-blocking rows with native evidence, use the expected PR head for the merge, then verify the merged revision and its signed artifacts before creating a versioned GitHub release. |

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

## Artifact verification

Run `python -m unittest discover -s unity-integration/android -v` for verifier unit cases. Run `python unity-integration/android/verify_android_artifact.py --help` for the private builder command. Pass `--apk-output` with a fresh path to retain the verified release APK. Supply signing inputs only through the private builder. Record device acceptance and source provenance separately.

Use the [Google Play target API requirements](https://developer.android.com/google/play/requirements/target-sdk), [Android page-size guidance](https://developer.android.com/guide/practices/page-sizes), and [Unity Android dependencies](https://docs.unity3d.com/6000.0/Documentation/Manual/android-supported-dependency-versions.html) to confirm the production toolchain before building.
