import test from 'node:test';
import assert from 'node:assert/strict';
import { DRAGONS, getDragonEffectiveStats, getUpgradeCost } from '../src/config/dragons.js';
import { SpatialHashGrid } from '../src/engine/spatial_grid.js';
import { ObjectPool } from '../src/engine/pool.js';
import { DragonArenaEngine, PHYSICS } from '../src/engine/physics.js';
import { signSaveEnvelope, verifySignedEnvelope } from '../src/systems/storage_security.js';
import { DRAGON_PASS_TIERS, getPassTier, buildLeagueStandings } from '../src/systems/dragon_pass.js';
import { sanitizeSave, upgradeDragon, openDragonCrate, recordMatchResult, unlockPremiumPass, claimDragonPassTier } from '../src/systems/progression.js';

test('1. All 24 dragons have unique IDs and scaling stats by rarity & Lv.1-5 upgrade', () => {
  assert.equal(DRAGONS.length, 24);
  assert.equal(new Set(DRAGONS.map(d => d.id)).size, 24);
  const common = getDragonEffectiveStats('pebble_wisp', 1);
  const mythic = getDragonEffectiveStats('astra_leviathan', 1);
  assert.ok(mythic.powerScore > common.powerScore * 1.4);
  const lv5 = getDragonEffectiveStats('neon_dragonling', 5);
  assert.ok(lv5.powerScore > getDragonEffectiveStats('neon_dragonling', 1).powerScore);
  assert.ok(getUpgradeCost('astra_leviathan', 1) > getUpgradeCost('pebble_wisp', 1));
});

test('2. O(1) SpatialHashGrid & Zero-GC ObjectPool operate cleanly', () => {
  const grid = new SpatialHashGrid(8);
  grid.insert(10, 12, { id: 'a' });
  grid.insert(-50, -50, { id: 'far' });
  const hits = grid.queryRadius(11, 11, 4);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].id, 'a');

  const pool = new ObjectPool(() => ({ v: 0 }), 4, 8);
  const a = pool.acquire(); a.v = 99;
  assert.equal(pool.active.length, 1);
  pool.releaseAt(0);
  assert.equal(pool.active.length, 0);
  const b = pool.acquire();
  assert.equal(b, a, 'Pool must recycle existing object instance');
});

test('3. 60Hz physics + 6-archetype AI + Portals + Boost Pads + Destructible Pillars + Bounty + HitStop + Emotes', () => {
  const engine = new DragonArenaEngine({
    modeId: 'classic', seed: 424242, playerSkin: 'neon_dragonling', playerLevel: 3, playerName: 'Tester', dragons: DRAGONS,
  });
  assert.equal(engine.portals.length, 4);
  assert.equal(engine.boostPads.length, 6);
  assert.equal(engine.pillars.length, 4);

  const you = engine.players.find(p => p.id === 'you');
  assert.equal(engine.triggerEmote(you, 'crown'), true);
  assert.ok(you.emote.includes('👑'));

  // Test Destructible Pillar shatter via Fury
  const pil = engine.pillars[0];
  you.x = pil.x - 4; you.y = pil.y; you.angle = 0; you.fury = 100;
  engine.triggerFury(you);
  assert.equal(pil.alive, false, 'Fury blast must shatter Crystal Pillar');

  // Test Wanted Bounty 2x + Full Fury reward + 120ms Hit-Stop
  const rival = engine.players.find(p => p.isBot && p.alive);
  rival.isBounty = true;
  you.fury = 0;
  engine.killDragon(rival, 'cutoff', you);
  assert.equal(you.fury, 100, 'Killing a Wanted Bounty target must grant instant 100% Fury');
  assert.ok(engine.hitStopTimer >= 0.1, 'Player kill must trigger 120ms Hit-Stop micro-freeze');

  // Run 1200 ticks cleanly
  for (let i = 0; i < 1200; i++) engine.step(PHYSICS.fixedDt);
  for (const p of engine.players) assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
});

test('4. Battle Royale Storm Ring & Titan Hunt Boss mechanics', () => {
  const br = new DragonArenaEngine({ modeId: 'royale', seed: 99, dragons: DRAGONS });
  const r0 = br.currentRadius;
  for (let i = 0; i < 1500; i++) br.step(PHYSICS.fixedDt);
  assert.ok(br.currentRadius < r0 - 5);

  const bossMatch = new DragonArenaEngine({ modeId: 'boss', seed: 77, dragons: DRAGONS });
  const boss = bossMatch.players.find(p => p.isBoss);
  const you = bossMatch.players.find(p => p.id === 'you');
  assert.ok(boss);
  you.x = boss.x - 6; you.y = boss.y; you.angle = 0; you.fury = 100;
  bossMatch.triggerFury(you);
  assert.ok(boss.hp < boss.maxHp);
});

test('5. Tamper-Resistant Save Signature rejects forged coins & 30-Tier Dragon Pass + Leagues work', () => {
  const save = sanitizeSave(null);
  const env = signSaveEnvelope(save);
  assert.equal(verifySignedEnvelope(env).valid, true);

  // Simulate DevTools tampering
  env.data.coins = 9999999;
  assert.equal(verifySignedEnvelope(env).valid, false, 'Forged coin edit MUST fail integrity signature check');

  assert.equal(DRAGON_PASS_TIERS.length, 30);
  save.gems = 300;
  save.passXp = 1200; // Tier 4
  assert.equal(getPassTier(save.passXp), 4);
  assert.equal(unlockPremiumPass(save).ok, true);
  assert.equal(claimDragonPassTier(save, 1, 'free').ok, true);
  assert.equal(claimDragonPassTier(save, 1, 'premium').ok, true);

  const { league, standings } = buildLeagueStandings(save);
  assert.ok(league.name && standings.length >= 6);

  save.coins = 50000;
  assert.equal(upgradeDragon(save, save.ownedSkins[0]).ok, true);
  assert.equal(openDragonCrate(save, 'mythic').ok, true);
  const rec = recordMatchResult(save, { score: 2400, kills: 4, seconds: 110, rank: 1, modeId: 'classic', players: [] });
  assert.ok(rec.earnedPassXp > 0 && rec.earnedCoins > 0);
});
