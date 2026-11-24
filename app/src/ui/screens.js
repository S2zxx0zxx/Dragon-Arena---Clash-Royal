/**
 * Dragon Arena v3.0 — AAA Game-Engine UI Panel Renderers
 * Includes: 30-Tier Dragon Pass, Weekly Competitive Leagues & Ghost Rivals,
 * Visual Lv.1-5 Evolution Lab, 3D Crate Vault, Missions, Events, Rewards, Profile & Security Settings.
 */

import { DRAGONS, RARITY_CONFIG, getDragonById, getDragonEffectiveStats, getUpgradeCost } from '../config/dragons.js';
import { ARENA_THEMES, GAME_MODES } from '../config/arenas.js';
import { DAILY_MISSIONS, WEEKLY_EVENTS, MILESTONES, LOGIN_REWARDS, utcDay, rewardText } from '../systems/progression.js';
import { DRAGON_PASS_TIERS, PASS_XP_PER_TIER, PASS_PREMIUM_GEM_COST, getPassTier, buildLeagueStandings } from '../systems/dragon_pass.js';
import { getCrashTelemetry } from '../systems/storage_security.js';

const fmt = (n) => Math.round(Number(n) || 0).toLocaleString('en-US');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function statBar(label, value, max, color = '#fbbf24') {
  const pct = Math.max(8, Math.min(100, Math.round((value / max) * 100)));
  return `<div class="stat-row"><span>${label}</span><div class="stat-track"><i style="width:${pct}%;background:${color}"></i></div><b>${value}</b></div>`;
}

export function renderModeSelector(save) {
  return GAME_MODES.map(m => {
    const selected = save.selectedMode === m.id;
    return `<button type="button" class="mode-card ${selected ? 'selected' : ''}" data-select-mode="${m.id}">
      <div class="mode-top"><strong>${m.name}</strong><span class="mode-tag">${m.tag}</span></div>
      <p>${m.desc}</p>
      <div class="mode-foot">${m.energyCost ? `⚡ ${m.energyCost} Energy` : '✦ Free Entry'} · ${m.botCount} Rivals</div>
    </button>`;
  }).join('');
}

export function renderDragonLab(save, previewId) {
  const dragon = getDragonById(previewId);
  const rarity = RARITY_CONFIG[dragon.rarity];
  const owned = save.ownedSkins.includes(dragon.id);
  const equipped = save.skin === dragon.id;
  const lv = save.dragonLevels[dragon.id] || 1;
  const stats = getDragonEffectiveStats(dragon.id, lv);
  const upgCost = getUpgradeCost(dragon.id, lv);

  const evoStars = '★'.repeat(lv) + '☆'.repeat(5 - lv);
  const infoHtml = `
    <div class="lab-header-row">
      <span class="rarity-pill" style="--rc:${rarity.color}">${rarity.label} · ${dragon.element.toUpperCase()}</span>
      <span class="power-badge">⚡ PWR ${fmt(stats.powerScore)}</span>
    </div>
    <h2 class="lab-dragon-name">${dragon.name} <small style="color:#fbbf24;font-size:13px">${evoStars}</small></h2>
    <div class="lab-ability-box">
      <strong>✦ ${dragon.ability}</strong>
      <small>${dragon.abilityDesc} · Evolution Lv.${lv}/5 visually scales Wings, Horns & Aura!</small>
    </div>
    <div class="lab-stats-grid">
      ${statBar('SPEED', Math.round(stats.speed * 100), 155, '#38bdf8')}
      ${statBar('AGILITY', Math.round(stats.agility * 100), 155, '#34d399')}
      ${statBar('STAMINA', stats.boostCap, 280, '#fbbf24')}
      ${statBar('MAGNET', Math.round(stats.magnet * 100), 215, '#c084fc')}
      ${statBar('HARVEST', Math.round(stats.massMult * 100), 185, '#fb7185')}
    </div>
    <div class="lab-cta-row">
      ${owned
        ? `<button class="gbtn ${equipped ? 'slate' : 'gold'}" data-action="equip-dragon" ${equipped ? 'disabled' : ''}>${equipped ? '✓ EQUIPPED' : 'EQUIP DRAGON'}</button>
           <button class="gbtn royal" data-action="upgrade-dragon" ${lv >= 5 ? 'disabled' : ''}>${lv >= 5 ? '★ MAX LV.5' : `⬆ EVOLVE LV.${lv + 1} (${fmt(upgCost)} 🪙)`}</button>`
        : `<button class="gbtn gold wide" data-action="unlock-dragon">🔓 UNLOCK · ${fmt(dragon.price)} 🪙</button>`}
    </div>
  `;

  const carouselHtml = DRAGONS.map(d => {
    const r = RARITY_CONFIG[d.rarity];
    const isOwned = save.ownedSkins.includes(d.id);
    const isSel = d.id === previewId;
    const isEq = save.skin === d.id;
    const rgb = d.primary.map(v => Math.round(v * 255)).join(',');
    const rgb2 = d.secondary.map(v => Math.round(v * 255)).join(',');
    return `<button type="button" class="dragon-tile ${isSel ? 'selected' : ''} ${!isOwned ? 'locked' : ''}" data-preview-dragon="${d.id}" style="--rc:${r.color}">
      <div class="tile-swatch" style="background:radial-gradient(circle at 35% 30%, rgb(${rgb2}), rgb(${rgb}))">
        ${isEq ? '<span class="eq-dot">★</span>' : ''}
        ${!isOwned ? '<span class="lock-dot">🔒</span>' : `<span class="lv-dot">Lv.${save.dragonLevels[d.id] || 1}</span>`}
      </div>
      <strong>${d.name}</strong>
      <small style="color:${r.color}">${r.label}</small>
    </button>`;
  }).join('');

  return { infoHtml, carouselHtml };
}

export function renderShopContent(save, tab = 'crates') {
  const today = utcDay();
  if (tab === 'crates') {
    return `
      <div class="shop-grid">
        <article class="shop-card featured">
          <span class="card-tag">3D CEREMONY</span>
          <div class="card-emblem">📦</div>
          <h3>ROYAL DRAGON CRATE</h3>
          <p>3D Animated Chest Opening! Guaranteed Uncommon to Legendary Dragon.</p>
          <button class="gbtn gold" data-buy="crate-royal">OPEN · 1,200 🪙</button>
        </article>
        <article class="shop-card mythic-card">
          <span class="card-tag mythic">22% MYTHIC</span>
          <div class="card-emblem">👑</div>
          <h3>MYTHIC SOVEREIGN VAULT</h3>
          <p>3D Rarity Beam Reveal! Guaranteed Epic, Legendary, or Mythic Dragon!</p>
          <button class="gbtn crimson" data-buy="crate-mythic">OPEN · 45 💎</button>
        </article>
        <article class="shop-card">
          <span class="card-tag free">DAILY</span>
          <div class="card-emblem">🎁</div>
          <h3>FREE ROYAL CHEST</h3>
          <p>Claim +250 Coins & +5 Gems once every UTC day.</p>
          <button class="gbtn emerald" data-buy="daily-chest" ${save.dailyChestDay === today ? 'disabled' : ''}>${save.dailyChestDay === today ? '✓ CLAIMED' : 'CLAIM FREE'}</button>
        </article>
      </div>`;
  }

  if (tab === 'powerups') {
    const items = [
      ['pwr-magnet', '🧲', 'GRAVITY MAGNET', 'Pulls all nearby 3D crystals & death loot for 9s', '250 🪙'],
      ['pwr-speed', '⚡', 'HYPER HASTE', '+32% blazing flight speed burst for 6s', '250 🪙'],
      ['pwr-shield', '🛡️', 'AEGIS SHIELD', 'Invulnerable crystal dome barrier for 10s', '300 🪙'],
      ['pwr-bundle', '🧰', 'WARRIOR PACK ×3', 'Get 3× Magnet, 3× Haste, and 3× Aegis Shield', '1,800 🪙'],
    ];
    return `<div class="shop-grid">${items.map(([id, icon, title, desc, price]) => `
      <article class="shop-card">
        <div class="card-emblem">${icon}</div>
        <h3>${title}</h3>
        <p>${desc}</p>
        <button class="gbtn gold" data-buy="${id}">BUY · ${price}</button>
      </article>`).join('')}</div>`;
  }

  if (tab === 'resources') {
    return `<div class="shop-grid">
      <article class="shop-card">
        <div class="card-emblem">⚡</div>
        <h3>DAILY ENERGY CHARGE</h3>
        <p>Restore +10 Arena Energy immediately for free once per day.</p>
        <button class="gbtn emerald" data-buy="daily-energy" ${save.dailyEnergyDay === today ? 'disabled' : ''}>${save.dailyEnergyDay === today ? '✓ CLAIMED' : 'RESTORE +10 ⚡'}</button>
      </article>
      <article class="shop-card">
        <div class="card-emblem">🔋</div>
        <h3>FULL ENERGY REFILL</h3>
        <p>Top up Arena Energy to 20/20 right now.</p>
        <button class="gbtn royal" data-buy="refill-energy">REFILL · 10 💎</button>
      </article>
      <article class="shop-card">
        <div class="card-emblem">🪙</div>
        <h3>TREASURY POUCH (+2,500)</h3>
        <p>Exchange 25 Gems for 2,500 Gold Coins for Dragon Evolution.</p>
        <button class="gbtn gold" data-buy="exchange-coins-sm">EXCHANGE · 25 💎</button>
      </article>
      <article class="shop-card">
        <div class="card-emblem">💰</div>
        <h3>IMPERIAL HOARD (+12,000)</h3>
        <p>Exchange 100 Gems for 12,000 Gold Coins (+20% Bonus!).</p>
        <button class="gbtn gold" data-buy="exchange-coins-lg">EXCHANGE · 100 💎</button>
      </article>
    </div>`;
  }

  return `<div class="arena-theme-grid">${ARENA_THEMES.map(t => {
    const eq = save.arenaTheme === t.id;
    return `<button type="button" class="theme-card ${eq ? 'selected' : ''}" data-select-theme="${t.id}" style="background:${t.previewGradient}">
      <span class="theme-badge">${t.badge}</span>
      <strong>${t.name}</strong>
      <small>${t.subtitle}</small>
      <span class="theme-status">${eq ? '✓ EQUIPPED' : 'SELECT ARENA'}</span>
    </button>`;
  }).join('')}</div>`;
}

export function renderModalContent(kind, save) {
  if (kind === 'pass') {
    const curTier = getPassTier(save.passXp);
    const tierProg = Math.round(((save.passXp % PASS_XP_PER_TIER) / PASS_XP_PER_TIER) * 100);
    return `
      <div class="pass-hero">
        <div>
          <span class="rarity-pill" style="--rc:#fbbf24">SEASON 1 · SOVEREIGN ASCENT</span>
          <h3>TIER ${curTier} / 30 <small>(${fmt(save.passXp)} PASS XP)</small></h3>
          <div class="q-bar"><i style="width:${tierProg}%"></i></div>
        </div>
        ${save.passPremium
          ? `<span class="rarity-pill" style="--rc:#34d399">✓ PREMIUM ACTIVE</span>`
          : `<button class="gbtn gold sm" data-action="unlock-pass">👑 UNLOCK PREMIUM (${PASS_PREMIUM_GEM_COST} 💎)</button>`}
      </div>
      <div class="pass-list">${DRAGON_PASS_TIERS.map(t => {
        const unlocked = t.tier <= curTier;
        const freeClaimed = save.passClaimedFree.includes(t.tier);
        const premClaimed = save.passClaimedPrem.includes(t.tier);
        return `<div class="pass-row ${unlocked ? 'unlocked' : ''}">
          <span class="pass-num">T${t.tier}</span>
          <div class="pass-cell">
            <small>FREE</small><b>${rewardText(t.free)}</b>
            <button class="gbtn ${unlocked && !freeClaimed ? 'emerald' : 'slate'} sm" data-claim-pass="free:${t.tier}" ${!unlocked || freeClaimed ? 'disabled' : ''}>${freeClaimed ? '✓' : unlocked ? 'CLAIM' : '🔒'}</button>
          </div>
          <div class="pass-cell prem">
            <small>👑 SOVEREIGN</small><b>${rewardText(t.premium)}</b>
            <button class="gbtn ${unlocked && save.passPremium && !premClaimed ? 'gold' : 'slate'} sm" data-claim-pass="premium:${t.tier}" ${!unlocked || !save.passPremium || premClaimed ? 'disabled' : ''}>${premClaimed ? '✓' : unlocked && save.passPremium ? 'CLAIM' : '🔒'}</button>
          </div>
        </div>`;
      }).join('')}</div>`;
  }

  if (kind === 'missions') {
    return `<div class="modal-list">${DAILY_MISSIONS.map(m => {
      const val = save.daily.values[m.id] || 0, done = save.daily.claimed.includes(m.id), ready = val >= m.target && !done;
      return `<div class="quest-row"><span class="q-icon">${m.icon}</span><div class="q-body"><strong>${m.title}</strong><small>${m.desc} (${fmt(Math.min(val, m.target))}/${fmt(m.target)})</small><div class="q-bar"><i style="width:${Math.min(100, Math.round((val / m.target) * 100))}%"></i></div></div><div class="q-right"><span class="q-reward">${rewardText(m.reward)}</span><button class="gbtn ${ready ? 'gold' : 'slate'} sm" data-claim="mission:${m.id}" ${!ready ? 'disabled' : ''}>${done ? '✓ DONE' : ready ? 'CLAIM' : 'ACTIVE'}</button></div></div>`;
    }).join('')}</div>`;
  }

  if (kind === 'events') {
    return `<div class="modal-list">${WEEKLY_EVENTS.map(ev => {
      const val = save.weekly.values[ev.kind] || 0, done = save.weekly.claimed.includes(ev.id), ready = val >= ev.target && !done;
      return `<div class="quest-row"><span class="q-icon">🏆</span><div class="q-body"><strong>${ev.title}</strong><small>${ev.desc} (${fmt(Math.min(val, ev.target))}/${fmt(ev.target)})</small><div class="q-bar"><i style="width:${Math.min(100, Math.round((val / ev.target) * 100))}%"></i></div></div><div class="q-right"><span class="q-reward">${rewardText(ev.reward)}</span><button class="gbtn ${ready ? 'gold' : 'slate'} sm" data-claim="event:${ev.id}" ${!ready ? 'disabled' : ''}>${done ? '✓ DONE' : ready ? 'CLAIM' : 'PLAY'}</button></div></div>`;
    }).join('')}</div>`;
  }

  if (kind === 'rewards') {
    const today = utcDay(), claimedToday = save.login.lastDay === today, activeDay = (save.login.streak || 0) % 7;
    return `
      <div class="rewards-block">
        <h3>7-DAY SOVEREIGN LOGIN STREAK (${save.login.streak || 0} DAYS)</h3>
        <div class="streak-grid">${LOGIN_REWARDS.map((r, i) => `<div class="streak-day ${i === activeDay ? 'today' : ''} ${i < activeDay ? 'past' : ''}"><small>DAY ${i + 1}</small><b>${rewardText(r)}</b></div>`).join('')}</div>
        <button class="gbtn gold wide" data-claim="login:today" ${claimedToday ? 'disabled' : ''}>${claimedToday ? '✓ TODAY COLLECTED' : '🎁 CLAIM DAILY REWARD'}</button>
      </div>
      <div class="rewards-block">
        <h3>CAREER MILESTONES</h3>
        <div class="modal-list">${MILESTONES.map(ms => {
          const val = save.career[ms.kind] || 0, done = save.milestonesClaimed.includes(ms.id), ready = val >= ms.target && !done;
          return `<div class="quest-row"><span class="q-icon">${ms.icon}</span><div class="q-body"><strong>${ms.label}</strong><small>${fmt(Math.min(val, ms.target))} / ${fmt(ms.target)}</small></div><div class="q-right"><span class="q-reward">${rewardText(ms.reward)}</span><button class="gbtn ${ready ? 'gold' : 'slate'} sm" data-claim="milestone:${ms.id}" ${!ready ? 'disabled' : ''}>${done ? '✓' : ready ? 'CLAIM' : 'LOCKED'}</button></div></div>`;
        }).join('')}</div>
      </div>`;
  }

  if (kind === 'leaderboard') {
    const { league, standings } = buildLeagueStandings(save);
    return `
      <div class="lb-summary">
        <div><small>WEEKLY LEAGUE</small><strong>${league.icon} ${league.name}</strong></div>
        <div><small>ALL-TIME BEST</small><strong>${fmt(save.career.best)}</strong></div>
        <div><small>TOTAL WINS</small><strong>${fmt(save.career.wins)}</strong></div>
      </div>
      <h3 class="sub-section-title">WEEKLY LEAGUE & GHOST RIVAL STANDINGS</h3>
      <div class="rank-list">${standings.map((p, i) => `
        <div class="rank-item ${p.isYou ? 'is-you' : ''}">
          <span>${i === 0 ? '👑' : '#' + (i + 1)}</span>
          <b>${esc(p.name)}</b>
          <strong>${fmt(p.score)}</strong>
        </div>`).join('')}</div>`;
  }

  if (kind === 'profile') {
    const dragon = getDragonById(save.skin);
    const winRate = save.career.matches ? Math.round((save.career.wins / save.career.matches) * 100) : 0;
    return `
      <div class="profile-head">
        <div class="profile-crest">🐉</div>
        <div class="profile-meta"><h2>${esc(save.name)}</h2><small>Sovereign Lv.${save.level} · ${dragon.name} (Lv.${save.dragonLevels[save.skin] || 1})</small></div>
        <button class="gbtn royal sm" data-action="rename-player">✎ RENAME</button>
      </div>
      <div class="lb-summary">
        <div><small>MATCHES</small><strong>${fmt(save.career.matches)}</strong></div>
        <div><small>WIN RATE</small><strong>${winRate}%</strong></div>
        <div><small>DRAGONS</small><strong>${save.ownedSkins.length}/${DRAGONS.length}</strong></div>
      </div>
      <h3 class="sub-section-title">POWER-UP ARSENAL</h3>
      <div class="arsenal-row">
        <div>🧲 Magnet <b>×${save.inventory.magnet || 0}</b></div>
        <div>⚡ Haste <b>×${save.inventory.speed || 0}</b></div>
        <div>🛡️ Shield <b>×${save.inventory.shield || 0}</b></div>
      </div>`;
  }

  // Settings + Security/Telemetry Status
  const s = save.settings;
  const crashes = getCrashTelemetry();
  return `
    <div class="settings-grid">
      <label class="set-row"><span>🔊 Master Volume (${Math.round(s.masterVol * 100)}%)</span><input type="range" min="0" max="1" step="0.05" value="${s.masterVol}" data-setting="masterVol"></label>
      <label class="set-row"><span>🎵 Music (BGM) (${Math.round(s.bgmVol * 100)}%)</span><input type="range" min="0" max="1" step="0.05" value="${s.bgmVol}" data-setting="bgmVol"></label>
      <label class="set-row"><span>💥 Sound FX (${Math.round(s.sfxVol * 100)}%)</span><input type="range" min="0" max="1" step="0.05" value="${s.sfxVol}" data-setting="sfxVol"></label>
      <label class="set-row"><span>📳 Haptic Vibration</span><input type="checkbox" ${s.haptics ? 'checked' : ''} data-setting="haptics"></label>
      <label class="set-row"><span>🎮 3D Graphics & HDR Bloom</span>
        <select data-setting="graphics">
          <option value="low" ${s.graphics === 'low' ? 'selected' : ''}>Low (Battery / No Bloom)</option>
          <option value="medium" ${s.graphics === 'medium' ? 'selected' : ''}>Medium (Balanced)</option>
          <option value="high" ${s.graphics === 'high' ? 'selected' : ''}>High (HDR Bloom + Instancing)</option>
          <option value="ultra" ${s.graphics === 'ultra' ? 'selected' : ''}>Ultra (2x DPR + Max Bloom)</option>
        </select></label>
      <label class="set-row"><span>🎥 Arena Camera Angle</span>
        <select data-setting="cameraStyle">
          <option value="dynamic3d" ${s.cameraStyle === 'dynamic3d' ? 'selected' : ''}>Dynamic 3D Chase</option>
          <option value="tactical" ${s.cameraStyle === 'tactical' ? 'selected' : ''}>High Tactical View</option>
        </select></label>
      <label class="set-row"><span>📊 Show Live FPS & Draw Calls</span><input type="checkbox" ${s.showFps ? 'checked' : ''} data-setting="showFps"></label>
    </div>
    <p class="security-note">🔒 Save Integrity: Signed IndexedDB Active · Crash Logs: ${crashes.length} · CSP Protected</p>
    <div class="settings-footer">
      <button class="gbtn slate sm" data-action="replay-tutorial">🎓 REPLAY TUTORIAL</button>
      <button class="gbtn crimson sm" data-action="reset-save">⚠ RESET SAVE</button>
    </div>`;
}
