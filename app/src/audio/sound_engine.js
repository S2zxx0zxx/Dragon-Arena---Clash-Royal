/**
 * Dragon Arena — Procedural Multi-Track WebAudio BGM, Layered SFX & Haptics Engine
 * Zero external audio assets needed: generates rich distinct BGM tracks per screen
 * (Lobby Orchestral, Arena High-Energy Battle, Lab/Shop Mystical) + 15+ layered SFX + Haptics.
 */

const TRACKS = {
  home: {
    tempo: 92,
    scale: [220, 261.63, 293.66, 329.63, 392.0, 440.0, 523.25], // A minor heroic
    bass: [110, 110, 87.31, 98.0, 110, 110, 130.81, 98.0],
    arp: [0, 2, 4, 5, 4, 2, 3, 1],
    wave: 'triangle',
    pad: true,
  },
  arena: {
    tempo: 132,
    scale: [146.83, 174.61, 196.0, 220.0, 261.63, 293.66, 349.23, 392.0], // D minor epic combat
    bass: [73.42, 73.42, 87.31, 98.0, 110.0, 98.0, 87.31, 65.41],
    arp: [0, 3, 5, 7, 5, 3, 4, 2],
    wave: 'sawtooth',
    pad: false,
  },
  lab: {
    tempo: 78,
    scale: [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33], // C pentatonic mystical
    bass: [130.81, 130.81, 110.0, 110.0, 87.31, 87.31, 98.0, 98.0],
    arp: [0, 4, 5, 6, 4, 2, 3, 1],
    wave: 'sine',
    pad: true,
  },
};

export class SoundEngine {
  constructor(getSettings = () => ({ masterVol: 0.85, bgmVol: 0.55, sfxVol: 0.85, haptics: true })) {
    this.getSettings = getSettings;
    this.ctx = null;
    this.masterGain = null;
    this.bgmGain = null;
    this.sfxGain = null;
    this.currentTrack = null;
    this.stepIndex = 0;
    this.bgmTimer = null;
    this.feverMode = false;
    this.lastPickupAt = 0;
  }

  ensureContext() {
    try {
      const Ctor = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Ctor) return false;
      if (!this.ctx) {
        this.ctx = new Ctor();
        this.masterGain = this.ctx.createGain();
        this.bgmGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();
        this.bgmGain.connect(this.masterGain);
        this.sfxGain.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      this.syncVolumes();
      return true;
    } catch {
      return false;
    }
  }

  syncVolumes() {
    if (!this.ctx || !this.masterGain) return;
    const s = this.getSettings();
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(Math.max(0, Math.min(1, s.masterVol ?? 0.85)), now, 0.04);
    this.bgmGain.gain.setTargetAtTime(Math.max(0, Math.min(1, (s.bgmVol ?? 0.55) * 0.24)), now, 0.08);
    this.sfxGain.gain.setTargetAtTime(Math.max(0, Math.min(1, (s.sfxVol ?? 0.85) * 0.45)), now, 0.04);
  }

  vibrate(pattern) {
    try {
      const s = this.getSettings();
      if (!s.haptics) return;
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern);
      }
    } catch {
      // Ignore unsupported environments
    }
  }

  setTrack(name) {
    if (this.currentTrack === name) return;
    this.currentTrack = name;
    this.stepIndex = 0;
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
    if (!name || !TRACKS[name]) return;
    const tickBgm = () => this.playBgmStep();
    const baseMs = (60 / TRACKS[name].tempo) * 500; // eighth notes
    this.bgmTimer = setInterval(tickBgm, baseMs);
  }

  setFever(active) {
    if (this.feverMode === active) return;
    this.feverMode = active;
    if (this.currentTrack === 'arena' && this.bgmTimer) {
      clearInterval(this.bgmTimer);
      const tempo = active ? 156 : TRACKS.arena.tempo;
      this.bgmTimer = setInterval(() => this.playBgmStep(), (60 / tempo) * 500);
    }
  }

  playBgmStep() {
    const s = this.getSettings();
    if ((s.masterVol ?? 0.85) <= 0.01 || (s.bgmVol ?? 0.55) <= 0.01) return;
    if (!this.ctx || this.ctx.state !== 'running') return;
    const track = TRACKS[this.currentTrack];
    if (!track) return;

    const now = this.ctx.currentTime;
    const step = this.stepIndex++;
    const bar = Math.floor(step / 8) % track.bass.length;

    // Bass pulse on beats 0 and 4
    if (step % 4 === 0) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(this.currentTrack === 'arena' ? 380 : 260, now);
      osc.type = this.currentTrack === 'arena' ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(track.bass[bar], now);
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.32, now + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc.connect(filter);
      filter.connect(g);
      g.connect(this.bgmGain);
      osc.start(now);
      osc.stop(now + 0.58);
    }

    // Melodic Arpeggio
    const noteIdx = track.arp[step % track.arp.length];
    const freq = track.scale[noteIdx % track.scale.length] * (this.feverMode ? 1.122 : 1.0);
    const osc2 = this.ctx.createOscillator();
    const g2 = this.ctx.createGain();
    const filt2 = this.ctx.createBiquadFilter();
    filt2.type = 'lowpass';
    filt2.frequency.setValueAtTime(this.currentTrack === 'arena' ? 1400 : 950, now);
    osc2.type = track.wave;
    osc2.frequency.setValueAtTime(freq, now);
    g2.gain.setValueAtTime(0.001, now);
    g2.gain.linearRampToValueAtTime(0.14, now + 0.02);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
    osc2.connect(filt2);
    filt2.connect(g2);
    g2.connect(this.bgmGain);
    osc2.start(now);
    osc2.stop(now + 0.36);

    // Arena driving percussive kick on every 2nd step
    if (this.currentTrack === 'arena' && step % 2 === 0) {
      const kick = this.ctx.createOscillator();
      const kg = this.ctx.createGain();
      kick.type = 'sine';
      kick.frequency.setValueAtTime(125, now);
      kick.frequency.exponentialRampToValueAtTime(38, now + 0.11);
      kg.gain.setValueAtTime(0.28, now);
      kg.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
      kick.connect(kg);
      kg.connect(this.bgmGain);
      kick.start(now);
      kick.stop(now + 0.14);
    }
  }

  playTone(freqStart, freqEnd, dur, type = 'sine', vol = 0.25, delay = 0) {
    if (!this.ensureContext()) return;
    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(30, freqStart), now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, freqEnd), now + dur);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(vol, now + Math.min(0.015, dur * 0.2));
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  playNoise(dur = 0.25, cutoff = 900, vol = 0.25) {
    if (!this.ensureContext()) return;
    const now = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(cutoff, now);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain);
    src.start(now);
  }

  play(name, opts = {}) {
    const s = this.getSettings();
    if ((s.masterVol ?? 0.85) <= 0.01 || (s.sfxVol ?? 0.85) <= 0.01) return false;
    if (!this.ensureContext()) return false;

    switch (name) {
      case 'tap':
        this.playTone(540, 720, 0.045, 'triangle', 0.16);
        this.vibrate(10);
        break;
      case 'confirm':
        this.playTone(440, 660, 0.07, 'triangle', 0.22);
        this.playTone(660, 880, 0.10, 'sine', 0.20, 0.05);
        this.vibrate(18);
        break;
      case 'pickup': {
        const now = performance.now();
        if (now - this.lastPickupAt < 65) return false;
        this.lastPickupAt = now;
        const pitch = 1 + Math.min(5, opts.combo || 0) * 0.08;
        this.playTone(640 * pitch, 980 * pitch, 0.08, 'sine', opts.big ? 0.28 : 0.18);
        if (opts.big) this.playTone(980 * pitch, 1320 * pitch, 0.12, 'triangle', 0.20, 0.04);
        this.vibrate(opts.big ? 18 : 8);
        break;
      }
      case 'kill':
        this.playNoise(0.32, 420, 0.40);
        this.playTone(220, 65, 0.28, 'sawtooth', 0.35);
        this.playTone(523.25, 1046.5, 0.22, 'triangle', 0.28, 0.08);
        this.vibrate([35, 25, 55]);
        break;
      case 'fury':
        this.playNoise(0.45, 700, 0.45);
        this.playTone(180, 520, 0.18, 'sawtooth', 0.34);
        this.playTone(520, 120, 0.32, 'sawtooth', 0.30, 0.12);
        this.vibrate([45, 20, 65]);
        break;
      case 'roar':
        this.playNoise(0.38, 340, 0.36);
        this.playTone(165, 78, 0.36, 'sawtooth', 0.32);
        this.vibrate([30, 20, 40]);
        break;
      case 'power':
        this.playTone(392, 784, 0.14, 'triangle', 0.26);
        this.playTone(587, 1174, 0.18, 'sine', 0.22, 0.06);
        this.vibrate(25);
        break;
      case 'fever':
        [523, 659, 784, 1046].forEach((f, i) => this.playTone(f, f * 1.03, 0.14, 'triangle', 0.24, i * 0.06));
        this.vibrate([25, 15, 25, 15, 45]);
        break;
      case 'death':
        this.playNoise(0.45, 280, 0.38);
        this.playTone(240, 55, 0.48, 'sawtooth', 0.32);
        this.vibrate([70, 30, 90]);
        break;
      case 'reward':
      case 'crate':
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.playTone(f, f * 1.02, 0.18, 'triangle', 0.24, i * 0.075));
        this.vibrate([20, 20, 45]);
        break;
      case 'upgrade':
        [440, 554.37, 659.25, 880].forEach((f, i) => this.playTone(f, f * 1.05, 0.16, 'sine', 0.26, i * 0.065));
        this.vibrate([25, 15, 50]);
        break;
      case 'error':
        this.playTone(210, 150, 0.12, 'sawtooth', 0.20);
        this.vibrate(35);
        break;
      default:
        this.playTone(500, 620, 0.05, 'sine', 0.15);
    }
    return true;
  }

  destroy() {
    if (this.bgmTimer) clearInterval(this.bgmTimer);
    if (this.ctx && this.ctx.state !== 'closed') this.ctx.close().catch(() => {});
  }
}
