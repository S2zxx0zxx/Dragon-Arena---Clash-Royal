# V4 release requirement: Play Games automatic authentication and cloud saves

Owner decision, 2026-11-28: Google Play Games Services v2 is the only user-visible sign-in mechanism. No Google Sign-In button, email/password, phone OTP, Facebook, separate registration, or mandatory login screen. Do not repeat completed gameplay tests. This is the sole newly authorized functional release scope.

## Required behavior
- Use Google's supported Play Games Services v2 Unity plugin (verify compatible release >=2.1.0), initialize on Android startup and listen via PlayGamesPlatform.Instance.Authenticate(callback). No separate credentials or manual login UI. OS-controlled first-time account/profile setup may appear. Authentication failures must never prevent offline gameplay.
- Keep native local two-generation save as authority for offline play. Preserve old saves, schema and migration path; no destructive resets. No network dependency during play.
- Enable Play Games Services Saved Games in Play Console and integrate official Unity ISavedGameClient snapshot read/write (OpenWithManualConflictResolution, ReadBinaryData, CommitUpdate). Restore only validated snapshots after sign-in, before publishing a new empty local save. Sync after committed local state changes and on resume/pause as feasible; coalesce writes, bounded retry, retain pending local saves across failures; never block gameplay.
- Restore coins, XP, unlocked/selected dragon skins, food skins, mode progress, best scores and match counters if present in the actual native schema. Do not invent fields or alter economy. Preserve full canonical state, schema version, revision and integrity validation; do not collect email or credentials.
- Do not use the PGS player ID as a primary in-game account or inventory authentication token. No additional user-facing identity provider is authorized. Maintain local game profile identity separately; use the platform-authorized Saved Games scope for personal game-state backup, not a competitive or monetized account ledger. Do not claim cross-platform or server-authoritative account recovery. If future server-backed accounts or purchases require independent authentication, seek a separate design decision.
- On profile/account changes, isolate saves by platform context, preserve unsynced local data, never upload another user's progress. For divergent local and cloud data, present a minimal progress-choice dialog showing meaningful summary; do not silently choose highest currency, merge balances, overwrite or duplicate rewards. Validate checksum, bounded size, version, malformed data and future schema handling. Keep both copies until an explicit resolution succeeds. No automatic overwrite from a new empty profile.
- If PGS unavailable, signed out or offline, save locally and communicate that cloud backup is unavailable; restore/sync when authenticated. No guarantee of recovery after uninstall before a successful cloud sync.

## Release wiring
- Private P13 R4 Unity project required for actual integration into the existing boot/save lifecycle. Public repository contains integration tooling, not the purchased runtime source.
- Confirm permanent production application ID and Play Console PGS game project; enable Saved Games, configure Android OAuth credential with the matching package and Play app-signing SHA-1 (test/upload signer separately as applicable), generate/import correct Unity resource definitions, configure PGS testers and publish PGS configuration as appropriate. Never commit private signing material, invent IDs or mark configuration complete without evidence.
- Audit SDK data handling and update privacy policy / Data Safety declarations based on actual integration. Do not claim no data collection without inspection. Keep existing release-hold checks fail-closed.
- Only new targeted acceptance: automatic auth, offline/no-profile fallback, restore after reinstall on a signed-in test account, cloud/local conflict, account isolation, failed-sync recovery and no duplicate rewards. Do not rerun the completed 20-match gameplay soak. Actual signed AAB evidence still required.

## Official references
https://developer.android.com/games/pgs/unity/unity-start
https://developer.android.com/games/pgs/platform-authentication
https://developer.android.com/games/pgs/savedgames
https://developer.android.com/games/pgs/unity/saved-games
https://developer.android.com/games/pgs/unity/migrate-to-v2

Status: OWNER_REQUIREMENT_RECORDED; runtime integration and Console configuration NOT VERIFIED / BLOCKED_PRIVATE_SOURCE_AND_PGS_CONFIGURATION. No live authentication or cloud save claimed.
