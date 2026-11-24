/**
 * Dragon Arena v3.0 — Unity-Level WebGL2 Engine
 * Upgrades:
 * - Offscreen HDR Bloom Post-Processing Pipeline (Bright Extract + Blur + Additive Composite)
 * - True GPU Instanced Rendering (drawArraysInstanced for Dragon Body Segments, Food & Particles)
 * - Procedural Bite-Lunge, Wing-Fold Boost & Visual Lv.1->Lv.5 Evolution Aura Scaling
 * - 3D Arena Landmarks: Paired Teleport Portals, Floor Boost Pads, Destructible Crystal Pillars
 * - 3D Animated Crate Opening Ceremony Scene with Rarity Light Beam & Dragon Reveal
 */

import { getDragonById, RARITY_CONFIG } from '../config/dragons.js';
import { ARENA_THEMES } from '../config/arenas.js';
import {
  buildDragonHeadMesh, buildDragonBodyMesh, buildDragonWingMesh, buildDragonTailMesh,
  buildFoodCrystalMesh, buildPowerupOrbMesh, buildCrownMesh, buildAuraRingMesh,
  buildPedestalMesh, buildArenaBoundaryMesh, buildParticleMesh, buildShadowDiscMesh,
  buildGroundPlaneMesh, buildPillarMesh, buildPortalMesh, buildBoostPadMesh, buildCrateMesh,
} from './mesh_builder.js';

const VSH_STD = `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNorm;
layout(location=2) in float aMat;
uniform mat4 uModel;
uniform mat4 uVP;
out vec3 vWorld;
out vec3 vNorm;
out float vMat;
void main() {
  vec4 wp = uModel * vec4(aPos, 1.0);
  vWorld = wp.xyz;
  vNorm = normalize(mat3(uModel) * aNorm);
  vMat = aMat;
  gl_Position = uVP * wp;
}`;

// GPU Instanced Vertex Shader: aInstPosScale = (x, y, z, scale), aInstYawColor = (yaw, r, g, b)
const VSH_INST = `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNorm;
layout(location=2) in float aMat;
layout(location=3) in vec4 aInstPosScale;
layout(location=4) in vec4 aInstYawColor;
uniform mat4 uVP;
uniform float uUseInstColor;
out vec3 vWorld;
out vec3 vNorm;
out float vMat;
out vec3 vInstTint;
void main() {
  float yaw = aInstYawColor.x;
  float cy = cos(yaw), sy = sin(yaw);
  vec3 p = aPos * aInstPosScale.w;
  vec3 rp = vec3(p.x * cy + p.z * sy, p.y, -p.x * sy + p.z * cy);
  vec3 rn = vec3(aNorm.x * cy + aNorm.z * sy, aNorm.y, -aNorm.x * sy + aNorm.z * cy);
  vWorld = rp + aInstPosScale.xyz;
  vNorm = normalize(rn);
  vMat = aMat;
  vInstTint = mix(vec3(1.0), aInstYawColor.yzw, uUseInstColor);
  gl_Position = uVP * vec4(vWorld, 1.0);
}`;

const FSH_MAIN = `#version 300 es
precision highp float;
in vec3 vWorld;
in vec3 vNorm;
in float vMat;
uniform vec3 uCam, uPrimary, uSecondary, uAccent, uEmissive;
uniform vec3 uFloorBase, uFloorAccent, uRuneColor, uFogColor, uSunColor;
uniform float uTime, uMode, uRadius, uAura, uAlpha;
out vec4 frag;
void main() {
  if (uMode > 2.5 && uMode < 3.5) { frag = vec4(0.01, 0.02, 0.05, uAlpha); return; }
  if (uMode > 3.5) { frag = vec4(uAccent * 1.65, uAlpha); return; }
  if (uMode > 0.5 && uMode < 1.5) {
    vec2 p = vWorld.xz;
    float r = length(p), angle = atan(p.y, p.x);
    vec2 tile = abs(fract(p * 0.14) - 0.5);
    float grout = smoothstep(0.45, 0.49, max(tile.x, tile.y));
    float ringLines = smoothstep(0.95, 0.99, abs(sin(r * 0.22)));
    float spokeLines = smoothstep(0.985, 0.998, abs(sin(angle * 6.0)));
    vec3 col = mix(uFloorBase, uFloorAccent, 0.35 + 0.25 * sin(r * 0.08 + uTime * 0.3));
    col = mix(col, uFloorBase * 0.62, grout * 0.48);
    float centerSeal = smoothstep(14.5, 13.8, r) * smoothstep(12.2, 13.0, r);
    float innerSeal = smoothstep(5.5, 4.8, r) * smoothstep(3.8, 4.3, r);
    float circuit = max(max(centerSeal, innerSeal), (ringLines * 0.28 + spokeLines * 0.22) * smoothstep(uRadius, 12.0, r));
    col += uRuneColor * circuit * (0.45 + 0.18 * sin(uTime * 1.8 - r * 0.15));
    float edgeDist = uRadius - r;
    float warnBand = smoothstep(11.0, 0.0, edgeDist) * step(0.0, edgeDist);
    col = mix(col, vec3(0.98, 0.18, 0.22), warnBand * (0.38 + 0.22 * sin(uTime * 6.5)));
    if (r > uRadius) {
      col = mix(vec3(0.30, 0.05, 0.09), uFogColor * 0.42, smoothstep(uRadius, uRadius + 8.0, r));
    }
    float fog = clamp((length(uCam - vWorld) - 55.0) / 145.0, 0.0, 0.85);
    frag = vec4(mix(col, uFogColor, fog), 1.0);
    return;
  }
  if (uMode > 1.5 && uMode < 2.5) {
    float scan = 0.5 + 0.5 * sin(vWorld.y * 4.5 - uTime * 4.8);
    vec3 col = mix(uRuneColor, vec3(1.0, 0.22, 0.28), 0.55) + vec3(1.0, 0.72, 0.35) * scan * 0.5;
    frag = vec4(col, clamp(0.30 + 0.30 * scan, 0.18, 0.80));
    return;
  }
  vec3 N = normalize(vNorm), V = normalize(uCam - vWorld);
  if (dot(N, V) < 0.0) N = -N;
  vec3 L = normalize(vec3(0.45, 0.88, 0.36)), H = normalize(L + V);
  vec3 albedo = uPrimary; float metallic = 0.35, emit = 0.0;
  if (vMat > 2.5) { albedo = uEmissive; emit = 1.25; }
  else if (vMat > 1.5) { albedo = uAccent; metallic = 0.78; emit = 0.25 * uAura; }
  else if (vMat > 0.5) { albedo = uSecondary; metallic = 0.48; }
  float NdotL = max(dot(N, L), 0.0), hemi = 0.5 + 0.5 * N.y;
  vec3 ambient = mix(uFogColor * 0.9 + vec3(0.08, 0.09, 0.14), uSunColor * 0.42, hemi);
  float spec = pow(max(dot(N, H), 0.0), mix(24.0, 64.0, metallic));
  float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  vec3 color = albedo * (ambient + uSunColor * NdotL * 0.94);
  color += mix(uSunColor, albedo, metallic) * spec * (0.58 + metallic * 0.55);
  color += mix(uAccent, uEmissive, 0.4) * fresnel * (0.48 + uAura * 0.68);
  if (uAura > 0.85) {
    float irid = 0.5 + 0.5 * sin(vWorld.x * 2.2 + vWorld.z * 2.2 + uTime * 2.8);
    color += mix(uAccent, uEmissive, irid) * fresnel * 0.48;
  }
  color += albedo * emit;
  float fog = clamp((length(uCam - vWorld) - 70.0) / 160.0, 0.0, 0.55);
  color = mix(color, uFogColor, fog);
  frag = vec4(color, uAlpha);
}`;

const FSH_INST = `#version 300 es
precision highp float;
in vec3 vWorld;
in vec3 vNorm;
in float vMat;
in vec3 vInstTint;
uniform vec3 uCam, uPrimary, uSecondary, uAccent, uEmissive, uFogColor, uSunColor;
uniform float uTime, uAura, uUseInstColor;
out vec4 frag;
void main() {
  vec3 N = normalize(vNorm), V = normalize(uCam - vWorld);
  if (dot(N, V) < 0.0) N = -N;
  vec3 L = normalize(vec3(0.45, 0.88, 0.36)), H = normalize(L + V);
  vec3 baseP = mix(uPrimary, vInstTint, uUseInstColor);
  vec3 baseS = mix(uSecondary, vInstTint * 1.15, uUseInstColor);
  vec3 albedo = baseP; float metallic = 0.4, emit = 0.0;
  if (vMat > 2.5) { albedo = mix(uEmissive, vInstTint * 1.3, uUseInstColor); emit = 1.25; }
  else if (vMat > 1.5) { albedo = uAccent; metallic = 0.75; emit = 0.24 * uAura; }
  else if (vMat > 0.5) { albedo = baseS; metallic = 0.48; }
  float NdotL = max(dot(N, L), 0.0), hemi = 0.5 + 0.5 * N.y;
  vec3 ambient = mix(uFogColor * 0.9 + vec3(0.08, 0.09, 0.14), uSunColor * 0.42, hemi);
  float spec = pow(max(dot(N, H), 0.0), 42.0);
  float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  vec3 color = albedo * (ambient + uSunColor * NdotL * 0.94) + uSunColor * spec * 0.65;
  color += mix(uAccent, albedo, 0.5) * fresnel * (0.45 + uAura * 0.65) + albedo * emit;
  float fog = clamp((length(uCam - vWorld) - 70.0) / 160.0, 0.0, 0.55);
  frag = vec4(mix(color, uFogColor, fog), 1.0);
}`;

// Lightweight HDR Bloom Post-Processing Shaders
const VSH_QUAD = `#version 300 es
layout(location=0) in vec2 aPos;
out vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FSH_BLOOM_COMPOSITE = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uScene;
uniform vec2 uTexel;
uniform float uBloomStrength;
out vec4 frag;
vec3 bright(vec3 c) {
  float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
  return c * smoothstep(0.72, 1.35, luma);
}
void main() {
  vec3 base = texture(uScene, vUv).rgb;
  vec3 glow = vec3(0.0);
  if (uBloomStrength > 0.01) {
    vec2 o1 = uTexel * 2.5, o2 = uTexel * 5.2;
    glow += bright(texture(uScene, vUv + vec2( o1.x,  0.0)).rgb) * 0.16;
    glow += bright(texture(uScene, vUv + vec2(-o1.x,  0.0)).rgb) * 0.16;
    glow += bright(texture(uScene, vUv + vec2( 0.0,  o1.y)).rgb) * 0.16;
    glow += bright(texture(uScene, vUv + vec2( 0.0, -o1.y)).rgb) * 0.16;
    glow += bright(texture(uScene, vUv + vec2( o2.x,  o2.y)).rgb) * 0.09;
    glow += bright(texture(uScene, vUv + vec2(-o2.x,  o2.y)).rgb) * 0.09;
    glow += bright(texture(uScene, vUv + vec2( o2.x, -o2.y)).rgb) * 0.09;
    glow += bright(texture(uScene, vUv + vec2(-o2.x, -o2.y)).rgb) * 0.09;
  }
  vec3 hdr = base + glow * uBloomStrength;
  vec3 mapped = hdr / (hdr + vec3(0.88)) * 1.46;
  frag = vec4(mapped, 1.0);
}`;

function compileShader(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'Shader error');
  return s;
}

function linkProg(gl, vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, compileShader(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compileShader(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'Link error');
  return p;
}

function mat4Identity() { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; }
function mat4Mul(a, b) {
  const out = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++)
    out[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  return out;
}
function mat4TRS(tx, ty, tz, rx, ry, rz, sx, sy, sz) {
  const cx = Math.cos(rx), sxr = Math.sin(rx), cy = Math.cos(ry), syr = Math.sin(ry), cz = Math.cos(rz), szr = Math.sin(rz);
  const out = new Float32Array(16);
  out[0] = (cy * cz + syr * sxr * szr) * sx; out[1] = (cx * szr) * sx; out[2] = (-syr * cz + cy * sxr * szr) * sx;
  out[4] = (-cy * szr + syr * sxr * cz) * sy; out[5] = (cx * cz) * sy; out[6] = (syr * szr + cy * sxr * cz) * sy;
  out[8] = (syr * cx) * sz; out[9] = (-sxr) * sz; out[10] = (cy * cx) * sz;
  out[12] = tx; out[13] = ty; out[14] = tz; out[15] = 1;
  return out;
}
function mat4Perspective(fovRad, aspect, near, far) {
  const f = 1 / Math.tan(fovRad * 0.5), nf = 1 / (near - far), out = new Float32Array(16);
  out[0] = f / aspect; out[5] = f; out[10] = (far + near) * nf; out[11] = -1; out[14] = 2 * far * near * nf;
  return out;
}
function mat4LookAt(eye, target) {
  let zx = eye[0] - target[0], zy = eye[1] - target[1], zz = eye[2] - target[2];
  let len = Math.hypot(zx, zy, zz) || 1; zx /= len; zy /= len; zz /= len;
  let xx = zz, xy = 0, xz = -zx; len = Math.hypot(xx, xy, xz) || 1; xx /= len; xy /= len; xz /= len;
  const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
  const out = mat4Identity();
  out[0] = xx; out[1] = yx; out[2] = zx; out[4] = xy; out[5] = yy; out[6] = zy; out[8] = xz; out[9] = yz; out[10] = zz;
  out[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2]);
  out[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2]);
  out[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2]);
  return out;
}

export class DragonWebGLEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = null;
    this.isFallback = false;
    this.lost = false;
    this.time = 0;
    this.scene = 'splash'; // splash | home | lab | arena | crate
    this.heroSkin = 'neon_dragonling';
    this.heroLevel = 1;
    this.arenaThemeIndex = 0;
    this.quality = 'high';
    this.cameraStyle = 'dynamic3d';
    this.arena = null;

    this.orbitYaw = 0.45;
    this.orbitZoom = 1.0;
    this.roarTimer = 0;
    this.crateState = { active: false, phase: 0, rarityColor: [1, 0.8, 0.2], dragonId: 'neon_dragonling' };

    this.camTarget = [0, 0, 0];
    this.camHeight = 25;
    this.shakeTime = 0;
    this.shakeIntensity = 0;
    this.currentVP = null;
    this.drawCalls = 0;

    // Pre-allocated GPU instancing scratch buffers (zero GC!)
    this.instBufA = new Float32Array(600 * 4);
    this.instBufB = new Float32Array(600 * 4);

    this.canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.lost = true; });
    this.canvas.addEventListener('webglcontextrestored', () => { this.lost = false; this.initGL(); });
    this.initGL();
  }

  initGL() {
    const gl = this.canvas.getContext('webgl2', { alpha: false, antialias: true, powerPreference: 'high-performance', depth: true });
    if (!gl) throw new Error('WebGL2 unavailable');
    this.gl = gl;

    this.stdProg = linkProg(gl, VSH_STD, FSH_MAIN);
    this.instProg = linkProg(gl, VSH_INST, FSH_INST);
    this.bloomProg = linkProg(gl, VSH_QUAD, FSH_BLOOM_COMPOSITE);

    this.u = {};
    for (const n of ['uModel', 'uVP', 'uCam', 'uPrimary', 'uSecondary', 'uAccent', 'uEmissive', 'uFloorBase', 'uFloorAccent', 'uRuneColor', 'uFogColor', 'uSunColor', 'uTime', 'uMode', 'uRadius', 'uAura', 'uAlpha']) {
      this.u[n] = gl.getUniformLocation(this.stdProg, n);
    }
    this.ui = {};
    for (const n of ['uVP', 'uCam', 'uPrimary', 'uSecondary', 'uAccent', 'uEmissive', 'uFogColor', 'uSunColor', 'uTime', 'uAura', 'uUseInstColor']) {
      this.ui[n] = gl.getUniformLocation(this.instProg, n);
    }
    this.ub = {
      uScene: gl.getUniformLocation(this.bloomProg, 'uScene'),
      uTexel: gl.getUniformLocation(this.bloomProg, 'uTexel'),
      uBloomStrength: gl.getUniformLocation(this.bloomProg, 'uBloomStrength'),
    };

    // Fullscreen Post-Processing Quad
    this.quadVao = gl.createVertexArray();
    gl.bindVertexArray(this.quadVao);
    const qb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, qb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    // Instancing GPU buffers
    this.glInstA = gl.createBuffer();
    this.glInstB = gl.createBuffer();

    // Offscreen HDR Scene FBO for Bloom Post-Processing
    this.fbo = gl.createFramebuffer();
    this.fboTex = gl.createTexture();
    this.fboDepth = gl.createRenderbuffer();
    this.fboW = 0; this.fboH = 0;

    this.meshes = {
      head: buildDragonHeadMesh(gl), body: buildDragonBodyMesh(gl),
      wingL: buildDragonWingMesh(gl, -1), wingR: buildDragonWingMesh(gl, 1),
      tail: buildDragonTailMesh(gl), food: buildFoodCrystalMesh(gl),
      powerup: buildPowerupOrbMesh(gl), crown: buildCrownMesh(gl),
      ring: buildAuraRingMesh(gl), pedestal: buildPedestalMesh(gl),
      boundary: buildArenaBoundaryMesh(gl), particle: buildParticleMesh(gl),
      shadow: buildShadowDiscMesh(gl), ground: buildGroundPlaneMesh(gl),
      pillar: buildPillarMesh(gl), portal: buildPortalMesh(gl),
      boostPad: buildBoostPadMesh(gl), crate: buildCrateMesh(gl),
    };
  }

  ensureFBO(w, h) {
    if (this.fboW === w && this.fboH === h) return;
    const gl = this.gl;
    this.fboW = w; this.fboH = h;
    gl.bindTexture(gl.TEXTURE_2D, this.fboTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.bindRenderbuffer(gl.RENDERBUFFER, this.fboDepth);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.fboTex, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.fboDepth);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  startCrateCeremony(dragonId, rarityColor) {
    this.crateState = { active: true, phase: 0, rarityColor, dragonId };
    this.scene = 'crate';
  }

  triggerShake(intensity = 0.85, duration = 0.35) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeTime = Math.max(this.shakeTime, duration);
  }
  triggerHeroRoar() { this.roarTimer = 1.25; }
  rotateShowcase(delta) { this.orbitYaw += delta; }
  zoomShowcase(delta) { this.orbitZoom = Math.max(0.72, Math.min(1.38, this.orbitZoom + delta)); }
  resetShowcase() { this.orbitYaw = 0.45; this.orbitZoom = 1.0; }

  projectToScreen(wx, wy, wz) {
    if (!this.currentVP) return null;
    const m = this.currentVP;
    const x = m[0] * wx + m[4] * wy + m[8] * wz + m[12];
    const y = m[1] * wx + m[5] * wy + m[9] * wz + m[13];
    const w = m[3] * wx + m[7] * wy + m[11] * wz + m[15];
    if (w <= 0.1) return null;
    const nx = x / w, ny = y / w;
    return { x: (nx + 1) * 0.5 * this.canvas.clientWidth, y: (1 - ny) * 0.5 * this.canvas.clientHeight, visible: nx > -1.05 && nx < 1.05 && ny > -1.05 && ny < 1.05 };
  }

  resize() {
    const dprCap = this.quality === 'low' ? 0.85 : this.quality === 'medium' ? 1.15 : this.quality === 'high' ? 1.5 : 2.0;
    const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
    const w = Math.max(1, Math.round(this.canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    return { w, h };
  }

  drawMesh(mesh, modelMat, { primary, secondary, accent, emissive, mode = 0, aura = 0.4, alpha = 1.0 }) {
    const gl = this.gl;
    gl.useProgram(this.stdProg);
    gl.uniformMatrix4fv(this.u.uModel, false, modelMat);
    gl.uniform1f(this.u.uMode, mode);
    gl.uniform1f(this.u.uAura, aura);
    gl.uniform1f(this.u.uAlpha, alpha);
    if (primary) gl.uniform3fv(this.u.uPrimary, primary);
    if (secondary) gl.uniform3fv(this.u.uSecondary, secondary);
    if (accent) gl.uniform3fv(this.u.uAccent, accent);
    if (emissive) gl.uniform3fv(this.u.uEmissive, emissive);
    gl.bindVertexArray(mesh.vao);
    gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
    this.drawCalls++;
  }

  drawInstanced(mesh, count, { primary, secondary, accent, emissive, aura = 0.5, useInstColor = 0 }, vp, eye, theme) {
    if (count <= 0) return;
    const gl = this.gl;
    gl.useProgram(this.instProg);
    gl.uniformMatrix4fv(this.ui.uVP, false, vp);
    gl.uniform3fv(this.ui.uCam, eye);
    gl.uniform3fv(this.ui.uPrimary, primary);
    gl.uniform3fv(this.ui.uSecondary, secondary);
    gl.uniform3fv(this.ui.uAccent, accent);
    gl.uniform3fv(this.ui.uEmissive, emissive);
    gl.uniform3fv(this.ui.uFogColor, theme.fogColor);
    gl.uniform3fv(this.ui.uSunColor, theme.sunColor);
    gl.uniform1f(this.ui.uTime, this.time);
    gl.uniform1f(this.ui.uAura, aura);
    gl.uniform1f(this.ui.uUseInstColor, useInstColor);

    gl.bindVertexArray(mesh.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.glInstA);
    gl.bufferData(gl.ARRAY_BUFFER, this.instBufA.subarray(0, count * 4), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 4, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(3, 1);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.glInstB);
    gl.bufferData(gl.ARRAY_BUFFER, this.instBufB.subarray(0, count * 4), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(4);
    gl.vertexAttribPointer(4, 4, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(4, 1);

    gl.drawArraysInstanced(gl.TRIANGLES, 0, mesh.count, count);
    gl.vertexAttribDivisor(3, 0);
    gl.vertexAttribDivisor(4, 0);
    gl.disableVertexAttribArray(3);
    gl.disableVertexAttribArray(4);
    gl.bindVertexArray(null);
    this.drawCalls++;
  }

  drawFullDragon(p, vp, eye, theme, isShowcase = false) {
    const gl = this.gl;
    const dm = getDragonById(p.skin);
    const rarity = RARITY_CONFIG[dm.rarity] || RARITY_CONFIG.common;
    const lv = p.dragonLevel || 1;
    // Visual Lv.1 -> Lv.5 Evolution Scaling (wings, horns & aura grow visibly!)
    const evoScale = 1 + (lv - 1) * 0.065;
    const scaleBase = p.isBoss ? 1.75 : (isShowcase ? 1.15 : 0.92 + Math.min(0.45, p.mass * 0.0016));
    const isFever = p.feverTimer > 0;
    const auraVal = isFever ? 1.45 : rarity.auraIntensity * evoScale;

    const colors = {
      primary: isFever ? [0.98, 0.72, 0.16] : dm.primary,
      secondary: isFever ? [1.0, 0.90, 0.42] : dm.secondary,
      accent: dm.accent,
      emissive: dm.eyeColor,
      aura: auraVal,
      alpha: 1.0,
    };

    const nodes = p.body || [];
    const maxBodyDraw = this.quality === 'low' ? 36 : 96;
    const stride = nodes.length > maxBodyDraw ? Math.ceil(nodes.length / maxBodyDraw) : 1;

    // 1. Batched GPU Instanced Body Segments (1 draw call for entire dragon spine!)
    let instCount = 0;
    for (let i = 1; i < nodes.length - 1 && instCount < 160; i += stride) {
      const nd = nodes[i], ahead = nodes[i - 1];
      const yaw = -Math.atan2(ahead.y - nd.y, ahead.x - nd.x);
      const taper = 1.0 - (i / nodes.length) * 0.56;
      const hoverY = (nd.z !== undefined ? nd.z : 0.85 + Math.sin(this.time * 4.2 - i * 0.35) * 0.12) * (p.isBoss ? 1.35 : 1);
      const segS = scaleBase * taper;
      const o = instCount * 4;
      this.instBufA[o] = nd.x; this.instBufA[o + 1] = hoverY; this.instBufA[o + 2] = nd.y; this.instBufA[o + 3] = segS;
      this.instBufB[o] = yaw; this.instBufB[o + 1] = 1; this.instBufB[o + 2] = 1; this.instBufB[o + 3] = 1;
      instCount++;
    }
    this.drawInstanced(this.meshes.body, instCount, { ...colors, useInstColor: 0 }, vp, eye, theme);

    // 2. Animated Flapping 3D Wings with Boost Wing-Fold!
    const wingNode = nodes[Math.min(2, nodes.length - 1)] || p;
    const wingAhead = nodes[0] || p;
    const wingYaw = isShowcase ? -p.angle : -Math.atan2(wingAhead.y - wingNode.y, wingAhead.x - wingNode.x);
    const wingY = (wingNode.z !== undefined ? wingNode.z : 0.95) * (p.isBoss ? 1.35 : 1);
    const isFast = p.boost || p.padBoostTicks > 0 || this.roarTimer > 0;
    const flap = Math.sin(this.time * (isFast ? 13 : 5.2) + (p.id ? p.id.charCodeAt(0) : 0)) * (isFast ? 0.56 : 0.34);
    const sweepBack = isFast ? 0.32 : 0.0;
    const wScale = scaleBase * rarity.wingScale * evoScale;

    this.drawMesh(this.meshes.wingL, mat4TRS(wingNode.x, wingY + 0.15, wingNode.y, flap, wingYaw - sweepBack, 0, wScale, wScale, wScale), colors);
    this.drawMesh(this.meshes.wingR, mat4TRS(wingNode.x, wingY + 0.15, wingNode.y, -flap, wingYaw + sweepBack, 0, wScale, wScale, wScale), colors);

    // 3. Sculpted 3D Dragon Head with Procedural Bite-Lunge Animation!
    const biteLunge = p.biteTimer > 0 ? Math.sin((p.biteTimer / 0.25) * Math.PI) * 0.42 : 0;
    const headY = (nodes[0]?.z !== undefined ? nodes[0].z : 0.95 + Math.sin(this.time * 4.2) * 0.10) * (p.isBoss ? 1.35 : 1);
    const headPitch = (isShowcase && this.roarTimer > 0 ? -Math.sin(this.roarTimer * Math.PI * 2) * 0.25 : 0) + biteLunge * 0.35;
    const headS = scaleBase * 1.14 * (1 + (lv - 1) * 0.04 + biteLunge * 0.12);
    const hx = p.x + Math.cos(p.angle) * biteLunge;
    const hz = p.y + Math.sin(p.angle) * biteLunge;
    this.drawMesh(this.meshes.head, mat4TRS(hx, headY, hz, 0, -p.angle, headPitch, headS, headS, headS), colors);

    // 4. Forked 3D Tail Blade
    if (nodes.length >= 2) {
      const tip = nodes[nodes.length - 1], prev = nodes[nodes.length - 2];
      const tailYaw = -Math.atan2(prev.y - tip.y, prev.x - tip.x);
      const tailY = (tip.z !== undefined ? tip.z : 0.72) * (p.isBoss ? 1.35 : 1);
      this.drawMesh(this.meshes.tail, mat4TRS(tip.x, tailY, tip.y, 0, tailYaw, 0, scaleBase * 0.74, scaleBase * 0.74, scaleBase * 0.74), colors);
    }

    // 5. Tier & Evolution Orbiting 3D Rune Rings + Wanted Bounty Beacon
    const ringTotal = rarity.ringCount + (lv >= 4 ? 1 : 0);
    if (ringTotal >= 1 || p.shieldTicks > 0 || p.spawnShieldTicks > 0 || p.isBounty) {
      const rScale = scaleBase * 1.08;
      const ringColor = p.isBounty ? [1.0, 0.18, 0.28] : (p.shieldTicks > 0 || p.spawnShieldTicks > 0) ? [0.28, 0.92, 1.0] : dm.accent;
      this.drawMesh(this.meshes.ring, mat4TRS(p.x, headY + 0.1, p.y, 0.35, this.time * 1.7, 0.22, rScale, rScale, rScale), {
        primary: ringColor, secondary: ringColor, accent: ringColor, emissive: ringColor, aura: 1.3, alpha: 1.0,
      });
      if (ringTotal >= 2) {
        this.drawMesh(this.meshes.ring, mat4TRS(p.x, headY + 0.1, p.y, -0.45, -this.time * 2.2, -0.35, rScale * 1.24, rScale * 1.24, rScale * 1.24), {
          primary: dm.secondary, secondary: dm.accent, accent: dm.eyeColor, emissive: dm.eyeColor, aura: 1.45, alpha: 1.0,
        });
      }
    }

    // 6. Floating 3D Golden Sovereign Crown for #1 Leader
    if (!isShowcase && this.arena?.leaderId === p.id && !p.isBoss) {
      const crownY = headY + 1.65 * scaleBase + Math.sin(this.time * 3.8) * 0.18;
      this.drawMesh(this.meshes.crown, mat4TRS(p.x, crownY, p.y, 0, this.time * 1.8, 0, scaleBase * 0.9, scaleBase * 0.9, scaleBase * 0.9), {
        primary: [1, 0.8, 0.2], secondary: [1, 0.9, 0.4], accent: [1, 0.84, 0.2], emissive: [1, 0.96, 0.6], aura: 1.3, alpha: 1.0,
      });
    }
  }

  render(dt = 0.016) {
    if (this.lost || !this.gl) return;
    const gl = this.gl;
    const { w, h } = this.resize();
    this.time += dt;
    this.drawCalls = 0;
    if (this.roarTimer > 0) this.roarTimer = Math.max(0, this.roarTimer - dt);
    if (this.shakeTime > 0) this.shakeTime = Math.max(0, this.shakeTime - dt);

    const useBloom = this.quality === 'high' || this.quality === 'ultra';
    if (useBloom) {
      this.ensureFBO(w, h);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    gl.viewport(0, 0, w, h);

    const theme = ARENA_THEMES[this.arenaThemeIndex] || ARENA_THEMES[0];
    gl.clearColor(theme.fogColor[0], theme.fogColor[1], theme.fogColor[2], 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.CULL_FACE);

    gl.useProgram(this.stdProg);
    gl.uniform3fv(this.u.uFloorBase, theme.floorBase);
    gl.uniform3fv(this.u.uFloorAccent, theme.floorAccent);
    gl.uniform3fv(this.u.uRuneColor, theme.runeColor);
    gl.uniform3fv(this.u.uFogColor, theme.fogColor);
    gl.uniform3fv(this.u.uSunColor, theme.sunColor);
    gl.uniform1f(this.u.uTime, this.time);

    const aspect = w / h;
    if (this.scene === 'arena' && this.arena) this.renderArenaScene(dt, aspect, theme);
    else if (this.scene === 'crate') this.renderCrateCeremony(dt, aspect, theme);
    else this.renderHeroStageScene(aspect, theme);

    // Offscreen HDR Bloom Composite Pass
    if (useBloom) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, w, h);
      gl.disable(gl.DEPTH_TEST);
      gl.useProgram(this.bloomProg);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.fboTex);
      gl.uniform1i(this.ub.uScene, 0);
      gl.uniform2f(this.ub.uTexel, 1 / w, 1 / h);
      gl.uniform1f(this.ub.uBloomStrength, this.quality === 'ultra' ? 0.68 : 0.48);
      gl.bindVertexArray(this.quadVao);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.bindVertexArray(null);
    }
  }

  renderCrateCeremony(dt, aspect, theme) {
    this.crateState.phase += dt;
    const p = this.crateState.phase;
    const eye = [0, 3.8, 9.5];
    const vp = mat4Mul(mat4Perspective(44 * Math.PI / 180, aspect, 0.2, 160), mat4LookAt(eye, [0, 1.3, 0]));
    this.currentVP = vp;
    this.gl.useProgram(this.stdProg);
    this.gl.uniformMatrix4fv(this.u.uVP, false, vp);
    this.gl.uniform3fv(this.u.uCam, eye);

    const rc = this.crateState.rarityColor;
    if (p < 1.35) {
      // Shaking 3D Chest charging up!
      const shake = Math.sin(p * 38) * 0.14 * p;
      const scale = 1.0 + p * 0.22;
      this.drawMesh(this.meshes.crate, mat4TRS(shake, 0.5 + Math.abs(Math.sin(p * 12)) * 0.25, 0, 0, p * 2.2, shake * 0.5, scale, scale, scale), {
        primary: [0.18, 0.22, 0.36], secondary: [0.28, 0.34, 0.52], accent: [1, 0.82, 0.25], emissive: rc, aura: 1.5, alpha: 1.0,
      });
    } else {
      // Burst Open: Show Rising Rarity Halo + Revealed 3D Dragon Roaring!
      const prevSkin = this.heroSkin;
      this.heroSkin = this.crateState.dragonId;
      this.roarTimer = Math.max(0.2, 2.6 - p);
      this.renderHeroStageScene(aspect, theme);
      this.heroSkin = prevSkin;
    }
  }

  renderHeroStageScene(aspect, theme) {
    const isLab = this.scene === 'lab', isSplash = this.scene === 'splash';
    const zoom = isLab ? this.orbitZoom : isSplash ? 1.12 : 1.0;
    const yaw = isLab ? this.orbitYaw : 0.45 + Math.sin(this.time * 0.35) * 0.22;
    const camDist = (isLab ? 10.6 : 11.4) / zoom;
    const eye = [Math.sin(yaw) * camDist, isLab ? 4.2 : 4.8, Math.cos(yaw) * camDist];
    const vp = mat4Mul(mat4Perspective(42 * Math.PI / 180, aspect, 0.2, 200), mat4LookAt(eye, [0, 1.35, 0]));
    this.currentVP = vp;

    this.gl.useProgram(this.stdProg);
    this.gl.uniformMatrix4fv(this.u.uVP, false, vp);
    this.gl.uniform3fv(this.u.uCam, eye);
    this.gl.uniform1f(this.u.uRadius, 48);

    const dm = getDragonById(this.heroSkin);
    this.drawMesh(this.meshes.pedestal, mat4TRS(0, 0, 0, 0, this.time * 0.18, 0, 1, 1, 1), {
      primary: theme.pillarColor, secondary: theme.floorAccent, accent: theme.runeColor, emissive: dm.accent, aura: 0.8, alpha: 1.0,
    });

    const count = 14, body = [];
    const hoverBase = 1.95 + Math.sin(this.time * 2.1) * 0.22 + (this.roarTimer > 0 ? 0.35 : 0);
    for (let i = 0; i < count; i++) {
      const f = i / (count - 1);
      body.push({ x: 2.6 - i * 0.56, y: Math.sin(f * 5.2 - this.time * 2.4) * 0.68 * (0.25 + f), z: hoverBase + Math.sin(f * 4.0 - this.time * 2.0) * 0.28 });
    }
    this.drawFullDragon({
      id: 'hero', skin: this.heroSkin, dragonLevel: this.heroLevel,
      x: body[0].x, y: body[0].y, angle: Math.sin(this.time * 1.4) * 0.14,
      mass: 40, boost: this.roarTimer > 0, feverTimer: 0, shieldTicks: 0, spawnShieldTicks: 0, isBoss: false, biteTimer: this.roarTimer > 0.7 ? 0.2 : 0, body,
    }, vp, eye, theme, true);
  }

  renderArenaScene(dt, aspect, theme) {
    const gl = this.gl, arena = this.arena;
    const you = arena.players.find(p => p.id === 'you');
    const focusX = you ? you.x : 0, focusZ = you ? you.y : 0;

    const lengthZoom = you ? Math.min(20, (you.segmentCount - 9) * 0.18) : 0;
    const boostPull = (you?.boost || you?.padBoostTicks > 0) ? 2.5 : 0;
    const isTactical = this.cameraStyle === 'tactical';
    const desiredHeight = (isTactical ? 34 : 23.5) + lengthZoom + boostPull;
    const desiredZOffset = (isTactical ? 12 : 17.5) + lengthZoom * 0.62;

    this.camHeight += (desiredHeight - this.camHeight) * Math.min(1, dt * 4.2);
    const smooth = Math.min(1, dt * 7.5);
    this.camTarget[0] += (focusX - this.camTarget[0]) * smooth;
    this.camTarget[2] += (focusZ - this.camTarget[2]) * smooth;

    let shakeX = 0, shakeZ = 0;
    if (this.shakeTime > 0) {
      const s = this.shakeIntensity * (this.shakeTime / 0.35);
      shakeX = (Math.random() - 0.5) * s; shakeZ = (Math.random() - 0.5) * s;
    }

    const eye = [this.camTarget[0] + shakeX, this.camHeight, this.camTarget[2] + desiredZOffset + shakeZ];
    const vp = mat4Mul(mat4Perspective((you?.boost ? 49 : 45) * Math.PI / 180, aspect, 0.5, 360), mat4LookAt(eye, [this.camTarget[0], 0.5, this.camTarget[2]]));
    this.currentVP = vp;

    gl.useProgram(this.stdProg);
    gl.uniformMatrix4fv(this.u.uVP, false, vp);
    gl.uniform3fv(this.u.uCam, eye);
    gl.uniform1f(this.u.uRadius, arena.currentRadius);

    // 1. 3D Colosseum Ground
    this.drawMesh(this.meshes.ground, mat4Identity(), { mode: 1, alpha: 1.0 });

    // 2. 3D Arena Landmarks (Boost Pads, Teleport Portals, Destructible Crystal Pillars)
    for (const pad of arena.boostPads) {
      this.drawMesh(this.meshes.boostPad, mat4TRS(pad.x, 0, pad.y, 0, -pad.angle, 0, 1, 1, 1), {
        primary: theme.pillarColor, secondary: theme.floorAccent, accent: [0.25, 0.96, 0.72], emissive: [0.35, 1.0, 0.75], aura: 1.1, alpha: 1.0,
      });
    }
    for (const portal of arena.portals) {
      if (Math.hypot(portal.x, portal.y) > arena.currentRadius - 4) continue;
      this.drawMesh(this.meshes.portal, mat4TRS(portal.x, 0, portal.y, 0, this.time * 0.8, 0, 1, 1, 1), {
        primary: theme.pillarColor, secondary: theme.floorAccent, accent: theme.runeColor, emissive: portal.color, aura: 1.35, alpha: 1.0,
      });
    }
    for (const pil of arena.pillars) {
      if (!pil.alive) continue;
      this.drawMesh(this.meshes.pillar, mat4TRS(pil.x, 0, pil.y, 0, 0, 0, 1, 1, 1), {
        primary: theme.pillarColor, secondary: theme.floorAccent, accent: theme.runeColor, emissive: [0.35, 0.92, 1.0], aura: 1.15, alpha: 1.0,
      });
    }

    // 3. GPU Instanced 3D Food Orbs (1 draw call for all visible food!)
    const cullDist = this.camHeight * 2.1 + 18, cullDist2 = cullDist * cullDist;
    let foodCount = 0;
    for (let i = 0; i < arena.food.length; i++) {
      const f = arena.food[i];
      const dx = f.x - this.camTarget[0], dz = f.y - this.camTarget[2];
      if (dx * dx + dz * dz > cullDist2) continue;
      const bob = 0.72 + Math.sin(this.time * 3.2 + f.phase) * 0.22;
      if (f.isPowerup) {
        this.drawMesh(this.meshes.powerup, mat4TRS(f.x, bob, f.y, 0.2, this.time * 2.4 + f.phase, 0, f.scale, f.scale, f.scale), {
          primary: f.color, secondary: f.color, accent: [1, 1, 1], emissive: f.color, aura: 1.35, alpha: 1.0,
        });
      } else if (foodCount < 580) {
        const o = foodCount * 4;
        this.instBufA[o] = f.x; this.instBufA[o + 1] = bob; this.instBufA[o + 2] = f.y; this.instBufA[o + 3] = f.scale;
        this.instBufB[o] = this.time * 1.5 + f.phase;
        this.instBufB[o + 1] = f.color[0]; this.instBufB[o + 2] = f.color[1]; this.instBufB[o + 3] = f.color[2];
        foodCount++;
      }
    }
    this.drawInstanced(this.meshes.food, foodCount, {
      primary: [1, 1, 1], secondary: [1, 1, 1], accent: [1, 0.95, 0.7], emissive: [1, 1, 1], aura: 0.9, useInstColor: 1,
    }, vp, eye, theme);

    // 4. All Alive 3D Dragons
    for (let i = 0; i < arena.players.length; i++) {
      const p = arena.players[i];
      if (!p.alive) continue;
      const dx = p.x - this.camTarget[0], dz = p.y - this.camTarget[2];
      if (dx * dx + dz * dz > (cullDist + 28) * (cullDist + 28)) continue;
      this.drawFullDragon(p, vp, eye, theme, false);
    }

    // 5. GPU Instanced 3D Particles (1 draw call for all active particles!)
    let ptCount = 0;
    const pts = arena.particles;
    for (let i = 0; i < pts.length && ptCount < 520; i++) {
      const pt = pts[i];
      const s = pt.size * (1 - pt.age / pt.maxAge);
      if (s <= 0.02) continue;
      const o = ptCount * 4;
      this.instBufA[o] = pt.x; this.instBufA[o + 1] = pt.z; this.instBufA[o + 2] = pt.y; this.instBufA[o + 3] = s;
      this.instBufB[o] = this.time * 5 + i;
      this.instBufB[o + 1] = pt.color[0]; this.instBufB[o + 2] = pt.color[1]; this.instBufB[o + 3] = pt.color[2];
      ptCount++;
    }
    this.drawInstanced(this.meshes.particle, ptCount, {
      primary: [1, 1, 1], secondary: [1, 1, 1], accent: [1, 1, 1], emissive: [1, 1, 1], aura: 1.3, useInstColor: 1,
    }, vp, eye, theme);

    // 6. Translucent 3D Shockwaves & Circular Colosseum Energy Wall
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    for (const sw of arena.shockwaves) {
      const alpha = Math.max(0, 1 - sw.age / sw.maxAge) * 0.85;
      const s = sw.radius / 1.45;
      this.drawMesh(this.meshes.ring, mat4TRS(sw.x, 0.85, sw.y, 0, sw.angle, 0, s, 1.5, s), { accent: sw.color, mode: 4, alpha });
    }
    const r = arena.currentRadius;
    this.drawMesh(this.meshes.boundary, mat4TRS(0, 0, 0, 0, 0, 0, r, r, r), {
      primary: theme.pillarColor, secondary: theme.pillarColor, accent: theme.runeColor, emissive: theme.runeColor, mode: 2, alpha: 0.78,
    });
    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }
}
