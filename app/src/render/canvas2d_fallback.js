/**
 * Dragon Arena — Self-Healing Canvas2D Emergency Fallback Renderer
 * Automatically activates if a legacy/low-end device rejects WebGL2 so the
 * game remains 100% playable without ever crashing or showing a blank screen.
 */

import { getDragonById } from '../config/dragons.js';

export class Canvas2DFallbackEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.isFallback = true;
    this.scene = 'splash';
    this.heroSkin = 'neon_dragonling';
    this.heroLevel = 1;
    this.arenaThemeIndex = 0;
    this.quality = 'medium';
    this.cameraStyle = 'dynamic3d';
    this.arena = null;
    this.time = 0;
    this.camX = 0;
    this.camY = 0;
    this.scale = 12;
  }

  triggerShake() {}
  triggerHeroRoar() {}
  rotateShowcase() {}
  zoomShowcase() {}
  resetShowcase() {}
  startCrateCeremony() { this.scene = 'crate'; }

  projectToScreen(wx, wy, wz) {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    const sx = w / 2 + (wx - this.camX) * this.scale;
    const sy = h / 2 + (wz - this.camY) * this.scale - wy * 5;
    return { x: sx, y: sy, visible: sx > -40 && sx < w + 40 && sy > -40 && sy < h + 40 };
  }

  render(dt = 0.016) {
    const { canvas, ctx } = this;
    if (!ctx) return;
    this.time += dt;
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }

    ctx.fillStyle = '#090f20';
    ctx.fillRect(0, 0, w, h);

    if (this.scene !== 'arena' || !this.arena) {
      const dm = getDragonById(this.heroSkin);
      const rgb = dm.primary.map(v => Math.round(v * 255)).join(',');
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.fillStyle = `rgb(${rgb})`;
      ctx.beginPath();
      ctx.arc(0, Math.sin(this.time * 2) * 10, 44, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    const you = this.arena.players.find(p => p.id === 'you');
    if (you) {
      this.camX += (you.x - this.camX) * 0.15;
      this.camY += (you.y - this.camY) * 0.15;
    }

    // Arena Boundary Ring
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(w / 2 - this.camX * this.scale, h / 2 - this.camY * this.scale, this.arena.currentRadius * this.scale, 0, Math.PI * 2);
    ctx.stroke();

    // Food
    for (const f of this.arena.food) {
      const pt = this.projectToScreen(f.x, 0, f.y);
      if (!pt.visible) continue;
      ctx.fillStyle = `rgb(${f.color.map(v => Math.round(v * 255)).join(',')})`;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, f.scale * 7, 0, Math.PI * 2);
      ctx.fill();
    }

    // Dragons
    for (const p of this.arena.players) {
      if (!p.alive) continue;
      const dm = getDragonById(p.skin);
      ctx.fillStyle = `rgb(${dm.primary.map(v => Math.round(v * 255)).join(',')})`;
      for (let i = p.body.length - 1; i >= 0; i--) {
        const pt = this.projectToScreen(p.body[i].x, 0, p.body[i].y);
        if (!pt.visible) continue;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, i === 0 ? 11 : 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
