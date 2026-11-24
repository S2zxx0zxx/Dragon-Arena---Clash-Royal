/**
 * Dragon Arena v3.0 — 3D-Projected Arena HUD, Bounty Tags, Emotes, Landmarks Minimap & 15s Interactive Tutorial
 */

const fmt = (n) => Math.round(Number(n) || 0).toLocaleString('en-US');

export class ArenaHUD {
  constructor() {
    this.overlay = document.getElementById('arena-overlay');
    this.ctx = this.overlay?.getContext('2d') || null;
    this.minimap = document.getElementById('minimap-canvas');
    this.mctx = this.minimap?.getContext('2d') || null;
    this.lastHudSync = 0;
  }

  renderOverlay(arena, engine) {
    const { overlay, ctx } = this;
    if (!overlay || !ctx || !arena || !engine) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.max(1, Math.round(overlay.clientWidth * dpr));
    const h = Math.max(1, Math.round(overlay.clientHeight * dpr));
    if (overlay.width !== w || overlay.height !== h) { overlay.width = w; overlay.height = h; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, overlay.clientWidth, overlay.clientHeight);

    // 1. Floating 3D Dragon Nameplates, Wanted Bounty Tags, Boss HP & Emotes
    for (let i = 0; i < arena.players.length; i++) {
      const p = arena.players[i];
      if (!p.alive) continue;
      const pt = engine.projectToScreen(p.x, p.isBoss ? 3.8 : 2.35, p.y);
      if (!pt || !pt.visible) continue;

      if (p.isBoss) {
        const bw = 116, bh = 10;
        ctx.fillStyle = 'rgba(10, 14, 28, 0.88)';
        ctx.fillRect(pt.x - bw / 2 - 2, pt.y - 16, bw + 4, bh + 4);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(pt.x - bw / 2, pt.y - 14, bw * (p.hp / p.maxHp), bh);
        ctx.font = '800 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fde68a';
        ctx.fillText(`OBSIDIAN TITAN (${Math.ceil(p.hp)}%)`, pt.x, pt.y - 20);
      } else if (p.id !== 'you') {
        ctx.font = '700 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        const label = p.isBounty ? `🎯 WANTED · ${p.displayName}` : p.displayName;
        const tw = ctx.measureText(label).width + 14;
        ctx.fillStyle = p.isBounty ? 'rgba(185, 28, 28, 0.88)' : 'rgba(6, 10, 22, 0.72)';
        ctx.fillRect(pt.x - tw / 2, pt.y - 11, tw, 17);
        ctx.fillStyle = p.isBounty ? '#fef08a' : arena.leaderId === p.id ? '#fbbf24' : '#e2e8f0';
        ctx.fillText(label, pt.x, pt.y + 2);
      }

      // Dragon Emote Bubble
      if (p.emote && p.emoteTimer > 0) {
        ctx.font = '900 13px system-ui, sans-serif';
        ctx.textAlign = 'center';
        const ew = ctx.measureText(p.emote).width + 18;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect?.(pt.x - ew / 2, pt.y - 40, ew, 22, 10);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fde047';
        ctx.fillText(p.emote, pt.x, pt.y - 25);
      }
    }

    // 2. Floating 3D-Projected Score / Kill / Portal Popups
    for (let i = 0; i < arena.popups.length; i++) {
      const pop = arena.popups[i];
      const pt = engine.projectToScreen(pop.x, 1.8 + pop.age * 2.4, pop.y);
      if (!pt || !pt.visible) continue;
      const alpha = Math.max(0, 1 - pop.age / 0.95);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = '900 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = 'rgba(8, 12, 26, 0.9)';
      ctx.strokeText(pop.text, pt.x, pt.y - pop.age * 28);
      ctx.fillStyle = pop.color || '#fef08a';
      ctx.fillText(pop.text, pt.x, pt.y - pop.age * 28);
      ctx.restore();
    }
  }

  drawMinimap(arena) {
    const { minimap, mctx } = this;
    if (!minimap || !mctx || !arena) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = Math.max(64, Math.round(minimap.clientWidth * dpr));
    if (minimap.width !== size || minimap.height !== size) { minimap.width = size; minimap.height = size; }
    const cx = size / 2, cy = size / 2, R = size * 0.45;
    mctx.clearRect(0, 0, size, size);

    mctx.fillStyle = 'rgba(10, 16, 32, 0.74)';
    mctx.beginPath();
    mctx.arc(cx, cy, R, 0, Math.PI * 2);
    mctx.fill();

    const ringR = R * (arena.currentRadius / arena.baseRadius);
    mctx.strokeStyle = arena.mode.stormEnabled ? '#fb7185' : 'rgba(245, 197, 88, 0.65)';
    mctx.lineWidth = 2 * dpr;
    mctx.beginPath();
    mctx.arc(cx, cy, ringR, 0, Math.PI * 2);
    mctx.stroke();

    // Portals (Cyan/Violet Rings) & Pillars (Light Blue Squares)
    for (const pt of arena.portals || []) {
      const mx = cx + (pt.x / arena.baseRadius) * R, my = cy + (pt.y / arena.baseRadius) * R;
      mctx.strokeStyle = pt.id < 2 ? '#38bdf8' : '#c084fc';
      mctx.lineWidth = 1.6 * dpr;
      mctx.beginPath(); mctx.arc(mx, my, 3.2 * dpr, 0, Math.PI * 2); mctx.stroke();
    }

    // High-value Food & Powerups
    for (let i = 0; i < arena.food.length; i++) {
      const f = arena.food[i];
      if (f.source !== 'death' && !f.isPowerup && f.source !== 'event' && i % 3 !== 0) continue;
      const mx = cx + (f.x / arena.baseRadius) * R, my = cy + (f.y / arena.baseRadius) * R;
      mctx.fillStyle = f.isPowerup ? '#38bdf8' : f.source === 'death' ? '#fbbf24' : 'rgba(148, 163, 184, 0.45)';
      mctx.beginPath(); mctx.arc(mx, my, (f.isPowerup || f.source === 'death' ? 2.4 : 1.1) * dpr, 0, Math.PI * 2); mctx.fill();
    }

    // Dragons (Player = Gold Arrow, Wanted Bounty = Pulsing Red Ring, Boss = Large Red Square)
    for (const p of arena.players) {
      if (!p.alive) continue;
      const mx = cx + (p.x / arena.baseRadius) * R, my = cy + (p.y / arena.baseRadius) * R;
      mctx.save();
      mctx.translate(mx, my);
      mctx.rotate(p.angle);
      if (p.id === 'you') {
        mctx.fillStyle = '#fbbf24';
        const s = 5.2 * dpr;
        mctx.beginPath(); mctx.moveTo(s, 0); mctx.lineTo(-s * 0.7, -s * 0.65); mctx.lineTo(-s * 0.7, s * 0.65); mctx.closePath(); mctx.fill();
      } else if (p.isBoss) {
        mctx.fillStyle = '#ef4444';
        const s = 5.6 * dpr;
        mctx.fillRect(-s / 2, -s / 2, s, s);
      } else {
        mctx.fillStyle = p.isBounty ? '#ef4444' : arena.leaderId === p.id ? '#fde047' : '#f43f5e';
        mctx.beginPath(); mctx.arc(0, 0, (p.isBounty ? 3.8 : 2.6) * dpr, 0, Math.PI * 2); mctx.fill();
      }
      mctx.restore();
    }
  }

  syncDOM(arena, save, fps = 60, drawCalls = 0) {
    const now = performance.now();
    if (now - this.lastHudSync < 85) return;
    this.lastHudSync = now;

    const you = arena.players.find(p => p.id === 'you');
    if (!you) return;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('hud-score', fmt(you.score));
    set('hud-kills', fmt(you.kills));
    set('hud-alive', fmt(arena.players.filter(p => p.alive).length));
    set('hud-length', fmt(you.segmentCount));

    const sec = arena.mode.durationSec > 0 ? Math.max(0, Math.ceil(arena.mode.durationSec - arena.elapsed)) : Math.floor(arena.elapsed);
    set('hud-timer', `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`);

    const stamFill = document.getElementById('stamina-fill');
    if (stamFill) stamFill.style.width = `${Math.round((you.stamina / you.maxStamina) * 100)}%`;

    const furyFill = document.getElementById('fury-fill');
    const furyBtn = document.getElementById('fury-btn');
    const furyPct = Math.round(you.fury);
    if (furyFill) furyFill.style.height = `${furyPct}%`;
    if (furyBtn) { furyBtn.classList.toggle('ready', furyPct >= 100); furyBtn.disabled = furyPct < 100; }

    // Interactive 15-Second First-Time Tutorial Banner
    const tutEl = document.getElementById('hud-tutorial');
    if (tutEl) {
      if (!save.tutorialDone && arena.elapsed < 16) {
        const msg = arena.elapsed < 4 ? '🕹 STEP 1: Drag Joystick or Move Mouse to Steer!'
          : arena.elapsed < 8 ? '⚡ STEP 2: Hold BOOST (Space) or Hit Green Speed Pads!'
          : arena.elapsed < 12 ? '🌀 STEP 3: Fly Through Glowing Portals & Cut Off Rivals!'
          : '🔥 STEP 4: Fill FURY Bar & Press FURY (E) to Shatter Rivals!';
        tutEl.textContent = msg;
        tutEl.classList.add('visible');
      } else {
        tutEl.classList.remove('visible');
        if (!save.tutorialDone && arena.elapsed >= 16) save.tutorialDone = true;
      }
    }

    const comboEl = document.getElementById('hud-combo');
    if (comboEl) {
      if (you.feverTimer > 0) {
        comboEl.textContent = `🔥 FEVER OVERDRIVE · ${you.feverTimer.toFixed(1)}s`;
        comboEl.className = 'hud-combo fever visible';
      } else if (you.combo >= 2) {
        comboEl.textContent = `⚡ COMBO x${you.combo}`;
        comboEl.className = 'hud-combo visible';
      } else comboEl.className = 'hud-combo';
    }

    const evEl = document.getElementById('hud-world-event');
    if (evEl) {
      if (arena.activeWorldEvent) {
        evEl.innerHTML = `<b>✦ ${arena.activeWorldEvent.title}</b> <span>${Math.ceil(arena.activeWorldEvent.remaining)}s</span>`;
        evEl.classList.add('visible');
      } else evEl.classList.remove('visible');
    }

    const edgeDist = arena.currentRadius - Math.hypot(you.x, you.y);
    const warnEl = document.getElementById('boundary-warning');
    if (warnEl) warnEl.classList.toggle('visible', you.alive && edgeDist < 12);

    const sorted = [...arena.players].sort((a, b) => b.score - a.score);
    const top = sorted.slice(0, 5);
    if (!top.includes(you)) top.push(you);
    const lb = document.getElementById('hud-leaderboard');
    if (lb) {
      lb.innerHTML = top.map(pl => {
        const pos = sorted.indexOf(pl) + 1;
        const badge = pl.isBounty ? '🎯' : pos === 1 ? '👑' : `#${pos}`;
        return `<li class="${pl.id === 'you' ? 'is-you' : ''} ${!pl.alive ? 'is-dead' : ''}">
          <span class="lb-rank">${badge}</span>
          <span class="lb-name">${pl.displayName}</span>
          <span class="lb-score">${fmt(pl.score)}</span>
        </li>`;
      }).join('');
    }

    const kf = document.getElementById('hud-killfeed');
    if (kf) {
      const recent = arena.killFeed.filter(k => arena.elapsed - k.time < 5.5).slice(0, 3);
      kf.innerHTML = recent.map(k =>
        `<div class="kf-row ${k.isPlayerKill ? 'you-kill' : ''}">${k.wasBounty ? '🎯 ' : ''}${k.killerName} <span>⚔</span> ${k.victimName}</div>`
      ).join('');
    }

    ['magnet', 'speed', 'shield'].forEach(k => set(`pwr-${k}-cnt`, save.inventory[k] || 0));
    const buffs = [];
    if (you.shieldTicks > 0) buffs.push(`🛡 ${Math.ceil(you.shieldTicks / 60)}s`);
    if (you.speedTicks > 0) buffs.push(`⚡ ${Math.ceil(you.speedTicks / 60)}s`);
    if (you.magnetTicks > 0) buffs.push(`🧲 ${Math.ceil(you.magnetTicks / 60)}s`);
    if (you.isBounty) buffs.push('🎯 WANTED');
    set('hud-buffs', buffs.join(' · '));

    const fpsEl = document.getElementById('hud-fps');
    if (fpsEl) {
      fpsEl.hidden = !save.settings.showFps;
      if (save.settings.showFps) fpsEl.textContent = `${Math.round(fps)} FPS · ${drawCalls} DC`;
    }

    this.drawMinimap(arena);
  }
}
