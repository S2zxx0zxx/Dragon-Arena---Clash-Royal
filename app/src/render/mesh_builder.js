/**
 * Dragon Arena — Microscopic-Detail Procedural 3D Mesh Builder (WebGL2)
 * Builds crisp, zero-blur 3D geometry with true normals and material color channels:
 * - Sculpted 3D Dragon Head (snout, jaw, brow, curved horns, crown crest, glowing eyes)
 * - Articulated 3D Armored Body Segment with Dorsal Spine Fin
 * - Swept 3D Flapping Wings (Left & Right)
 * - Forked 3D Dragon Tail Blade
 * - Realistic 3D Food Meshes (Faceted Berry, Crystal Shard, Relic Orb, Powerup Core)
 * - 3D Sovereign Crown, Mythic/Legendary Orbiting Rune Rings, Citadel Pillars & Pedestal
 */

function pushTri(verts, norms, mats, a, b, c, matId) {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
  const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  let nx = uy * vz - uz * vy;
  let ny = uz * vx - ux * vz;
  let nz = ux * vy - uy * vx;
  const len = Math.hypot(nx, ny, nz) || 1;
  nx /= len; ny /= len; nz /= len;

  for (const p of [a, b, c]) {
    verts.push(p[0], p[1], p[2]);
    norms.push(nx, ny, nz);
    mats.push(matId);
  }
}

function pushQuad(verts, norms, mats, a, b, c, d, matId) {
  pushTri(verts, norms, mats, a, b, c, matId);
  pushTri(verts, norms, mats, a, c, d, matId);
}

function addBox(verts, norms, mats, cx, cy, cz, sx, sy, sz, matId) {
  const hx = sx * 0.5, hy = sy * 0.5, hz = sz * 0.5;
  const p = [
    [cx - hx, cy - hy, cz - hz], [cx + hx, cy - hy, cz - hz],
    [cx + hx, cy + hy, cz - hz], [cx - hx, cy + hy, cz - hz],
    [cx - hx, cy - hy, cz + hz], [cx + hx, cy - hy, cz + hz],
    [cx + hx, cy + hy, cz + hz], [cx - hx, cy + hy, cz + hz],
  ];
  pushQuad(verts, norms, mats, p[4], p[5], p[6], p[7], matId); // +Z
  pushQuad(verts, norms, mats, p[1], p[0], p[3], p[2], matId); // -Z
  pushQuad(verts, norms, mats, p[5], p[1], p[2], p[6], matId); // +X
  pushQuad(verts, norms, mats, p[0], p[4], p[7], p[3], matId); // -X
  pushQuad(verts, norms, mats, p[7], p[6], p[2], p[3], matId); // +Y
  pushQuad(verts, norms, mats, p[0], p[1], p[5], p[4], matId); // -Y
}

function addPyramid(verts, norms, mats, basePts, apex, matId) {
  const n = basePts.length;
  for (let i = 0; i < n; i++) {
    pushTri(verts, norms, mats, basePts[i], basePts[(i + 1) % n], apex, matId);
  }
  for (let i = 1; i < n - 1; i++) {
    pushTri(verts, norms, mats, basePts[0], basePts[i + 1], basePts[i], matId);
  }
}

function addPrism(verts, norms, mats, cx, cy, cz, rBottom, rTop, height, sides, matId, tiltZ = 0) {
  const y0 = cy - height * 0.5;
  const y1 = cy + height * 0.5;
  const bot = [], top = [];
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    bot.push([cx + Math.cos(a) * rBottom, y0, cz + Math.sin(a) * rBottom]);
    top.push([cx + Math.cos(a) * rTop, y1, cz + Math.sin(a) * rTop + tiltZ]);
  }
  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides;
    pushQuad(verts, norms, mats, bot[i], bot[j], top[j], top[i], matId);
  }
  const cBot = [cx, y0, cz];
  const cTop = [cx, y1, cz + tiltZ];
  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides;
    pushTri(verts, norms, mats, bot[j], bot[i], cBot, matId);
    pushTri(verts, norms, mats, top[i], top[j], cTop, matId);
  }
}

function uploadMesh(gl, verts, norms, mats) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  const posBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

  const normBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, normBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(norms), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

  const matBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, matBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mats), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(2);
  gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 0, 0);

  gl.bindVertexArray(null);
  return {
    vao,
    count: verts.length / 3,
    buffers: [posBuf, normBuf, matBuf],
    dispose() {
      gl.deleteVertexArray(vao);
      for (const b of this.buffers) gl.deleteBuffer(b);
    },
  };
}

/**
 * Material Channel IDs encoded in vertex attribute 2:
 * 0.0 = Primary dragon scale color
 * 1.0 = Secondary ridge / wing membrane / belly color
 * 2.0 = Accent horn / gold / crystal highlight
 * 3.0 = Emissive glowing eyes / energy core
 */

export function buildDragonHeadMesh(gl) {
  const v = [], n = [], m = [];
  // Forward is +X, Up is +Y, Right is +Z
  // Main armored cranium
  addBox(v, n, m, -0.05, 0.14, 0, 0.92, 0.56, 0.72, 0);
  // Tapered upper snout (forward +X)
  const snoutBase = [[0.35, -0.02, -0.32], [0.35, -0.02, 0.32], [0.35, 0.34, 0.24], [0.35, 0.34, -0.24]];
  const snoutTip = [[1.18, 0.02, -0.14], [1.18, 0.02, 0.14], [1.08, 0.24, 0.10], [1.08, 0.24, -0.10]];
  pushQuad(v, n, m, snoutBase[0], snoutTip[0], snoutTip[1], snoutBase[1], 0);
  pushQuad(v, n, m, snoutBase[1], snoutTip[1], snoutTip[2], snoutBase[2], 0);
  pushQuad(v, n, m, snoutBase[2], snoutTip[2], snoutTip[3], snoutBase[3], 0);
  pushQuad(v, n, m, snoutBase[3], snoutTip[3], snoutTip[0], snoutBase[0], 0);
  pushQuad(v, n, m, snoutTip[0], snoutTip[3], snoutTip[2], snoutTip[1], 1); // nose tip

  // Lower armored jaw
  addBox(v, n, m, 0.45, -0.14, 0, 0.96, 0.16, 0.46, 1);
  // Brow ridges over eyes
  addBox(v, n, m, 0.28, 0.36, -0.30, 0.42, 0.12, 0.16, 2);
  addBox(v, n, m, 0.28, 0.36, 0.30, 0.42, 0.12, 0.16, 2);

  // Glowing Dragon Eyes (Emissive mat 3)
  addBox(v, n, m, 0.36, 0.22, -0.36, 0.22, 0.14, 0.08, 3);
  addBox(v, n, m, 0.36, 0.22, 0.36, 0.22, 0.14, 0.08, 3);

  // Sweeping Twin Curved Horns (Left & Right)
  for (const side of [-1, 1]) {
    const hBase = [
      [-0.22, 0.36, side * 0.22],
      [-0.22, 0.36, side * 0.38],
      [-0.38, 0.36, side * 0.36],
      [-0.38, 0.36, side * 0.20],
    ];
    addPyramid(v, n, m, hBase, [-1.15, 0.92, side * 0.56], 2);

    // Secondary cheek blade fin
    const finBase = [
      [-0.15, 0.04, side * 0.34],
      [-0.15, 0.20, side * 0.34],
      [-0.38, 0.12, side * 0.34],
    ];
    addPyramid(v, n, m, finBase, [-0.82, 0.22, side * 0.72], 1);
  }

  // Central Royal Crown Crest
  const crestBase = [[-0.02, 0.42, -0.10], [-0.02, 0.42, 0.10], [-0.46, 0.42, 0.08], [-0.46, 0.42, -0.08]];
  addPyramid(v, n, m, crestBase, [-0.62, 0.88, 0], 2);

  return uploadMesh(gl, v, n, m);
}

export function buildDragonBodyMesh(gl) {
  const v = [], n = [], m = [];
  // Octagonal sculpted torso scale segment oriented along X
  const sides = 8;
  const rx = 0.48, ry = 0.44, rz = 0.52;
  const front = [], back = [];
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2 + Math.PI / 8;
    const cy = Math.sin(a) * ry;
    const cz = Math.cos(a) * rz;
    front.push([rx, cy, cz]);
    back.push([-rx, cy * 0.92, cz * 0.92]);
  }
  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides;
    const matId = (i === 5 || i === 6) ? 1 : 0; // belly plates use secondary
    pushQuad(v, n, m, front[i], back[i], back[j], front[j], matId);
  }
  const cF = [rx * 1.12, 0, 0], cB = [-rx * 1.12, 0, 0];
  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides;
    pushTri(v, n, m, front[i], front[j], cF, 0);
    pushTri(v, n, m, back[j], back[i], cB, 0);
  }

  // Raised Dorsal Spine Fin (Accent mat 2)
  const spBase = [[0.26, 0.36, -0.09], [0.26, 0.36, 0.09], [-0.30, 0.36, 0.08], [-0.30, 0.36, -0.08]];
  addPyramid(v, n, m, spBase, [-0.48, 0.88, 0], 2);

  // Side armor ridges
  addBox(v, n, m, 0, 0.05, 0.48, 0.62, 0.12, 0.10, 1);
  addBox(v, n, m, 0, 0.05, -0.48, 0.62, 0.12, 0.10, 1);

  return uploadMesh(gl, v, n, m);
}

export function buildDragonWingMesh(gl, side = 1) {
  const v = [], n = [], m = [];
  // Pivots at (0, 0, 0), extends outward along side * +Z
  const s = side;
  // Leading bone spar
  addBox(v, n, m, 0.12, 0.14, s * 0.85, 0.16, 0.12, 1.75, 2);
  // Swept translucent-feel wing membranes (3 faceted panels)
  const rootF = [0.22, 0.12, 0];
  const midF = [0.46, 0.36, s * 1.15];
  const tip = [-0.12, 0.56, s * 2.28];
  const backOuter = [-0.95, 0.20, s * 1.68];
  const backMid = [-0.88, 0.06, s * 0.92];
  const rootB = [-0.42, 0.02, 0];

  // Double-sided wing membrane so visible from any 3D angle
  const addDoubleTri = (a, b, c, matId) => {
    pushTri(v, n, m, a, b, c, matId);
    pushTri(v, n, m, a, c, b, matId);
  };
  addDoubleTri(rootF, midF, backMid, 1);
  addDoubleTri(rootF, backMid, rootB, 1);
  addDoubleTri(midF, tip, backOuter, 1);
  addDoubleTri(midF, backOuter, backMid, 1);
  // Glowing wingtip accent
  addDoubleTri(midF, tip, [0.18, 0.48, s * 1.72], 3);

  return uploadMesh(gl, v, n, m);
}

export function buildDragonTailMesh(gl) {
  const v = [], n = [], m = [];
  // Tapered tail cone pointing backward (-X)
  const base = [[0.4, -0.26, -0.26], [0.4, -0.26, 0.26], [0.4, 0.26, 0.26], [0.4, 0.26, -0.26]];
  addPyramid(v, n, m, base, [-1.45, 0.06, 0], 0);
  // Forked glowing tail blade
  const fL = [[-0.65, 0.04, 0], [-1.55, 0.10, -0.58], [-1.15, 0.05, 0]];
  const fR = [[-0.65, 0.04, 0], [-1.15, 0.05, 0], [-1.55, 0.10, 0.58]];
  pushTri(v, n, m, fL[0], fL[1], fL[2], 2);
  pushTri(v, n, m, fL[0], fL[2], fL[1], 2);
  pushTri(v, n, m, fR[0], fR[1], fR[2], 2);
  pushTri(v, n, m, fR[0], fR[2], fR[1], 2);
  return uploadMesh(gl, v, n, m);
}

export function buildFoodCrystalMesh(gl) {
  const v = [], n = [], m = [];
  // Realistic 3D faceted crystal / fruit octahedron with top crown
  const sides = 6;
  const r = 0.62;
  const ring = [];
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    ring.push([Math.cos(a) * r, 0, Math.sin(a) * r]);
  }
  const top = [0, 0.88, 0];
  const bot = [0, -0.68, 0];
  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides;
    pushTri(v, n, m, ring[i], ring[j], top, 0);
    pushTri(v, n, m, ring[j], ring[i], bot, 1);
  }
  // Small glowing top crown / stem accent
  addPyramid(v, n, m, [
    [-0.18, 0.68, -0.18], [0.18, 0.68, -0.18], [0.18, 0.68, 0.18], [-0.18, 0.68, 0.18]
  ], [0, 1.15, 0], 3);
  return uploadMesh(gl, v, n, m);
}

export function buildPowerupOrbMesh(gl) {
  const v = [], n = [], m = [];
  // Inner glowing diamond core + outer protective octahedral cage
  addPrism(v, n, m, 0, 0, 0, 0.58, 0.58, 0.72, 6, 3);
  addBox(v, n, m, 0, 0, 0, 1.25, 0.18, 0.18, 2);
  addBox(v, n, m, 0, 0, 0, 0.18, 0.18, 1.25, 2);
  addBox(v, n, m, 0, 0, 0, 0.18, 1.25, 0.18, 2);
  return uploadMesh(gl, v, n, m);
}

export function buildCrownMesh(gl) {
  const v = [], n = [], m = [];
  // 3D Floating Golden Sovereign Crown for #1 Leaderboard Dragon
  const sides = 6;
  const r = 0.58;
  for (let i = 0; i < sides; i++) {
    const a0 = (i / sides) * Math.PI * 2;
    const a1 = ((i + 1) / sides) * Math.PI * 2;
    const am = (a0 + a1) * 0.5;
    const b0 = [Math.cos(a0) * r, 0, Math.sin(a0) * r];
    const b1 = [Math.cos(a1) * r, 0, Math.sin(a1) * r];
    const t0 = [Math.cos(a0) * r * 1.12, 0.34, Math.sin(a0) * r * 1.12];
    const t1 = [Math.cos(a1) * r * 1.12, 0.34, Math.sin(a1) * r * 1.12];
    const spike = [Math.cos(am) * r * 1.2, 0.78, Math.sin(am) * r * 1.2];
    pushQuad(v, n, m, b0, b1, t1, t0, 2);
    pushQuad(v, n, m, b1, b0, t0, t1, 2);
    pushTri(v, n, m, t0, t1, spike, 3);
    pushTri(v, n, m, t1, t0, spike, 3);
  }
  return uploadMesh(gl, v, n, m);
}

export function buildAuraRingMesh(gl, segs = 24, radius = 1.45, tube = 0.085) {
  const v = [], n = [], m = [];
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = ((i + 1) / segs) * Math.PI * 2;
    const rIn = radius - tube, rOut = radius + tube;
    const p0 = [Math.cos(a0) * rIn, 0, Math.sin(a0) * rIn];
    const p1 = [Math.cos(a0) * rOut, 0, Math.sin(a0) * rOut];
    const p2 = [Math.cos(a1) * rOut, 0, Math.sin(a1) * rOut];
    const p3 = [Math.cos(a1) * rIn, 0, Math.sin(a1) * rIn];
    const mat = i % 3 === 0 ? 3 : 2;
    pushQuad(v, n, m, p0, p1, p2, p3, mat);
    pushQuad(v, n, m, p3, p2, p1, p0, mat);
  }
  return uploadMesh(gl, v, n, m);
}

export function buildPedestalMesh(gl) {
  const v = [], n = [], m = [];
  // Stepped octagonal 3D Royal Citadel Stage for Home & Dragon Lab
  addPrism(v, n, m, 0, -0.55, 0, 3.6, 3.2, 0.48, 8, 0);
  addPrism(v, n, m, 0, -0.18, 0, 2.7, 2.5, 0.28, 8, 1);
  // 4 floating crystal spires around pedestal
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const cx = Math.cos(a) * 3.15, cz = Math.sin(a) * 3.15;
    addPrism(v, n, m, cx, 0.12, cz, 0.28, 0.04, 1.35, 5, 3);
  }
  return uploadMesh(gl, v, n, m);
}

export function buildArenaBoundaryMesh(gl, segments = 48) {
  const v = [], n = [], m = [];
  // Unit-radius circular energy wall + 12 architectural citadel pillars (scaled by arena.currentRadius)
  const wallH = 0.065; // relative to radius ~90 => ~6 units tall
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2;
    const b0 = [Math.cos(a0), 0, Math.sin(a0)];
    const b1 = [Math.cos(a1), 0, Math.sin(a1)];
    const t0 = [Math.cos(a0), wallH, Math.sin(a0)];
    const t1 = [Math.cos(a1), wallH, Math.sin(a1)];
    pushQuad(v, n, m, b0, b1, t1, t0, 3);
    pushQuad(v, n, m, b1, b0, t0, t1, 3);
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const px = Math.cos(a) * 1.02, pz = Math.sin(a) * 1.02;
    addPrism(v, n, m, px, wallH * 0.75, pz, 0.025, 0.018, wallH * 1.6, 6, 2);
  }
  return uploadMesh(gl, v, n, m);
}

export function buildParticleMesh(gl) {
  const v = [], n = [], m = [];
  const pts = [[1, 0, 0], [0, 0, 1], [-1, 0, 0], [0, 0, -1]];
  addPyramid(v, n, m, pts, [0, 1, 0], 3);
  addPyramid(v, n, m, [...pts].reverse(), [0, -1, 0], 3);
  return uploadMesh(gl, v, n, m);
}

export function buildShadowDiscMesh(gl) {
  const v = [], n = [], m = [];
  const segs = 12;
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = ((i + 1) / segs) * Math.PI * 2;
    pushTri(v, n, m, [0, 0, 0], [Math.cos(a0), 0, Math.sin(a0)], [Math.cos(a1), 0, Math.sin(a1)], 0);
  }
  return uploadMesh(gl, v, n, m);
}

export function buildGroundPlaneMesh(gl) {
  const v = [], n = [], m = [];
  const S = 260;
  pushQuad(v, n, m, [-S, 0, -S], [S, 0, -S], [S, 0, S], [-S, 0, S], 0);
  return uploadMesh(gl, v, n, m);
}


export function buildPillarMesh(gl) {
  const v = [], n = [], m = [];
  // Destructible 3D Crystal Citadel Pillar (stone base + glowing crystal spire)
  addPrism(v, n, m, 0, 0.7, 0, 1.5, 1.2, 1.4, 6, 0);
  addPrism(v, n, m, 0, 2.7, 0, 0.95, 0.25, 2.9, 6, 3);
  addPrism(v, n, m, 0, 1.5, 0, 1.6, 1.6, 0.22, 6, 2);
  return uploadMesh(gl, v, n, m);
}

export function buildPortalMesh(gl) {
  const v = [], n = [], m = [];
  // Swirling 3D Runic Teleport Portal Ring + Dual Arch Pillars
  const segs = 18;
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = ((i + 1) / segs) * Math.PI * 2;
    const p0 = [Math.cos(a0) * 1.9, 0.14, Math.sin(a0) * 1.9];
    const p1 = [Math.cos(a0) * 2.5, 0.14, Math.sin(a0) * 2.5];
    const p2 = [Math.cos(a1) * 2.5, 0.14, Math.sin(a1) * 2.5];
    const p3 = [Math.cos(a1) * 1.9, 0.14, Math.sin(a1) * 1.9];
    pushQuad(v, n, m, p0, p1, p2, p3, 3);
    pushQuad(v, n, m, p3, p2, p1, p0, 3);
  }
  addPrism(v, n, m, -2.3, 1.6, 0, 0.32, 0.18, 3.2, 6, 2);
  addPrism(v, n, m, 2.3, 1.6, 0, 0.32, 0.18, 3.2, 6, 2);
  addBox(v, n, m, 0, 3.2, 0, 4.9, 0.36, 0.42, 3);
  return uploadMesh(gl, v, n, m);
}

export function buildBoostPadMesh(gl) {
  const v = [], n = [], m = [];
  // Floor Speed Boost Chevron Pad
  addBox(v, n, m, 0, 0.08, 0, 3.8, 0.12, 2.2, 0);
  const c1 = [[1.4, 0.17, 0], [-0.4, 0.17, -0.95], [0.2, 0.17, 0], [-0.4, 0.17, 0.95]];
  pushTri(v, n, m, c1[0], c1[1], c1[2], 3);
  pushTri(v, n, m, c1[0], c1[2], c1[3], 3);
  const c2 = [[0.2, 0.17, 0], [-1.5, 0.17, -0.95], [-0.9, 0.17, 0], [-1.5, 0.17, 0.95]];
  pushTri(v, n, m, c2[0], c2[1], c2[2], 3);
  pushTri(v, n, m, c2[0], c2[2], c2[3], 3);
  return uploadMesh(gl, v, n, m);
}

export function buildCrateMesh(gl) {
  const v = [], n = [], m = [];
  // 3D Royal Dragon Vault Chest + Glowing Lock Crest
  addBox(v, n, m, 0, 0.55, 0, 2.4, 1.3, 1.7, 0);
  addBox(v, n, m, 0, 1.35, 0, 2.55, 0.45, 1.82, 2); // gilded lid trim
  addBox(v, n, m, 0, 1.05, 0.92, 0.55, 0.58, 0.18, 3); // glowing lock gem
  addBox(v, n, m, -1.12, 0.65, 0, 0.24, 1.4, 1.85, 2); // gold strap L
  addBox(v, n, m, 1.12, 0.65, 0, 0.24, 1.4, 1.85, 2); // gold strap R
  return uploadMesh(gl, v, n, m);
}
