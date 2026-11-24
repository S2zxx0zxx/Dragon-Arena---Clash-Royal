/**
 * Dragon Arena v3.0 — Self-Healing Signed Progression, Dragon Pass, Upgrades & Crates
 * Backed by Tamper-Resistant IndexedDB + localStorage Integrity Envelope.
 */

import { DRAGONS, getDragonById, getUpgradeCost } from '../config/dragons.js';
import { writeSecureSave, readLocalMirrorSync, readIndexedDBSave } from './storage_security.js';
import { DRAGON_PASS_TIERS, PASS_PREMIUM_GEM_COST, getPassTier } from './dragon_pass.js';

const ENERGY_MAX = 20;
const ENERGY_REGEN_MS = 180_000;

export const DAILY_MISSIONS = Object.freeze([
  { id: 'matches', title: 'Colosseum Contender', desc: 'Complete 3 arena matches today', icon: '⚔️', target: 3, reward: { coins: 350 } },
  { id: 'score', title: 'Sovereign Hoarder', desc: 'Earn 2,500 total score today', icon: '💠', target: 2500, reward: { coins: 500 } },
  { id: 'kills', title: 'Apex Hunter', desc: 'Eliminate 4 rival dragons today', icon: '🔥', target: 4, reward: { gems: 12 } },
  { id: 'lab', title: 'Dragon Forge', desc: 'Inspect or upgrade in Dragon Lab', icon: '🐉', target: 1, reward: { coins: 200 } },
]);

export const WEEKLY_EVENTS = Object.freeze([
  { id: 'wk_score', title: 'Imperial Harvest', desc: 'Accumulate 12,000 score this week', kind: 'score', target: 12000, reward: { gems: 40 } },
  { id: 'wk_kills', title: 'Dragonfall Tournament', desc: 'Eliminate 15 rivals this week', kind: 'kills', target: 15, reward: { coins: 2200 } },
  { id: 'wk_matches', title: 'Citadel Endurance', desc: 'Complete 8 matches this week', kind: 'matches', target: 8, reward: { gems: 30, coins: 800 } },
]);

export const MILESTONES = Object.freeze([
  { id: 'ms_first', label: 'First Blood', icon: '⚔️', kind: 'matches', target: 1, reward: { coins: 400 } },
  { id: 'ms_five', label: 'Arena Veteran', icon: '🛡️', kind: 'matches', target: 5, reward: { gems: 20 } },
  { id: 'ms_kills10', label: 'Dragon Slayer', icon: '👑', kind: 'kills', target: 10, reward: { gems: 35 } },
  { id: 'ms_score15k', label: 'Astral Legend', icon: '🏆', kind: 'score', target: 15000, reward: { coins: 3500 } },
  { id: 'ms_wins3', label: 'Crown Holder', icon: '💎', kind: 'wins', target: 3, reward: { gems: 50 } },
]);

export const LOGIN_REWARDS = Object.freeze([
  { coins: 300 }, { gems: 10 }, { coins: 600 }, { gems: 18 },
  { coins: 1000 }, { gems: 30 }, { coins: 2000, gems: 40 },
]);

export const utcDay = (d = new Date()) => new Date(d).toISOString().slice(0, 10);
export function utcWeekId(d = new Date()) {
  const t = new Date(d);
  t.setUTCHours(0, 0, 0, 0);
  t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7));
  return utcDay(t);
}

export function createDefaultSave() {
  const today = utcDay(), week = utcWeekId();
  return {
    version: 3,
    name: 'DragonLord',
    level: 1,
    xp: 0,
    coins: 6500,
    gems: 150,
    energy: ENERGY_MAX,
    energyAt: Date.now(),
    skin: 'neon_dragonling',
    ownedSkins: ['pebble_wisp', 'leafling', 'neon_dragonling'],
    dragonLevels: { pebble_wisp: 1, leafling: 1, neon_dragonling: 1 },
    inventory: { magnet: 3, speed: 3, shield: 3 },
    arenaTheme: 0,
    selectedMode: 'classic',
    tutorialDone: false,
    passXp: 0,
    passPremium: false,
    passClaimedFree: [],
    passClaimedPrem: [],
    dailyChestDay: null,
    dailyEnergyDay: null,
    bestGhostRun: [],
    career: { matches: 0, kills: 0, score: 0, wins: 0, best: 0, playSeconds: 0, cratesOpened: 0 },
    history: [],
    daily: { day: today, values: { matches: 0, score: 0, kills: 0, lab: 0 }, claimed: [] },
    weekly: { id: week, values: { matches: 0, score: 0, kills: 0 }, claimed: [] },
    milestonesClaimed: [],
    login: { lastDay: null, streak: 0 },
    settings: {
      masterVol: 0.85, bgmVol: 0.55, sfxVol: 0.85, haptics: true,
      graphics: 'high', cameraStyle: 'dynamic3d', controlStyle: 'dynamic', showFps: false,
    },
  };
}

export function sanitizeSave(raw) {
  const def = createDefaultSave();
  const s = (raw && typeof raw === 'object') ? { ...def, ...raw } : def;
  s.coins = Math.max(0, Math.min(99_999_999, Math.floor(Number(s.coins) || 0)));
  s.gems = Math.max(0, Math.min(9_999_999, Math.floor(Number(s.gems) || 0)));
  s.level = Math.max(1, Math.floor(Number(s.level) || 1));
  s.xp = Math.max(0, Math.floor(Number(s.xp) || 0));
  s.passXp = Math.max(0, Math.floor(Number(s.passXp) || 0));
  s.passPremium = Boolean(s.passPremium);
  if (!Array.isArray(s.passClaimedFree)) s.passClaimedFree = [];
  if (!Array.isArray(s.passClaimedPrem)) s.passClaimedPrem = [];
  s.energy = Math.max(0, Math.min(ENERGY_MAX, Math.floor(Number(s.energy ?? ENERGY_MAX))));
  s.energyAt = Number(s.energyAt) || Date.now();
  if (!Array.isArray(s.ownedSkins) || !s.ownedSkins.length) s.ownedSkins = [...def.ownedSkins];
  if (!DRAGONS.some(d => d.id === s.skin)) s.skin = s.ownedSkins[0];
  s.dragonLevels = { ...def.dragonLevels, ...(s.dragonLevels || {}) };
  s.inventory = { ...def.inventory, ...(s.inventory || {}) };
  s.career = { ...def.career, ...(s.career || {}) };
  s.settings = { ...def.settings, ...(s.settings || {}) };
  if (!Array.isArray(s.history)) s.history = [];
  if (!Array.isArray(s.milestonesClaimed)) s.milestonesClaimed = [];
  if (!Array.isArray(s.bestGhostRun)) s.bestGhostRun = [];
  if (!s.login || typeof s.login !== 'object') s.login = { lastDay: null, streak: 0 };

  const today = utcDay();
  if (!s.daily || s.daily.day !== today) s.daily = { day: today, values: { matches: 0, score: 0, kills: 0, lab: 0 }, claimed: [] };
  const week = utcWeekId();
  if (!s.weekly || s.weekly.id !== week) s.weekly = { id: week, values: { matches: 0, score: 0, kills: 0 }, claimed: [] };
  syncEnergy(s);
  return s;
}

export function loadSave() {
  return sanitizeSave(readLocalMirrorSync());
}

export async function hydrateIndexedDBSave(currentSave) {
  const idbData = await readIndexedDBSave();
  if (!idbData) return currentSave;
  const clean = sanitizeSave(idbData);
  // Prefer whichever has higher career matches / XP
  if ((clean.career.matches || 0) > (currentSave.career.matches || 0) || (clean.xp || 0) > (currentSave.xp || 0)) {
    Object.assign(currentSave, clean);
  }
  return currentSave;
}

export function persistSave(save) {
  writeSecureSave(save).catch(() => {});
}

export function syncEnergy(save, now = Date.now()) {
  if (save.energy >= ENERGY_MAX) { save.energy = ENERGY_MAX; save.energyAt = now; return save.energy; }
  const elapsed = Math.max(0, now - (save.energyAt || now));
  const gained = Math.floor(elapsed / ENERGY_REGEN_MS);
  if (gained > 0) {
    save.energy = Math.min(ENERGY_MAX, save.energy + gained);
    save.energyAt = save.energy >= ENERGY_MAX ? now : save.energyAt + gained * ENERGY_REGEN_MS;
  }
  return save.energy;
}

export function recordMatchResult(save, { score, kills, seconds, rank, modeId, players, ghostTrace = [] }) {
  save.career.matches++;
  save.career.kills += kills;
  save.career.score += score;
  save.career.playSeconds += Math.round(seconds);
  if (score >= save.career.best && ghostTrace.length > 5) {
    save.bestGhostRun = ghostTrace.slice(0, 300);
  }
  save.career.best = Math.max(save.career.best, score);
  if (rank === 1) save.career.wins++;

  for (const bucket of [save.daily.values, save.weekly.values]) {
    bucket.matches = (bucket.matches || 0) + 1;
    bucket.score = (bucket.score || 0) + score;
    bucket.kills = (bucket.kills || 0) + kills;
  }

  const earnedCoins = Math.min(2800, Math.round(score * 0.14 + kills * 45 + (rank === 1 ? 320 : rank <= 3 ? 130 : 30)));
  const earnedGems = rank === 1 ? 8 : rank <= 3 ? 3 : 0;
  const earnedXp = Math.min(2500, Math.round(score * 0.18 + kills * 55 + seconds * 2));
  const earnedPassXp = Math.min(900, Math.round(120 + kills * 45 + (rank === 1 ? 180 : 40)));

  save.coins += earnedCoins;
  save.gems += earnedGems;
  save.xp += earnedXp;
  save.passXp = (save.passXp || 0) + earnedPassXp;

  while (save.xp >= save.level * 1000) {
    save.xp -= save.level * 1000;
    save.level++;
    save.gems += 5;
  }

  save.history.unshift({
    date: new Date().toISOString(), modeId, rank, score, kills, seconds: Math.round(seconds), skin: save.skin,
    players: (players || []).slice(0, 12),
  });
  save.history = save.history.slice(0, 25);
  persistSave(save);
  return { earnedCoins, earnedGems, earnedXp, earnedPassXp };
}

export function unlockPremiumPass(save) {
  if (save.passPremium) return { ok: false, msg: 'Sovereign Pass already active!' };
  if (save.gems < PASS_PREMIUM_GEM_COST) return { ok: false, msg: `Need ${PASS_PREMIUM_GEM_COST} Gems` };
  save.gems -= PASS_PREMIUM_GEM_COST;
  save.passPremium = true;
  persistSave(save);
  return { ok: true, msg: '👑 SOVEREIGN DRAGON PASS UNLOCKED!' };
}

export function claimDragonPassTier(save, tier, track = 'free') {
  const unlockedTier = getPassTier(save.passXp);
  if (tier > unlockedTier) return { ok: false, msg: `Reach Tier ${tier} first!` };
  if (track === 'premium' && !save.passPremium) return { ok: false, msg: 'Unlock Sovereign Pass first!' };
  const claimedArr = track === 'premium' ? save.passClaimedPrem : save.passClaimedFree;
  if (claimedArr.includes(tier)) return { ok: false, msg: 'Already claimed!' };

  const def = DRAGON_PASS_TIERS.find(t => t.tier === tier);
  if (!def) return { ok: false, msg: 'Invalid tier' };
  const rew = track === 'premium' ? def.premium : def.free;

  claimedArr.push(tier);
  grantReward(save, rew);
  if (rew.dragonId) {
    if (!save.ownedSkins.includes(rew.dragonId)) {
      save.ownedSkins.push(rew.dragonId);
      save.dragonLevels[rew.dragonId] = 1;
    } else {
      save.coins += 4000;
    }
  }
  persistSave(save);
  return { ok: true, msg: `Tier ${tier} (${track.toUpperCase()}) Claimed!` };
}

export function upgradeDragon(save, dragonId) {
  if (!save.ownedSkins.includes(dragonId)) return { ok: false, msg: 'Unlock this dragon first!' };
  const currentLv = save.dragonLevels[dragonId] || 1;
  if (currentLv >= 5) return { ok: false, msg: 'Dragon is already MAX Level 5!' };
  const cost = getUpgradeCost(dragonId, currentLv);
  if (save.coins < cost) return { ok: false, msg: `Need ${cost.toLocaleString()} coins to upgrade` };
  save.coins -= cost;
  save.dragonLevels[dragonId] = currentLv + 1;
  persistSave(save);
  return { ok: true, msg: `${getDragonById(dragonId).name} evolved to Lv.${currentLv + 1}!`, newLevel: currentLv + 1 };
}

export function openDragonCrate(save, tier = 'royal') {
  const isMythic = tier === 'mythic';
  const costCoins = isMythic ? 0 : 1200;
  const costGems = isMythic ? 45 : 0;
  if (costCoins && save.coins < costCoins) return { ok: false, msg: `Need ${costCoins.toLocaleString()} coins` };
  if (costGems && save.gems < costGems) return { ok: false, msg: `Need ${costGems} gems` };

  save.coins -= costCoins;
  save.gems -= costGems;
  save.career.cratesOpened = (save.career.cratesOpened || 0) + 1;

  const r = Math.random();
  let rarity = 'rare';
  if (isMythic) rarity = r < 0.22 ? 'mythic' : r < 0.58 ? 'legendary' : 'epic';
  else rarity = r < 0.05 ? 'legendary' : r < 0.22 ? 'epic' : r < 0.58 ? 'rare' : 'uncommon';

  const pool = DRAGONS.filter(d => d.rarity === rarity);
  const picked = pool[Math.floor(Math.random() * pool.length)] || DRAGONS[0];
  const alreadyOwned = save.ownedSkins.includes(picked.id);
  let bonusCoins = 0;
  if (alreadyOwned) {
    bonusCoins = Math.round(Math.max(400, picked.price * 0.45));
    save.coins += bonusCoins;
  } else {
    save.ownedSkins.push(picked.id);
    save.dragonLevels[picked.id] = 1;
  }
  persistSave(save);
  return {
    ok: true, dragon: picked, duplicate: alreadyOwned, bonusCoins,
    msg: alreadyOwned ? `Duplicate ${picked.name} -> +${bonusCoins.toLocaleString()} Coins!` : `NEW ${picked.rarity.toUpperCase()} DRAGON: ${picked.name}!`,
  };
}

export function grantReward(save, reward) {
  if (reward.coins) save.coins += reward.coins;
  if (reward.gems) save.gems += reward.gems;
  if (reward.energy) save.energy = Math.min(ENERGY_MAX, save.energy + reward.energy);
}

export function rewardText(r) {
  const parts = [];
  if (r.dragonId) parts.push(`🐉 ${getDragonById(r.dragonId).name}`);
  if (r.coins) parts.push(`+${r.coins.toLocaleString()} 🪙`);
  if (r.gems) parts.push(`+${r.gems} 💎`);
  if (r.energy) parts.push(`+${r.energy} ⚡`);
  return parts.join(' · ');
}
