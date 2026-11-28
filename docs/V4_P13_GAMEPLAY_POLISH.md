# P13 expanded gameplay polish — source review required
Status: requirements recorded; P13-02 through P13-06 not implemented. Do not merge or build as completed. P13-01 fullscreen integration exists but has not been native-tested.
User requested one combined patch, existing implementation only, no new game modes or unrelated features. Use local P12/P13 candidate C:/DA4/build-002/QA/UnityProject, not original purchased baseline or public v3 JavaScript. The public repo has hash manifests and documentation but not the actual private vendor scripts, scene serialization or prefab contents; inspect these first and record before/after hashes. Keep vendor source, assets, signing secrets and saves out of public Git.

| ID | Scope | Source-backed starting points |
| --- | --- | --- |
| P13-01 | Immersive fullscreen, responsive controls within safe area | Existing P13 fullscreen patch, CameraController, Game/Menu/Skins/Init scenes |
| P13-02 | Larger joystick and rocket/boost button, independent concurrent touch, smooth low-latency steering | PlayerController, GameController, serialized Game scene, joystick and boost callbacks; resolve actual touch implementation from source |
| P13-03 | Cake/donut food default for new installs only | SkinManager, FoodController, InitManager, DurablePrefs and food sprite references; six themes, 67 graphics documented |
| P13-04 | Progressive skin costs, slower but fair coin acquisition | SkinManager, ShopController, ShopItemController, SkinButtonController, DurablePrefs, GameoverPanel, WofController |
| P13-05 | Collision arbitration, NPC attack behavior and no accidental double deaths | PlayerController, BotController, Snake, BodypartController, GameController |
| P13-06 | Denser distributed bot/food spawn without breaking modes | BotSpawner, GameController, FoodController, IntroLoadingController |

## Proposed tuning (not applied)
- Joystick +35% visual diameter, rocket +30%; verify actual screen-space hit regions, margins and safe area. Existing pointer IDs must remain independent; release/cancel/focus loss clears only the appropriate touch. Tune actual steering response from source and measured device behavior; do not globally increase player speed.
- Select exact cake/donut theme by serialized sprite mapping (likely Sweets, not yet confirmed). If locked, grant only that theme to fresh profiles using existing transaction API. Preserve every existing profile selection, ownership and coin balance. No global PlayerPrefs reset.
- Thirteen skin slots documented. Proposed displayed/debited price curve in existing catalog order: 0, 0, 2000, 3000, 5000, 10000, 20000, 50000, 100000, 200000, 350000, 500000, 1000000. Preserve actual free/owned entitlement; validate mapping before applying, use authoritative same price for UI and debit, no repurchase of owned skins. Review coin earnings across real matches before changing reward rates; preserve previously earned balances and avoid duplicate settlement.
- Proposed collision rule: player head vs NPC head -> NPC dies, player survives; NPC head into player body -> NPC dies; player head into NPC body -> player dies. NPC head into another NPC body -> striking NPC dies. Resolve simultaneous contacts deterministically through existing death guard; no repeated rewards or self collisions. This is a proposed interpretation of front/rear hits, not verified code. NPCs should sometimes misjudge interception/avoidance; do not make player invincible or make every NPC suicide.
- Preserve mode constraints from P03: Quick Play 25 bots/600 food/120s baseline; Infinity replenishes/respawns; Boss Hunt starts 100 body parts, no food; Ghetto 300 food without replenishment; Royale 80 bots/500 food/no respawns. Tune bounded populations, staggered spawn, spacing, retries and performance; do not respawn eliminated Royale bots or add food to Boss Hunt. Test 25/80 bot budgets before raising counts.

## Required local intake
Collect actual C# scripts and serialized scene/prefab text and GUID metadata, plus exact Unity version and current integration files. Read-only intake must exclude art binaries, private keys, Library cache, account credentials and game save files. User may share the reviewed source privately if authorized. Do not commit extracted vendor sources. Only commit original patch tooling and safe evidence.

## Gate before merge
Exact source anchors reviewed; rollback backup and hashes; no unrelated edits; Unity compile; QA APK signature/identity; physical device concurrent touch; fresh install default versus existing-profile preservation; all skin price/debit/ownership cases; single collision settlement and NPC interactions; 20-match all-mode test; FPS and spawn capacity; fullscreen and safe-area screenshots; release blockers from PR #4 remain in force. Main remains unchanged until verified and explicitly approved per existing release workflow.
