# Data Safety and App Content — internal answer worksheet
NOT submitted. Do not copy unverified answers into Play Console. Source: PGS disclosure updated 2026-06-16, reviewed 2026-11-28. Map to the actual Console questions and final release version.
 
| Data / feature | Expected scope | Candidate purpose / evidence |
|---|---|---|
| Gamer identity (gamertag/avatar; inspect player ID handling) | PGS SDK automatic | App functionality/account management as applicable; assess identifiers and personal info categories |
| Gameplay state / scores / XP / virtual coins / skins | Local, plus cloud if sync enabled | App functionality; distinguish local-only from transmitted data |
| Analytics and diagnostics | PGS SDK automatic | SDK reliability; identify actual collected fields and Console categories |
| Saved screenshot / friends / leaderboards / achievements | Not authorized as extra scope; verify actual use | Do not declare absent before inspection |
| Email, phone, precise location, contacts, microphone, camera | Not requested for gameplay design | Confirm final manifest and SDK data behavior |
| Support correspondence | If support receives it | Privacy inquiries; include applicable handling in privacy policy |
| Ads, AAID, purchase history, payment data, Unity Analytics, crash reporting | Unknown | Inspect final dependencies, consent/config and actual flows |
 
For each transmitted data type record collection, sharing under Google definitions (including service-provider exceptions), optional/required, purpose, ephemeral handling, encryption, deletion, retention and evidence. No blanket 'no data collected', 'no sharing', or 'encrypted at rest' claim. Google PGS HTTPS is not proof all app traffic is encrypted.
 
Proposed App Content answers requiring release review:
- App access: offline core game accessible without account; describe PGS cloud restrictions honestly and provide reviewer access instructions where needed.
- Ads/Advertising ID: TBD, actual SDK/manifest required.
- Target audience and IARC: TBD, inspect fantasy combat, wheel, reward/purchase flows and marketing; do not invent rating.
- Health: no features if confirmed. Government: no if confirmed. Financial features: none if confirmed (virtual non-cash coins not a financial service).
- Account creation: distinguish platform authentication from developer-provided in-game account, even when automatic/SSO; do not conclude exemption solely because no signup screen. If account exists, in-app and web account/data deletion mandatory.
- Data deletion: answer actual implemented deletion, not intended design.
- Other prompts (permissions, applicable country/age requirements): complete every displayed item, with evidence.
 
Review with actual release package, store listing, privacy policy and Play Console before submission.
