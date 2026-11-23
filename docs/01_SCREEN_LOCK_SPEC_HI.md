# Screen-by-screen visual contract — 10 screens, same premium game look

**Visual precedence:** v2 PRIMARY, v1 secondary. Screenshot panel coordinates and canonical names are in `SCREEN_LOCK.json`. All relative placements below refer to a 1920×1080 **logical 16:9 landscape canvas**, not screenshot-montage panel pixels. All gameplay/control elements must remain inside actual device safe areas; reflow side panels for wider/taller phones rather than scale/stretch bitmaps.

### GLOBAL VISUAL LOCK (all screens)
- Background: deep cosmic navy and royal violet, gradients with luminous cyan and magenta crystals.
- Main character: glistening **3D blue/purple crystal dragon** with expressive readable face, gemstone horns, layered light-refracting body segments, curved luminous tail. Not an emoji, a flat SVG, a generic worm, or the low-poly prototype head.
- 3D lighting: key cyan upper-left, magenta fill from opposite side, gold rim/selection for legendary rarity. Accurate stylized normals/specular, subtle emissive edges, shadow/AO and animated ambient particles. Avoid distracting bloom that obscures scoreboard text.
- UI: chunky arcade buttons with bevels, gloss, metallic colored rim, inner shadows, readable labels, unmistakable pressed/disabled states. No dashboard/web form visual language.
- Text: bold condensed headline treatments with a light glow/shadow, crisp HUD font. Poster typography is visual inspiration, not an identified or licensed font file.
- 3D depth follows physically coherent layering; make primary CTA dominant and avoid many equally bright panels.
- Touch targets ≥48 CSS px at rendered size. Every action has busy/disabled/error states. Screen-safe margins need empirical Android QA.

## S00 — Splash / Loading
**V2 poster panel:** top left. Crystal environment, distinctive custom gold/cyan logo, large crystal pillars, shimmering rim, animated loading progress at lower center. Full-bleed 3D scene and logo, no website navbar. Finite initialization with transparent WebGL fallback/error; no fake progress spinner. In standalone runtime, Enter is a prototype gate (not a desired production extra step).

## S01 — First-run Terms & Privacy
**V2 poster panel:** top middle. Purple crystalline full-screen overlay, ornate shield emblem, high-contrast central modal with readable Terms/Privacy links and acceptance CTA. Consent state stored only with correct legal version; links must open actual documents when deployed. No prechecked marketing consent. Current prototype is a clearly labeled demo notice, not legally complete Terms.

## S02 — Main Lobby / Home
**V2 poster panel:** top right. This screen MUST feel like a game lobby, never a product website.
- **Top-left** 3D creature portrait, player name, level, illuminated progress strip.
- **Top-right** three resource counters, plus icons, settings gear.
- **Left vertical** events, missions, rewards, ranking (compact glowing game tiles).
- **Center-left 45–50%** live hero-quality 3D crystal dragon, animated idle, rotating/floating above illuminated round crystal podium. This is the largest visual element.
- **Right** huge gold Play Arena button, below quick-play, friends, practice buttons.
- **Bottom** Creatures, Workshop, Shop, Inventory navigation with bold glossy game button shapes.
- Camera focal point is dragon's face. Dynamic creature selection updates live GLB model and its pedestal lighting. No placeholder 2D hero.

## S03 — Arena / Live Match
**V2 poster panel:** second row left. Actual 3D ground plane, many collectible objects floating **as meshes**, visible enemy crystal dragons with articulated chain segments, physically correct head movement and camera-follow.
- Leaderboard compact at upper left, quest/mass progress upper center, currency plus pause top right, minimap upper right.
- Moving 3D dragon is playable, not a background image; food comes from the ten actual GLB food models.
- Main left virtual joystick, boost and 3 power-up buttons along bottom. Mobile touch drag, mouse aim, keyboard fallback.
- Arena camera: steep overhead angled perspective/ortho; keep gameplay heads visually identifiable, collisions deterministic.
- AI bots can play locally; current players are **not real online users**. Do not claim 134 online players from poster.

## S04 — Death / Last Chance
**V2 panel:** second row middle. Background arena dimmed; 3D character-specific breakup burst visible behind bold purple panel; central countdown ring, rank and earned mass, large glossy revive choice and clear Skip/Result link. All purchasable/rewarded/ad choices must reflect actual SDK confirmation; no ghost 'watch ad' promises.

## S05 — Results
**V2 panel:** second row right. Gold trophy as a high-quality sculpted icon/mesh or an art-approved 3D render, spotlight and crystalline plinth. Display actual rank, collected mass, defeated count, survival time, XP; Share / Restart / Home buttons. XP/coins are awarded exactly once after a match and revives must never duplicate reward settlement.

## S06–S09 — Shop (four TABS on one screen, no duplicated page implementations)
**V2 panels:** bottom row four panels. Shared cosmic arcade Shop with high contrast colored currencies, proper tab selection, close top right, rich 3D product cards. Card title, volumetric 3D emblem, quantity, price label, purchase/claim state and explicit confirmation.
- **S06 Special Offers:** free chest, No Ads, best-deal theme; exactly one source of SKU truth. Current prototype intentionally marks real-money SKUs unavailable.
- **S07 Energy:** five/20/100/infinite resources are references only. Gameplay should remain accessible even without purchasable energy. Do not hardcode poster prices as products.
- **S08 Coins:** free demo earn + coin pack tiers; build actual purchase only after Play Billing integration and policy review.
- **S09 Power-ups:** magnet, speed, shield icons, item quantity, local inventory updates. Shield not shown as functional until collision immunity is implemented and tested.

## REQUIRED SECONDARY ROUTES NOT SHOWN IN THE TWO SHEETS
Character Lab (all 24 real 3D models), Inventory, Missions, Profile, Settings, Rewards, Leaderboard, Events, Friends, matchmaking, pause, tutorial, connectivity, checkout confirmations, restore purchases, account/privacy settings. These must each receive a **separate approved visual screen design** before visual-fidelity COMPLETE can be claimed. The current runtime uses clearly identified simple functional placeholders for these screens.

## Animation contracts
- **Home idle:** breathe (0.15 amplitude), head angle shift ±6°, gentle oscillation (3–5 s), slow particle halo (keep >30 fps mobile).
- **Movement:** body follows arc-length history from head; head turns at capped angular rate; each segment rotates along tangent; no gaps/excess overlap.
- **Food:** stationary in XZ with float animation ≤0.1 world units; deterministic pickup mass; UI mass/score updates immediately.
- **Death:** each skin ID maps to `death_effects/configs/{skin}.json` and a 3D peak GLB; production must implement timed particle/mesh breakup and screen-space feedback. Existing kit's 3D peak mesh is not a complete animated sequence.
- **Revive:** brief camera push-in, animation state reset, temporary safe spawn (PENDING); no invulnerability claim in prototype.
- **Result:** trophy reveal with 0.6–1.0 s easing; numbers count up only after committed reward calculation.
- **Shop:** selected tab changes in under 200 ms; no animated transitions that delay actual purchase state validation.
