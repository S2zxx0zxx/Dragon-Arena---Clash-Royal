# Dragon Arena — Android Preview

This is a debug-signed **testing APK**, not a Play Store release. Package: `io.dragonarena.preview`; label: Dragon Arena Preview. It uses native Android WebView to display the existing WebGL2 game, not a fully native Unity/Unreal engine.

## Install
Download `Dragon-Arena-Android-Preview-v0.4.1.apk` from the GitHub prerelease, install it by allowing the browser or Files app to install unknown apps, and launch in landscape mode. Test Home, 3D models, touch joystick, local arena, collisions, revive/results, Creature Lab, and Shop.

## Notes
- Android 8+; WebGL2 support depends on Android System WebView version, GPU and driver. Real-phone QA is required.
- All source game GLB and 2D assets are bundled to work offline. There are no live multiplayer, real checkout, rewarded ads or cloud services.
- GitHub Actions creates a debug signing key. Future CI APKs may require uninstall/reinstall and thus erase local demo data.
- Device feedback: capture screen, model, Android version, what happened, and what you expected.
- Do not merge to main until physical Android acceptance and visual-fidelity review pass.
- The third-party title “Clash Royale” must not be used for a public consumer game without rights clearance; repository path remains unchanged.
