# Gameplay, collision, growth, economy and online architecture

## Existing local simulation specification (source of truth: `app/manifest/game_assets.json`)

| Parameter | Prototype value |
|---|---:|
| Arena | 180×180 world units |
| Starting chain | 8 nodes |
| Minimum chain | 6 nodes |
| Cap | 220 physical nodes |
| Body center spacing | 0.62 world units |
| Max centerline length | (220−1)×0.62 = **135.78** world units |
| Add node | each **3 mass** after initial 8 |
| Base speed | 4.9 units/s |
| Boost speed | 7.3 units/s |
| Turn cap | 3.7 rad/s |
| Head collision radius | 0.46 units |
| Body collision radius | 0.38 units |
| Death drop | 65% of earned mass, bundled into collectible particles |
| Simulation | fixed 60 Hz |
| Suggested arena entity budget | 12 target / 20 tentative upper players; **not performance-tested** |

The 3D skins are **cosmetic**: collision radii, speed, turn rate, head-head arbitration and pickup values do not increase with rarity, price or XP. The current cap is a prototype balancing parameter, not a guarantee of fun or performance.

### Game state machine

`SPLASH` → `CONSENT` (first run) → `HOME` → `LOADING_MATCH` → `PLAYING` → `DYING` → `REVIVE_WINDOW` → (`PLAYING` if valid revival, else `RESULTS`) → `HOME` or new match.

Shop and Creature Lab are independent navigations from Home. A player must not be placed inside a new multiplayer match by simply returning from Shop. Pause is local-only; real multiplayer cannot pause an entire server room.

### Death / reward correctness

- Head-to-body collision kills the colliding player; valid death-credit goes to the body owner, not an unrelated nearby entity.
- Simultaneous head-head contact kills both under one atomic tick in the local prototype.
- Death is idempotent; one death event, one food drop event, one final result settlement.
- Available drop mass is bounded and conserved by bundling pellets; do not spawn infinite particles based on mass.
- Body mass stays separate from currency; scoreboard current-match points stay separate from permanent coins/XP.
- Revive should preserve fair mass and score and spawn at a validated safe position; **safe-spawn and temporary immunity are NOT implemented** in this prototype and require a QA task.
- Ranking UI draws from simulation results; poster names/scores are fake reference values and must never ship.

### Offline now / Online later

- Now: 1 local player and 7 simulated bots, deterministic local physics, no backend, no other real humans. Persistence is guest localStorage only.
- Planned online: authoritative server 60 Hz or validated 30/60 hybrid; input sequence + reconciliation, server-side collision and pickups; room matchmaking; WebSocket transport; session reconnect; account/guest auth; rate limits and anti-abuse; separate social chat moderation policy.
- Never claim real-time 134 players or global ranking from the poster when running a local test arena.
- Online bandwidth/performance targets require profiling with actual bots and real mid-tier Android devices, not assumed from the 20-player planning recommendation.

### Economy / commercial limitations

- Screenshot `₹` amounts are **visual reference prices, not approved SKUs**. No product IDs, entitlement rules, Play Billing integration, tax handling, regional price configuration or purchase acknowledgement have been verified.
- Prototype Shop uses demo currency and disables real-money checkout/ad rewards. Cosmetics should not make hitboxes smaller, movement faster or confer paid unfairness.
- Final store must have idempotent purchase fulfillment, refund/revocation, pending-state recovery, pricing disclosures, parental/age suitability, ads consent/child-safety review where required, and Play Store policy review.
- For an India-first zero-budget launch: make monetization optional, prioritize user retention and reliable matches over aggressive ad interruptions or pay-to-win.
