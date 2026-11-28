# Dragon Arena V4 — Google Play closed-testing release handoff
Date: 2026-11-28. Owner instruction: freeze gameplay scope; do not repeat completed gameplay testing. This document is preparation, not a production release approval.

## Frozen candidate
- P13 R4 evidence: docs/V4_P13_COMBINED_EXECUTION.md at 3d21d172fbb8f427eadca71df216723ee9541fb8.
- Reported private QA APK: 40,293,307 bytes; SHA-256 a81a1544f97b59e75b25f455ee91a6eb875bb3fb5bd09aa52361c8f6964e257f; io.dragonarena.unityqa, 4.0.0/code16, min26/target36.
- Reported Unity 6000.6.10f1 build, 20/20 emulator matches across five modes, zero fatal errors, 1,078/1,078 asset reproducibility, QA save retention and 16 KB native alignment. Private bytes/logs not independently retrieved here.
- Physical-device results and full legacy migration are not documented in accessible evidence; owner states testing is complete and requests no repetition. Record as owner-reported, not independently PASS.
- Production upload keystore reportedly created in previous local execution; never publish or regenerate it unnecessarily.
- Production package ID, versionCode, signed AAB, signing fingerprint and exact production manifest are not verified. Do not upload QA APK or convert it into a claimed production bundle.
- Current public release gate is fail-closed. Retain until reviewed release evidence or explicitly approved non-mandatory deferrals are recorded.

## Store listing — proposed copy
App name: Dragon Arena
Short description: Grow your dragon, master the arena and conquer five thrilling game modes.
Full description:
Enter Dragon Arena, a dragon survival and arena action game. Steer your dragon, collect food, grow stronger and outmaneuver rival creatures.

Choose your challenge from Battle Royale, Quick Play, Infinity, Boss Hunt and Ghetto. Learn to time your boosts, avoid collisions and survive increasingly intense encounters. Earn coins as you play, discover skins and build your personal collection.

Features:
- Five distinct game modes
- Dragon growth and tactical movement
- Arena battles against computer-controlled opponents
- Unlockable skins and coin rewards
- Touch controls and saved progress

Compete for your personal best and master the arena at your own pace.

Release notes (en-US): First closed-testing release of Dragon Arena V4, featuring five game modes, dragon progression, skins, and updated arena controls.

Proposed category: Game / Action. Proposed default listing language: en-US. Pricing, countries, audience, ads and monetization require confirmation from actual release configuration/owner. Do not claim online multiplayer, advertising-free experience, no data collection, or real-money purchases without evidence.

## Submission evidence checklist
- Signed production AAB, SHA-256, application ID, versionName/versionCode, upload certificate fingerprint; bundletool validation; target API >=36, ARM64 and 16 KB compatibility; non-debuggable.
- Store graphics: actual release screenshots, 512x512 app icon, 1024x500 feature graphic. Do not use misleading screenshots or third-party branding.
- Privacy policy and support contact: confirm controller identity/contact and actual SDK/network/data behavior before publishing. Complete Data Safety, ads declaration, target audience, content rating, app access and applicable declarations based on final binary.
- Verify commercial redistribution rights for purchased assets and any SDKs; keep vendor files and credentials private.
- Confirm Play Console app record, signing enrollment, available version code and closed testing track.
- For applicable new personal accounts, maintain >=12 genuine opted-in testers for >=14 continuous days before applying for production access. Review and production access are separate steps.
- Keep main unchanged until required release approval and evidence. Integrate PR #5 into #4 branch first, then #4 into main; do not bypass release-hold checks.

Official references:
https://developer.android.com/google/play/requirements/target-sdk
https://support.google.com/googleplay/android-developer/answer/14151465
https://support.google.com/googleplay/android-developer/answer/9859348
https://support.google.com/googleplay/android-developer/answer/9859455

Status: listing copy prepared; submission not performed; signed AAB and private build access unresolved.
