/**
 * Dragon Arena v3.0 — Peak AAA Game Controller & Self-Healing Runtime
 * Integrates: WebGL2 + HDR Bloom + GPU Instancing + Canvas2D Fallback,
 * 3D Crate Opening Ceremony, 30-Tier Dragon Pass, Emote Wheel, Signed IndexedDB Save & Crash Telemetry.
 */

import { DRAGONS, RARITY_CONFIG, getDragonById } from './config/dragons.js';
import { ARENA_THEMES, GAME_MODES } from './config/arenas.js';
import { DragonArenaEngine, PHYSICS } from './engine/physics.js';
import { DragonWebGLEngine } from './render/webgl_engine.js';
import { Canvas2DFallbackEngine } from './render/canvas2d_fallback.js';
import { SoundEngine } from './audio/sound_engine.js';
import {
  loadSave, hydrateIndexedDBSave, persistSave, createDefaultSave, syncEnergy,
  recordMatchResult, upgradeDragon, openDragonCrate, grantReward,
  unlockPremiumPass, claimDragonPassTier,
  DAILY_MISSIONS, WEEKLY_EVENTS, MILESTONES, LOGIN_REWARDS, utcDay,
} from './systems/progression.js';
import { logCrashTelemetry } from './systems/storage_security.js';
import { ArenaHUD } from './ui/hud.js';
import { renderModeSelector, renderDragonLab, renderShopContent, renderModalContent } from './ui/screens.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const fmt = (n) => Math.round(Number(n) || 0).toLocaleString('en-US');

let save = loadSave();
const sound = new SoundEngine(() => save.settings);
const hud = new ArenaHUD();
let engine = null;
let arena = null;

let activeScreen = 'splash';
let previewDragonId = save.skin;
let shopTab = 'crates';
let modalKind = null;
let paused = false;
let reviveLeft = 5;
let reviveTimer = 0;
let matchFinalized = false;

const keys = new Set();
let boostHeld = false;
let joystickActive = false;
let joystickPointerId = null;
let joystickOrigin = { x: 0, y: 0 };

let lastTime = performance.now();
let accumulator = 0;
let fpsSmooth = 60;
let slowFrames = 0;

if ('serviceWorker' in navigator && location.protocol !== 'file:' && !navigator.userAgent.includes('DragonArenaAndroidPreview')) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

window.addEventListener('error', (e) => logCrashTelemetry('window.error', e.message));
window.addEventListener('unhandledrejection', (e) => logCrashTelemetry('promise', String(e.reason)));

function showToast(msg, tone = 'info') {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.className = `toast visible tone-${tone}`;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.classList.remove('visible'), 3000);
}

function syncHeaderCurrencies() {
  syncEnergy(save);
  $$('[data-coins]').forEach(el => el.textContent = fmt(save.coins));
  $$('[data-gems]').forEach(el => el.textContent = fmt(save.gems));
  $$('[data-energy]').forEach(el => el.textContent = `${save.energy}/20`);
  $$('[data-level]').forEach(el => el.textContent = save.level);
  $$('[data-player-name]').forEach(el => el.textContent = save.name);
  const xpBar = $('#home-xp-fill');
  if (xpBar) xpBar.style.width = `${Math.min(100, Math.round((save.xp / (save.level * 1000)) * 100))}%`;

  const eq = getDragonById(save.skin);
  const lv = save.dragonLevels[save.skin] || 1;
  const heroTag = $('#home-dragon-badge');
  if (heroTag) heroTag.textContent = `${eq.name.toUpperCase()} · LV.${lv}`;

  const modeMeta = GAME_MODES.find(m => m.id === save.selectedMode) || GAME_MODES[0];
  const modeLabel = $('#home-mode-label');
  if (modeLabel) modeLabel.textContent = modeMeta.name;
}

function applyEngineSettings() {
  if (!engine) return;
  engine.quality = save.settings.graphics || 'high';
  engine.cameraStyle = save.settings.cameraStyle || 'dynamic3d';
  engine.arenaThemeIndex = save.arenaTheme || 0;
  sound.syncVolumes();
}

function setScreen(name) {
  activeScreen = name;
  $$('.screen').forEach(s => s.classList.toggle('active', s.id === `screen-${name}`));
  $('#pause-modal')?.classList.add('hidden');
  $('#panel-modal')?.classList.add('hidden');
  modalKind = null;

  if (engine) {
    engine.scene = name === 'arena' ? 'arena' : name === 'lab' ? 'lab' : name === 'crate' ? 'crate' : name === 'splash' ? 'splash' : 'home';
    engine.heroSkin = name === 'lab' ? previewDragonId : save.skin;
    engine.heroLevel = save.dragonLevels[engine.heroSkin] || 1;
    if (name === 'lab') engine.resetShowcase();
  }

  if (name === 'arena') sound.setTrack('arena');
  else if (name === 'lab' || name === 'shop' || name === 'crate') sound.setTrack('lab');
  else if (name === 'home' || name === 'result' || name === 'revive') sound.setTrack('home');

  syncHeaderCurrencies();
  if (name === 'home') {
    const modeGrid = $('#home-mode-grid');
    if (modeGrid) modeGrid.innerHTML = renderModeSelector(save);
  } else if (name === 'lab') {
    save.daily.values.lab = 1;
    persistSave(save);
    refreshLab();
  } else if (name === 'shop') {
    refreshShop();
  }
}

function refreshLab() {
  const { infoHtml, carouselHtml } = renderDragonLab(save, previewDragonId);
  if ($('#lab-info-card')) $('#lab-info-card').innerHTML = infoHtml;
  if ($('#lab-carousel')) $('#lab-carousel').innerHTML = carouselHtml;
  if (engine) {
    engine.heroSkin = previewDragonId;
    engine.heroLevel = save.dragonLevels[previewDragonId] || 1;
  }
}

function refreshShop() {
  $$('[data-shop-tab]').forEach(btn => btn.classList.toggle('active', btn.dataset.shopTab === shopTab));
  if ($('#shop-body')) $('#shop-body').innerHTML = renderShopContent(save, shopTab);
}

function openModal(kind) {
  const titles = {
    pass: '👑 SEASON DRAGON PASS (30 TIERS)',
    missions: 'DAILY MISSIONS',
    events: 'WEEKLY EVENTS',
    rewards: 'REWARDS & STREAK',
    leaderboard: 'WEEKLY LEAGUES & RANKINGS',
    profile: 'DRAGON LORD PROFILE',
    settings: 'GAME SETTINGS & SECURITY',
  };
  modalKind = kind;
  $('#modal-title').textContent = titles[kind] || 'DRAGON ARENA';
  $('#modal-body').innerHTML = renderModalContent(kind, save);
  $('#panel-modal').classList.remove('hidden');
}

function closeModal() {
  modalKind = null;
  $('#panel-modal').classList.add('hidden');
}

function startMatch(forcedModeId = null) {
  const modeId = forcedModeId || save.selectedMode || 'classic';
  const mode = GAME_MODES.find(m => m.id === modeId) || GAME_MODES[0];
  syncEnergy(save);
  if (mode.energyCost > 0 && save.energy < mode.energyCost) {
    sound.play('error');
    showToast('Not enough Energy! Play Titan Hunt (Free) or claim Daily Energy.', 'warn');
    return;
  }
  if (mode.energyCost > 0) { save.energy -= mode.energyCost; persistSave(save); }

  arena = new DragonArenaEngine({
    modeId: mode.id,
    seed: Date.now() ^ ((save.career.matches + 1) * 2654435761),
    playerSkin: save.skin,
    playerLevel: save.dragonLevels[save.skin] || 1,
    playerName: save.name,
    dragons: DRAGONS,
    ghostRun: save.bestGhostRun,
  });

  if (engine) {
    engine.arena = arena;
    engine.camTarget = [0, 0, 0];
    engine.camHeight = 25;
  }
  paused = false; matchFinalized = false; boostHeld = false; accumulator = 0;
  sound.play('confirm');
  setScreen('arena');
}

function showReviveScreen() {
  const you = arena?.players.find(p => p.id === 'you');
  if (!you) return finalizeMatch();
  const rank = 1 + arena.players.filter(p => p.score > you.score).length;
  reviveLeft = 5; reviveTimer = performance.now();
  $('#revive-countdown').textContent = '5';
  $('#revive-rank').textContent = `#${rank}`;
  $('#revive-score').textContent = fmt(you.score);
  sound.play('death');
  sound.setFever(false);
  setScreen('revive');
}

function executeRevive() {
  if (activeScreen !== 'revive' || !arena) return;
  if (save.coins < 250) { sound.play('error'); showToast('Need 250 Coins to revive!', 'warn'); return; }
  save.coins -= 250; persistSave(save);
  const you = arena.players.find(p => p.id === 'you');
  const safePt = arena.randomPointInArena(16);
  you.alive = true; you.x = safePt.x; you.y = safePt.y;
  you.angle = Math.atan2(-safePt.y, -safePt.x); you.aimAngle = you.angle;
  you.spawnShieldTicks = 180; you.stamina = you.maxStamina;
  you.history = [];
  for (let i = 0; i < Math.max(40, you.segmentCount + 6); i++) {
    you.history.push({ x: you.x - i * PHYSICS.segmentSpacing * Math.cos(you.angle), y: you.y - i * PHYSICS.segmentSpacing * Math.sin(you.angle) });
  }
  you.body = arena.sampleBody(you);
  paused = false;
  sound.play('power');
  setScreen('arena');
  showToast('REVIVED! 3s Aegis Protection Active!', 'gold');
}

function finalizeMatch() {
  if (matchFinalized || !arena) { setScreen('home'); return; }
  matchFinalized = true;
  const you = arena.players.find(p => p.id === 'you');
  const sorted = [...arena.players].sort((a, b) => b.score - a.score);
  const rank = Math.max(1, sorted.findIndex(p => p.id === 'you') + 1);
  const rewards = recordMatchResult(save, {
    score: you?.score || 0, kills: you?.kills || 0, seconds: arena.elapsed, rank,
    modeId: arena.mode.id, players: sorted.map(p => ({ name: p.displayName, score: p.score, isYou: p.id === 'you' })),
    ghostTrace: arena.ghostTrace,
  });

  $('#res-banner').textContent = arena.victory || rank === 1 ? '👑 SOVEREIGN VICTORY!' : 'MATCH COMPLETE';
  $('#res-rank').textContent = `#${rank}`;
  $('#res-score').textContent = fmt(you?.score || 0);
  $('#res-kills').textContent = fmt(you?.kills || 0);
  $('#res-time').textContent = `${Math.floor(arena.elapsed / 60)}m ${Math.floor(arena.elapsed % 60)}s`;
  $('#res-coins').textContent = `+${fmt(rewards.earnedCoins)} 🪙`;
  $('#res-gems').textContent = `+${rewards.earnedGems} 💎`;
  $('#res-xp').textContent = `+${fmt(rewards.earnedXp)} XP · +${rewards.earnedPassXp} PASS`;

  sound.setFever(false);
  sound.play('reward');
  setScreen('result');
}

function useInventoryPower(kind) {
  if (activeScreen !== 'arena' || !arena || paused) return;
  const you = arena.players.find(p => p.id === 'you');
  if (!you?.alive) return;
  if ((save.inventory[kind] || 0) <= 0) { sound.play('error'); showToast(`No ${kind.toUpperCase()} left!`, 'warn'); return; }
  save.inventory[kind]--; persistSave(save);
  if (kind === 'magnet') you.magnetTicks = Math.max(you.magnetTicks, 540);
  else if (kind === 'speed') you.speedTicks = Math.max(you.speedTicks, 360);
  else if (kind === 'shield') you.shieldTicks = Math.max(you.shieldTicks, 600);
  sound.play('power');
  showToast(`${kind.toUpperCase()} ACTIVATED!`, 'gold');
}

function launchCrateCeremony(res) {
  const rarity = RARITY_CONFIG[res.dragon.rarity] || RARITY_CONFIG.rare;
  previewDragonId = res.dragon.id;
  $('#crate-rarity').textContent = `${rarity.label} · ${res.dragon.element.toUpperCase()}`;
  $('#crate-rarity').style.color = rarity.color;
  $('#crate-title').textContent = res.dragon.name.toUpperCase();
  $('#crate-sub').textContent = res.duplicate ? `Duplicate converted to +${fmt(res.bonusCoins)} Coins!` : `NEW DRAGON ADDED TO YOUR LAB!`;
  setScreen('crate');
  engine?.startCrateCeremony(res.dragon.id, rarity.glow);
  sound.play('crate');
  setTimeout(() => { if (activeScreen === 'crate') sound.play('roar'); }, 1350);
}

function handleShopBuy(id) {
  const today = utcDay();
  if (id === 'crate-royal' || id === 'crate-mythic') {
    const res = openDragonCrate(save, id === 'crate-mythic' ? 'mythic' : 'royal');
    if (!res.ok) { sound.play('error'); showToast(res.msg, 'warn'); return; }
    syncHeaderCurrencies();
    launchCrateCeremony(res);
    return;
  }
  if (id === 'daily-chest') {
    if (save.dailyChestDay === today) return;
    save.dailyChestDay = today; save.coins += 250; save.gems += 5; persistSave(save);
    sound.play('reward'); showToast('Daily Royal Chest: +250 🪙 & +5 💎!', 'gold');
  } else if (id === 'daily-energy') {
    if (save.dailyEnergyDay === today) return;
    save.dailyEnergyDay = today; save.energy = Math.min(20, save.energy + 10); persistSave(save);
    sound.play('power'); showToast('+10 Energy Restored!', 'gold');
  } else if (id === 'refill-energy') {
    if (save.gems < 10) { sound.play('error'); showToast('Need 10 Gems', 'warn'); return; }
    save.gems -= 10; save.energy = 20; persistSave(save);
    sound.play('power'); showToast('Energy Full (20/20)!', 'gold');
  } else if (id === 'exchange-coins-sm' || id === 'exchange-coins-lg') {
    const gemCost = id === 'exchange-coins-lg' ? 100 : 25, gain = id === 'exchange-coins-lg' ? 12000 : 2500;
    if (save.gems < gemCost) { sound.play('error'); showToast(`Need ${gemCost} Gems`, 'warn'); return; }
    save.gems -= gemCost; save.coins += gain; persistSave(save);
    sound.play('reward'); showToast(`+${fmt(gain)} Coins added!`, 'gold');
  } else if (id.startsWith('pwr-')) {
    if (id === 'pwr-bundle') {
      if (save.coins < 1800) { sound.play('error'); showToast('Need 1,800 Coins', 'warn'); return; }
      save.coins -= 1800; save.inventory.magnet += 3; save.inventory.speed += 3; save.inventory.shield += 3; persistSave(save);
      sound.play('reward'); showToast('Warrior Pack ×3 added!', 'gold');
    } else {
      const kind = id.replace('pwr-', ''), cost = kind === 'shield' ? 300 : 250;
      if (save.coins < cost) { sound.play('error'); showToast(`Need ${cost} Coins`, 'warn'); return; }
      save.coins -= cost; save.inventory[kind] = (save.inventory[kind] || 0) + 1; persistSave(save);
      sound.play('confirm'); showToast(`Purchased +1 ${kind.toUpperCase()}!`, 'gold');
    }
  }
  syncHeaderCurrencies();
  refreshShop();
}

function handleClaim(spec) {
  const [kind, id] = spec.split(':');
  const today = utcDay();
  if (kind === 'login') {
    if (save.login.lastDay === today) return;
    const streak = (save.login.streak || 0) + 1;
    save.login = { lastDay: today, streak };
    grantReward(save, LOGIN_REWARDS[(streak - 1) % LOGIN_REWARDS.length]);
    persistSave(save); sound.play('reward'); showToast(`Day ${streak} Login Reward Claimed!`, 'gold');
  } else if (kind === 'mission') {
    const m = DAILY_MISSIONS.find(x => x.id === id);
    if (!m || save.daily.claimed.includes(id) || (save.daily.values[id] || 0) < m.target) return;
    save.daily.claimed.push(id); grantReward(save, m.reward); persistSave(save);
    sound.play('reward'); showToast(`${m.title} Claimed!`, 'gold');
  } else if (kind === 'event') {
    const ev = WEEKLY_EVENTS.find(x => x.id === id);
    if (!ev || save.weekly.claimed.includes(id) || (save.weekly.values[ev.kind] || 0) < ev.target) return;
    save.weekly.claimed.push(id); grantReward(save, ev.reward); persistSave(save);
    sound.play('reward'); showToast(`${ev.title} Claimed!`, 'gold');
  } else if (kind === 'milestone') {
    const ms = MILESTONES.find(x => x.id === id);
    if (!ms || save.milestonesClaimed.includes(id) || (save.career[ms.kind] || 0) < ms.target) return;
    save.milestonesClaimed.push(id); grantReward(save, ms.reward); persistSave(save);
    sound.play('reward'); showToast(`${ms.label} Claimed!`, 'gold');
  }
  syncHeaderCurrencies();
  if (modalKind) $('#modal-body').innerHTML = renderModalContent(modalKind, save);
}

document.addEventListener('click', (e) => {
  sound.ensureContext();

  const emoteBtn = e.target.closest('[data-emote]');
  if (emoteBtn && activeScreen === 'arena' && arena && !paused) {
    const you = arena.players.find(p => p.id === 'you');
    arena.triggerEmote(you, emoteBtn.dataset.emote);
    sound.play('roar');
    return;
  }

  const passClaim = e.target.closest('[data-claim-pass]');
  if (passClaim) {
    const [track, tierStr] = passClaim.dataset.claimPass.split(':');
    const res = claimDragonPassTier(save, Number(tierStr), track);
    sound.play(res.ok ? 'reward' : 'error');
    showToast(res.msg, res.ok ? 'gold' : 'warn');
    syncHeaderCurrencies();
    if (modalKind) $('#modal-body').innerHTML = renderModalContent(modalKind, save);
    return;
  }

  const modeBtn = e.target.closest('[data-select-mode]');
  if (modeBtn) {
    save.selectedMode = modeBtn.dataset.selectMode; persistSave(save); sound.play('tap'); syncHeaderCurrencies();
    if ($('#home-mode-grid')) $('#home-mode-grid').innerHTML = renderModeSelector(save);
    return;
  }

  const prevDragon = e.target.closest('[data-preview-dragon]');
  if (prevDragon) { previewDragonId = prevDragon.dataset.previewDragon; sound.play('tap'); refreshLab(); return; }

  const shopTabBtn = e.target.closest('[data-shop-tab]');
  if (shopTabBtn) { shopTab = shopTabBtn.dataset.shopTab; sound.play('tap'); refreshShop(); return; }

  const buyBtn = e.target.closest('[data-buy]');
  if (buyBtn) { handleShopBuy(buyBtn.dataset.buy); return; }

  const themeBtn = e.target.closest('[data-select-theme]');
  if (themeBtn) {
    save.arenaTheme = Number(themeBtn.dataset.selectTheme) || 0; persistSave(save); applyEngineSettings();
    sound.play('confirm'); showToast(`${ARENA_THEMES[save.arenaTheme].name} Arena Equipped!`, 'gold'); refreshShop();
    return;
  }

  const claimBtn = e.target.closest('[data-claim]');
  if (claimBtn) { handleClaim(claimBtn.dataset.claim); return; }

  const actBtn = e.target.closest('[data-action]');
  if (!actBtn) return;
  const action = actBtn.dataset.action;

  switch (action) {
    case 'enter-game': sound.play('confirm'); setScreen('home'); break;
    case 'play-selected': startMatch(save.selectedMode); break;
    case 'go-home': paused = false; arena = null; if (engine) engine.arena = null; sound.play('tap'); setScreen('home'); break;
    case 'open-lab': previewDragonId = save.skin; sound.play('tap'); setScreen('lab'); break;
    case 'open-shop': shopTab = actBtn.dataset.tab || 'crates'; sound.play('tap'); setScreen('shop'); break;
    case 'open-modal': sound.play('tap'); openModal(actBtn.dataset.modal); break;
    case 'close-modal': sound.play('tap'); closeModal(); break;
    case 'roar-dragon': engine?.triggerHeroRoar(); sound.play('roar'); break;
    case 'unlock-pass': {
      const res = unlockPremiumPass(save);
      sound.play(res.ok ? 'reward' : 'error'); showToast(res.msg, res.ok ? 'gold' : 'warn');
      syncHeaderCurrencies();
      if (modalKind) $('#modal-body').innerHTML = renderModalContent(modalKind, save);
      break;
    }
    case 'replay-tutorial':
      save.tutorialDone = false; persistSave(save); closeModal(); startMatch('boss');
      break;
    case 'equip-dragon':
      if (save.ownedSkins.includes(previewDragonId)) {
        save.skin = previewDragonId; persistSave(save); sound.play('confirm');
        showToast(`${getDragonById(previewDragonId).name} Equipped!`, 'gold'); refreshLab(); syncHeaderCurrencies();
      }
      break;
    case 'unlock-dragon': {
      const d = getDragonById(previewDragonId);
      if (save.coins < d.price) { sound.play('error'); showToast(`Need ${fmt(d.price)} Coins`, 'warn'); break; }
      save.coins -= d.price; save.ownedSkins.push(d.id); save.dragonLevels[d.id] = 1; save.skin = d.id; persistSave(save);
      engine?.triggerHeroRoar(); sound.play('reward'); showToast(`${d.name} UNLOCKED & EQUIPPED!`, 'gold');
      refreshLab(); syncHeaderCurrencies();
      break;
    }
    case 'upgrade-dragon': {
      const res = upgradeDragon(save, previewDragonId);
      if (!res.ok) { sound.play('error'); showToast(res.msg, 'warn'); break; }
      engine?.triggerHeroRoar(); sound.play('upgrade'); showToast(res.msg, 'gold');
      refreshLab(); syncHeaderCurrencies();
      break;
    }
    case 'pause': if (activeScreen === 'arena') { paused = true; $('#pause-modal')?.classList.remove('hidden'); sound.play('tap'); } break;
    case 'resume': paused = false; $('#pause-modal')?.classList.add('hidden'); sound.play('tap'); break;
    case 'fury':
      if (activeScreen === 'arena' && arena && !paused) {
        const you = arena.players.find(p => p.id === 'you');
        if (arena.triggerFury(you)) { engine?.triggerShake(1.1, 0.4); sound.play('fury'); }
      }
      break;
    case 'pwr-magnet': useInventoryPower('magnet'); break;
    case 'pwr-speed': useInventoryPower('speed'); break;
    case 'pwr-shield': useInventoryPower('shield'); break;
    case 'revive-now': executeRevive(); break;
    case 'skip-revive': finalizeMatch(); break;
    case 'rematch': startMatch(arena?.mode?.id || save.selectedMode); break;
    case 'rename-player': {
      const next = prompt('Enter Dragon Lord Callsign (2-18 chars):', save.name);
      if (next && next.trim().length >= 2) {
        save.name = next.trim().slice(0, 18); persistSave(save); syncHeaderCurrencies();
        if (modalKind) $('#modal-body').innerHTML = renderModalContent(modalKind, save);
        showToast(`Callsign updated to ${save.name}!`, 'gold');
      }
      break;
    }
    case 'reset-save':
      if (confirm('Reset all local Dragon Arena progress?')) {
        save = createDefaultSave(); persistSave(save); applyEngineSettings(); syncHeaderCurrencies(); closeModal(); setScreen('home');
        showToast('Save data reset.', 'info');
      }
      break;
  }
});

document.addEventListener('input', (e) => {
  const el = e.target.closest('[data-setting]');
  if (!el) return;
  const k = el.dataset.setting;
  if (el.type === 'range') {
    save.settings[k] = Number(el.value);
    const label = el.previousElementSibling;
    if (label) label.textContent = label.textContent.replace(/\(\d+%\)/, `(${Math.round(Number(el.value) * 100)}%)`);
  } else if (el.type === 'checkbox') save.settings[k] = el.checked;
  else save.settings[k] = el.value;
  persistSave(save);
  applyEngineSettings();
});

const sceneCanvas = $('#scene3d');
let stageDrag = null;
sceneCanvas?.addEventListener('pointerdown', (e) => {
  if (activeScreen !== 'home' && activeScreen !== 'lab') return;
  stageDrag = { x: e.clientX, y: e.clientY, moved: false };
});
window.addEventListener('pointermove', (e) => {
  if (!stageDrag) return;
  const dx = e.clientX - stageDrag.x;
  if (Math.abs(dx) > 4) stageDrag.moved = true;
  stageDrag.x = e.clientX;
  engine?.rotateShowcase(dx * 0.012);
});
window.addEventListener('pointerup', () => {
  if (stageDrag && !stageDrag.moved && (activeScreen === 'home' || activeScreen === 'lab')) {
    engine?.triggerHeroRoar(); sound.play('roar');
  }
  stageDrag = null;
});
sceneCanvas?.addEventListener('wheel', (e) => {
  if (activeScreen !== 'lab') return;
  e.preventDefault(); engine?.zoomShowcase(e.deltaY > 0 ? -0.09 : 0.09);
}, { passive: false });

const joyZone = $('#joystick-zone'), joyStick = $('#joystick-stick');
function setAimVector(dx, dy) {
  if (!arena || paused) return;
  const you = arena.players.find(p => p.id === 'you');
  if (you?.alive && Math.hypot(dx, dy) > 4) you.aimAngle = Math.atan2(dy, dx);
}
joyZone?.addEventListener('pointerdown', (e) => {
  if (activeScreen !== 'arena') return;
  joystickActive = true; joystickPointerId = e.pointerId; joyZone.setPointerCapture(e.pointerId);
  const r = joyZone.getBoundingClientRect();
  joystickOrigin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  setAimVector(e.clientX - joystickOrigin.x, e.clientY - joystickOrigin.y);
});
joyZone?.addEventListener('pointermove', (e) => {
  if (!joystickActive || e.pointerId !== joystickPointerId) return;
  const dx = e.clientX - joystickOrigin.x, dy = e.clientY - joystickOrigin.y;
  setAimVector(dx, dy);
  const dist = Math.min(34, Math.hypot(dx, dy)), ang = Math.atan2(dy, dx);
  if (joyStick) joyStick.style.transform = `translate(${Math.cos(ang) * dist}px, ${Math.sin(ang) * dist}px)`;
});
const releaseJoy = () => { joystickActive = false; joystickPointerId = null; if (joyStick) joyStick.style.transform = 'translate(0,0)'; };
joyZone?.addEventListener('pointerup', releaseJoy);
joyZone?.addEventListener('pointercancel', releaseJoy);

$('#screen-arena')?.addEventListener('pointermove', (e) => {
  if (activeScreen !== 'arena' || paused || joystickActive || e.pointerType === 'touch' || e.target.closest('button')) return;
  setAimVector(e.clientX - window.innerWidth / 2, e.clientY - window.innerHeight / 2);
});

const boostBtn = $('#boost-btn');
boostBtn?.addEventListener('pointerdown', (e) => { if (activeScreen !== 'arena' || paused) return; boostHeld = true; boostBtn.classList.add('held'); e.preventDefault(); });
const releaseBoost = () => { boostHeld = false; boostBtn?.classList.remove('held'); };
['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => boostBtn?.addEventListener(ev, releaseBoost));

window.addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (activeScreen === 'arena') {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (e.code === 'KeyE' || e.code === 'KeyF') {
      const you = arena?.players.find(p => p.id === 'you');
      if (arena?.triggerFury(you)) { engine?.triggerShake(1.1, 0.4); sound.play('fury'); }
    } else if (e.code === 'Digit1') useInventoryPower('magnet');
    else if (e.code === 'Digit2') useInventoryPower('speed');
    else if (e.code === 'Digit3') useInventoryPower('shield');
    else if (e.code === 'Escape') { paused = !paused; $('#pause-modal')?.classList.toggle('hidden', !paused); }
  }
});
window.addEventListener('keyup', (e) => keys.delete(e.code));

function drainArenaEvents() {
  if (!arena || !arena.events.length) return;
  for (const ev of arena.events) {
    if (ev.type === 'pickup') sound.play('pickup', ev);
    else if (ev.type === 'boost_pad' || ev.type === 'portal') sound.play('power');
    else if (ev.type === 'pillar_shatter') { sound.play('kill'); engine?.triggerShake(0.9, 0.35); }
    else if (ev.type === 'powerup') { sound.play('power'); showToast(`${ev.label} ACTIVATED!`, 'gold'); }
    else if (ev.type === 'fever') { sound.play('fever'); sound.setFever(true); engine?.triggerShake(0.6, 0.3); }
    else if (ev.type === 'player_kill') {
      sound.play('kill'); engine?.triggerShake(ev.isBoss ? 1.5 : 1.0, 0.42);
      showToast(ev.isBoss ? '👑 OBSIDIAN TITAN SLAIN!' : ev.wasBounty ? '🎯 BOUNTY CLAIMED! 2X + FULL FURY!' : `⚔ ELIMINATED ${ev.victimName}!`, 'gold');
    } else if (ev.type === 'world_event') { sound.play('power'); showToast(`✦ ${ev.title} — ${ev.desc}`, 'gold'); }
    else if (ev.type === 'player_death') { engine?.triggerShake(1.4, 0.5); showReviveScreen(); }
    else if (ev.type === 'match_complete') finalizeMatch();
  }
  arena.events.length = 0;
}

function loop(now) {
  const dt = Math.min(0.1, Math.max(0.001, (now - lastTime) / 1000));
  lastTime = now;
  fpsSmooth = fpsSmooth * 0.92 + (1 / dt) * 0.08;

  if (activeScreen === 'arena' && fpsSmooth < 28) {
    slowFrames++;
    if (slowFrames > 90 && engine && engine.quality === 'ultra') { engine.quality = 'high'; slowFrames = 0; }
    else if (slowFrames > 140 && engine && engine.quality === 'high') { engine.quality = 'medium'; slowFrames = 0; }
  } else slowFrames = Math.max(0, slowFrames - 1);

  if (activeScreen === 'arena' && arena && !paused) {
    const you = arena.players.find(p => p.id === 'you');
    if (you?.alive) {
      const kx = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
      const ky = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
      if (kx || ky) you.aimAngle = Math.atan2(ky, kx);
      you.boost = boostHeld || keys.has('Space');
      sound.setFever(you.feverTimer > 0);
    }

    accumulator += dt;
    let steps = 0;
    while (accumulator >= PHYSICS.fixedDt && steps < 6) {
      arena.step(PHYSICS.fixedDt);
      accumulator -= PHYSICS.fixedDt;
      steps++;
      drainArenaEvents();
      if (activeScreen !== 'arena') break;
    }
    if (activeScreen === 'arena') hud.syncDOM(arena, save, fpsSmooth, engine?.drawCalls || 0);
  }

  if (activeScreen === 'revive' && now - reviveTimer >= 1000) {
    reviveLeft = Math.max(0, reviveLeft - 1);
    reviveTimer = now;
    if ($('#revive-countdown')) $('#revive-countdown').textContent = String(reviveLeft);
    if (reviveLeft <= 0) finalizeMatch();
  }

  if (engine) {
    try {
      engine.render(dt);
      if (activeScreen === 'arena' && arena) hud.renderOverlay(arena, engine);
    } catch (err) {
      logCrashTelemetry('render', err.message);
    }
  }
  requestAnimationFrame(loop);
}

async function boot() {
  const bar = $('#splash-bar'), pct = $('#splash-pct'), msg = $('#splash-msg'), btn = $('#splash-enter-btn');
  const stageStep = (p, text) => {
    if (bar) bar.style.width = `${p}%`;
    if (pct) pct.textContent = `${p}%`;
    if (msg) msg.textContent = text;
  };

  stageStep(16, 'Verifying Signed IndexedDB Profile...');
  await hydrateIndexedDBSave(save);

  stageStep(44, 'Compiling WebGL2 HDR Bloom & GPU Instancing Shaders...');
  try {
    engine = new DragonWebGLEngine($('#scene3d'));
  } catch (err) {
    logCrashTelemetry('webgl2_fallback', err.message);
    // A canvas that has acquired a WebGL context cannot acquire a 2D context.
    const previousCanvas = $('#scene3d');
    const fallbackCanvas = previousCanvas.cloneNode(false);
    previousCanvas.replaceWith(fallbackCanvas);
    engine = new Canvas2DFallbackEngine(fallbackCanvas);
  }
  applyEngineSettings();
  engine.heroSkin = save.skin;
  engine.heroLevel = save.dragonLevels[save.skin] || 1;
  engine.scene = 'splash';

  await new Promise(r => setTimeout(r, 110));
  stageStep(78, 'Initializing Spatial Hash Grid, Portals & 6-Archetype AI...');
  await new Promise(r => setTimeout(r, 110));
  stageStep(100, engine.isFallback ? 'Compatibility Engine Ready — Tap to Enter!' : 'AAA 3D Engine Ready — Tap to Enter!');

  syncHeaderCurrencies();
  if (btn) { btn.disabled = false; btn.textContent = '▶ ENTER DRAGON ARENA'; }
  requestAnimationFrame(loop);
}

boot();
window.__dragonArena = { get engine() { return engine; }, get arena() { return arena; }, get save() { return save; }, setScreen, startMatch };
