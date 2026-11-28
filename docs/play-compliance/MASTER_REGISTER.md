# Dragon Arena V4 — Play compliance master register
Reviewed 2026-11-28; 40 control groups, not a guarantee of approval or an exhaustive inventory of future Console prompts. The public QA scripts and v3 manifest are not production evidence. P13 R4 historical 20/20 emulator gameplay reported PASS; no repetition required. Physical QA owner-reported. PGS/cloud saves are new authorized scope. No release-hold bypass.
Statuses: OPEN = evidence missing; BLOCKED = access/implementation dependency; QA_ONLY = historical evidence only; DRAFT = prepared not implemented/submitted; CONDITIONAL = resolve applicability; FUTURE = later stage. No final PASS assigned without exact release evidence. Record evidence location, version, reviewer and date per row; resolve conditional rows explicitly, never use blanket N/A.
 
| ID | Control | Required evidence | State |
|---|---|---|---|
| DA-POL-01 | Developer identity, legal/contact email and required phone/device verification | Console verification | OPEN |
| DA-POL-02 | Developer Distribution Agreement, app record, permanent package ID, game category, pricing, countries, trader declaration as applicable | Console screenshots/record | OPEN |
| DA-POL-03 | Signed production AAB, unique versionCode, Play App Signing, correct upload key, SHA-256 | Signed bundle and certificate verification | BLOCKED |
| DA-POL-04 | Target API >=36 for new handheld app; min API consistent with listing | Final manifest | QA_ONLY |
| DA-POL-05 | ARM64 native support, all native libraries ELF alignment and 16 KB bundle/APK packaging and compatibility | Bundletool/ELF evidence | QA_ONLY |
| DA-POL-06 | Non-debuggable release; no test endpoints, developer shortcuts or QA application ID | Final manifest/build provenance | OPEN |
| DA-POL-07 | Privacy policy publicly readable non-editable HTTPS page, no PDF/geoblock; app and Console links | Published URL and in-app screenshot | DRAFT |
| DA-POL-08 | Privacy contact, controller identity, all data types/purposes/recipients, security, retention/deletion, regional rights | Final policy matched to binary | DRAFT |
| DA-POL-09 | Complete Data Safety on closed track; include all app and SDK data across applicable versions/regions | SDK inventory and completed form | DRAFT |
| DA-POL-10 | PGS v2 platform authentication only, guest/offline available; correct OAuth IDs and Play signing SHA-1 | PGS configuration and targeted evidence | BLOCKED |
| DA-POL-11 | Saved Games enabled; validated restore, conflict handling, no cross-profile leaks or overwrites | Targeted sync evidence | BLOCKED |
| DA-POL-12 | Data deletion questions; determine whether app creates an app account (including SSO); if yes, in-app and external functional account/data deletion | Architecture review + actual deletion flow | OPEN |
| DA-POL-13 | Implement voluntary game-progress deletion for PGS and local saves; prevent sync resurrection; confirm scope and failures | Deletion evidence and public instructions | DRAFT |
| DA-POL-14 | SDK inventory and versions, dependencies, Unity services and Google PGS data disclosures, Play SDK Index warnings | Gradle resolved dependency report, SDK docs | OPEN |
| DA-POL-15 | Network/data flow audit, HTTPS transport, no secrets in bundle, applicable consent before unexpected sensitive collection | Endpoint and source/manifest evidence | OPEN |
| DA-POL-16 | Permissions minimal; justify Internet/network and SAF; no unnecessary location, storage, contacts, SMS, camera, microphone, accessibility, all-files or package visibility | Merged manifest; console declarations if needed | OPEN |
| DA-POL-17 | Ads declaration based on actual SDK and behavior (including rewarded/interstitial/native ads) | SDK and UI inspection | OPEN |
| DA-POL-18 | Advertising ID declaration and permission, identifier handling and consent if used | Merged manifest and SDK configuration | OPEN |
| DA-POL-19 | If monetized: Play Billing for digital purchases unless valid exception/program; no external payment bypass; current supported billing library | SKU/SDK/config review | CONDITIONAL |
| DA-POL-20 | Wheel of Fortune/loot boxes: inspect random reward odds, paid inputs, no real-world redemption; disclose odds near paid random purchase | Rules and actual UI | OPEN |
| DA-POL-21 | IARC questionnaire: fantasy violence, blood, fear, language, chance mechanics, purchases, interaction and sharing answered accurately | Final visuals and mechanics + IARC certificate | OPEN |
| DA-POL-22 | Target audience based on art, marketing and actual design; do not pick older ages just to evade Families | Owner/audience evidence | OPEN |
| DA-POL-23 | If children included: Families policy, appropriate SDKs/ads, identifiers, age handling and data collection restrictions | Families review | CONDITIONAL |
| DA-POL-24 | App access: full offline reviewer access; disclose PGS-only cloud feature and provide legitimate reviewer instructions if restricted | Console App access form | DRAFT |
| DA-POL-25 | Financial features: none only if actual release has no applicable finance/token features; game coins not cash | Feature and monetization inventory | OPEN |
| DA-POL-26 | Health declaration: no health features only after review | App content form | OPEN |
| DA-POL-27 | Government app declaration: no if not government-affiliated | App content form | OPEN |
| DA-POL-28 | Other Console prompts applicable to distribution, permissions and feature set; do not blindly mark N/A | Complete Console App content review | OPEN |
| DA-POL-29 | Asset rights: purchased package EULA, invoice, seat/extension terms, music, fonts, plugins, generated assets and promo rights; no vendor source redistribution | Private license register | OPEN |
| DA-POL-30 | Trademark/name and branding clearance; avoid third-party names/logos/impersonation | Name/asset provenance search | OPEN |
| DA-POL-31 | Store title <=30 chars, short description <=80, full <=4000, accurate features and offline/NPC description | Listing draft and final review | DRAFT |
| DA-POL-32 | 512x512 icon, 1024x500 feature graphic, at least 2 real screenshots and appropriate formats; no ranking or fake claims | Final artwork and screenshots | OPEN |
| DA-POL-33 | Support email, privacy URL, optional website; functioning links and real support process | Console + URL checks | OPEN |
| DA-POL-34 | Prohibited content, deceptive behavior, spam/repetitive content, device abuse, malware, external code download review | Source and store asset audit | OPEN |
| DA-POL-35 | Crash-free meaningful experience, navigation and compatibility; reuse 20/20 R4 gameplay evidence, distinguish owner-reported physical QA | Existing QA and targeted new-feature results | QA_ONLY |
| DA-POL-36 | Play Console pre-review checks and pre-launch report; address actual blocking issues only | Console report | OPEN |
| DA-POL-37 | Closed testing release and genuine >=12 continuous opted-in testers for >=14 days if applicable; document genuine feedback | Track and feedback evidence | OPEN |
| DA-POL-38 | Production access application and review, staged production release, Android vitals and support | Console approval | FUTURE |
| DA-POL-39 | Applicable regional privacy/consumer/children laws and EEA/UK trader status; verify before enabling markets | Country/age/monetization review | CONDITIONAL |
| DA-POL-40 | Review changes in policy and SDK disclosure on updates; immutable release evidence and rollback/update plan | Release register | DRAFT |

## Critical project-specific observations
- At frozen public head be91a36012a3b556880908541751eb518dae52e9, unity-integration/Editor/PreviewBuild.cs uses QA package io.dragonarena.unityqa and buildAppBundle=false; its public configuration cannot substitute for private production build.
- Public unity-integration/Packages/manifest.json is an incomplete baseline; private P13 R4 source includes subsequent changes. No PGS runtime code/configuration or signed production AAB available here.
- P13 report names WheelOfFortunePanel. Do not assume it is gambling, free-only, or paid; verify the actual flow, currency acquisition and payout. No real-money redemption is proposed.
- Existing private asset package was purchased according to project history. Purchase alone is not evidence of every commercial redistribution right. Never publish vendor source/license keys.
- Proposed first release scope: Android, offline-first NPC game, PGS v2 + saved games; no separate accounts, no unnecessary SDKs, no new monetization or social feature without owner decision. Existing monetization must be audited before any declaration.
- Age rating is not the same as target audience. No guaranteed age rating or 13+ selection; inspect actual game and marketing.
- Privacy draft and data deletion design in this folder are not yet public policies or implemented features. Finalize after binary audit and support contact confirmation; publish functional HTTPS pages and add in-game links.
- Before closed-testing submission: resolve all applicable pre-upload groups, document legitimate deferrals, and preserve existing release gate. Console account and AAB unavailable at this checkpoint.
- Before public production: genuine closed-test participation, feedback and Google production approval. Do not claim approval guaranteed.

## Official references (reviewed 2026-11-28)
- Developer policy: https://support.google.com/googleplay/android-developer/answer/18265346
- App content: https://support.google.com/googleplay/android-developer/answer/9859455
- User data: https://support.google.com/googleplay/android-developer/answer/10144311
- Data safety: https://support.google.com/googleplay/android-developer/answer/10787469
- Account deletion: https://support.google.com/googleplay/android-developer/answer/13327111
- PGS disclosure: https://developer.android.com/games/pgs/data-collection
- PGS saved games: https://developer.android.com/games/pgs/unity/saved-games
- Target API: https://developer.android.com/google/play/requirements/target-sdk
- 16 KB: https://developer.android.com/guide/practices/page-sizes
- Families: https://support.google.com/googleplay/android-developer/answer/9893335
- Target audience: https://support.google.com/googleplay/android-developer/answer/9867159
- Content ratings: https://support.google.com/googleplay/android-developer/answer/9859655
- Intellectual property: https://support.google.com/googleplay/android-developer/answer/9888072
- Ads: https://support.google.com/googleplay/android-developer/answer/9857753
- Payments: https://support.google.com/googleplay/android-developer/answer/9858738
- Metadata: https://support.google.com/googleplay/android-developer/answer/9898842
- Graphics: https://support.google.com/googleplay/android-developer/answer/9866151
- Closed testing: https://support.google.com/googleplay/android-developer/answer/14151465
- SDK requirements: https://support.google.com/googleplay/android-developer/answer/13323374
- Financial features: https://support.google.com/googleplay/android-developer/answer/13849271
- Health declaration: https://support.google.com/googleplay/android-developer/answer/14738291
- Device verification: https://support.google.com/googleplay/android-developer/answer/14316361
- Developer identity: https://support.google.com/googleplay/android-developer/answer/10841920
- Quality: https://support.google.com/googleplay/android-developer/answer/9898783
