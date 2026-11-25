# P13-01 — Android immersive fullscreen

Status: patch authored, native build and physical-device acceptance pending. Stacked on PR #4 at a9e2efe3e7cf1ab852e18b68f553a64021b87497. Do not merge or publish while release gates remain open.

The user-provided comparison shows Android status information above the game and unused black space on the left of the P12 landscape screenshot. This patch targets the system-window layer first using Unity 6.6 documented APIs: FullScreenWindow, no requested visible system insets, transient bars by swipe, and rendering outside safe area where supported. It does not alter camera viewport, Canvas Scaler, anchors, graphics, shaders, scenes, migration, package ID, signing, saves or economy. Android 15+ already enforces edge-to-edge for applicable windows; remaining scene-level letterboxing, OEM compatibility mode, and cutout overlap must be assessed on a real device. Do not blanket-stretch canvases or disable UI safe-area constraints.

## Apply
Close Unity Editor, leaving the project files intact. Run from the pinned GitHub source using Python 3.11+:
```powershell
py -3 p13_fullscreen.py --self-test
py -3 p13_fullscreen.py
```
Default project: C:/DA4/build-002/QA/UnityProject. It must contain the user's P12 local edits (no Development option, QA app name removed, legacy package query and hasLegacyApp). Override --unity only with the actual 6000.6.10f1 executable. The runner backs up affected settings and records SHA-256 evidence under C:/DA4/artifacts/P13-01-<timestamp>. It installs a new editor integration, applies settings, checks them, and invokes the existing local non-development QA builder. The output APK is uniquely named; no prior APK is overwritten. --apply-only skips the APK build. The pre-build check prevents fullscreen settings from drifting on future modern Android builds. Never run the older hash-locked reconstruction on this edited working project.

## Acceptance
- Python fixture self-tests pass; these are not Unity tests.
- Unity process exits zero and logs P13_FULLSCREEN_SETTINGS_PASS and (for build) P13_FULLSCREEN_APK_BUILD_PASS; verify APK identity, signature and install.
- Compare lobby, tutorial, arena, results and skins at 16:9 and approximately 20:9, with notch on either side. Background fills the available window; critical buttons, HUD and joystick remain within safe area. No distortion or inaccessible controls.
- Verify hidden status/navigation bars and transient swipe behavior; test Home/resume, rotation, keyboard, legacy migration and back gesture. Existing progress remains intact.
- If black edges remain, inspect actual Resolution Scaling Mode and runtime camera rect, Screen.safeArea and Canvas Scaler on the private project before targeted edits.
- No AAB, release, PR #4 merge, production signing, vendor assets or private save data are included in this patch.

References: https://docs.unity.com/en-us/engine/6000.6/manual/platform-specific/android/getting-started/class-player-settings ; https://developer.android.com/develop/ui/views/layout/immersive .
