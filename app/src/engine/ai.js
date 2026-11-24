/**
 * Dragon Arena — Autonomous Multi-Archetype Tactical NPC AI
 * 6 distinct dragon brains with predictive collision avoidance, boost-cutoff maneuvers,
 * loot-burst scavenging, storm-ring awareness, and organic dragon-vs-dragon combat.
 */

export const NPC_ARCHETYPES = Object.freeze([
  {
    id: 'predator',
    label: 'Apex Predator',
    aggression: 0.92,
    greed: 0.55,
    caution: 0.65,
    boostThreshold: 0.35,
    cutoffRange: 22,
    thinkInterval: 4,
  },
  {
    id: 'scavenger',
    label: 'Loot Scavenger',
    aggression: 0.32,
    greed: 0.96,
    caution: 0.78,
    boostThreshold: 0.42,
    cutoffRange: 14,
    thinkInterval: 5,
  },
  {
    id: 'coiler',
    label: 'Tactical Coiler',
    aggression: 0.72,
    greed: 0.68,
    caution: 0.85,
    boostThreshold: 0.48,
    cutoffRange: 19,
    thinkInterval: 4,
  },
  {
    id: 'sprinter',
    label: 'Phantom Sprinter',
    aggression: 0.64,
    greed: 0.76,
    caution: 0.72,
    boostThreshold: 0.25,
    cutoffRange: 18,
    thinkInterval: 3,
  },
  {
    id: 'guardian',
    label: 'Citadel Guardian',
    aggression: 0.58,
    greed: 0.64,
    caution: 0.90,
    boostThreshold: 0.55,
    cutoffRange: 16,
    thinkInterval: 5,
  },
  {
    id: 'berserker',
    label: 'Chaos Berserker',
    aggression: 0.98,
    greed: 0.60,
    caution: 0.48,
    boostThreshold: 0.22,
    cutoffRange: 25,
    thinkInterval: 4,
  },
]);

export const NPC_CALLSIGNS = Object.freeze([
  'DrakonVex', 'Aurelia', 'Kaelith', 'ZephyrFang', 'ObsidianX', 'SolarisRex',
  'Valkyrie', 'IgnisCore', 'FrostBite', 'NyxShadow', 'OrionWing', 'JadeEmperor',
  'TitanSlayer', 'PyroClaw', 'Aetheris', 'VortexKing', 'CrimsonTalon', 'NovaDrake',
  'ChronoWyrm', 'StormScale', 'Lumina', 'RiftWalker', 'ApexSovereign', 'CinderLord',
]);

const normalizeAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export function createNpcRoster(dragons, count = 11, matchSeed = 1, excludeSkin = '') {
  const pool = dragons.filter(d => d.id !== excludeSkin);
  const roster = [];
  for (let i = 0; i < count; i++) {
    const idx = (matchSeed * 7 + i * 5) % pool.length;
    const dragon = pool[idx];
    const archetype = NPC_ARCHETYPES[i % NPC_ARCHETYPES.length];
    const nameIdx = (matchSeed * 13 + i * 3) % NPC_CALLSIGNS.length;
    // Varied starting mass so the arena immediately has small, medium, and rival apex dragons
    const initialMass = i === 0 ? 55 : i < 3 ? 28 + i * 8 : 6 + (i % 5) * 6;
    const upgradeLevel = Math.min(5, 1 + Math.floor((i % 6) / 2));
    roster.push({
      id: `bot-${i}`,
      displayName: NPC_CALLSIGNS[nameIdx],
      skin: dragon.id,
      dragonLevel: upgradeLevel,
      archetype,
      difficulty: Math.min(0.95, 0.45 + (i % 5) * 0.11),
      initialMass,
      isBot: true,
    });
  }
  return roster;
}

/**
 * Predictive 17-ray steering + tactical state machine for each NPC dragon.
 * Prevents stupid wall/body pileups while driving thrilling real-time PvE & Bot-vs-Bot kills.
 */
export function updateBotBrain(bot, arena) {
  if (!bot.alive || !bot.isBot) return;
  if (arena.tick < bot.aiNextTick) return;

  const arch = bot.archetype || NPC_ARCHETYPES[0];
  bot.aiNextTick = arena.tick + arch.thinkInterval + (bot.id.charCodeAt(bot.id.length - 1) % 3);

  const safeRadius = arena.currentRadius - 3.2;
  const distFromCenter = Math.hypot(bot.x, bot.y);
  const others = arena.players.filter(q => q !== bot && q.alive);

  // 1. Choose Tactical Objective (Flee Storm -> Scavenge Death Loot -> Hunt/Cutoff Rival -> Harvest Food -> Patrol Center)
  let goalX = 0;
  let goalY = 0;
  let wantBoost = false;
  let wantFury = false;
  let mode = 'harvest';

  // Priority A: Escape Arena Boundary / Shrinking Storm Ring
  if (distFromCenter > safeRadius - 8) {
    const inward = Math.atan2(-bot.y, -bot.x);
    goalX = bot.x + Math.cos(inward) * 24;
    goalY = bot.y + Math.sin(inward) * 24;
    mode = 'escape_edge';
    wantBoost = distFromCenter > safeRadius - 3.5 && bot.stamina > 25;
  } else {
    // Priority B: Scan for high-value Death Loot or Power-up Orbs
    let bestFood = null;
    let bestFoodScore = -Infinity;
    for (let i = 0; i < arena.food.length; i++) {
      const f = arena.food[i];
      const dx = f.x - bot.x;
      const dy = f.y - bot.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > 1400) continue; // within ~37 units
      const d = Math.sqrt(d2);
      const sourceBonus = f.source === 'death' ? 3.2 * arch.greed : f.source === 'event' ? 4.0 : f.isPowerup ? 3.8 : 1.0;
      const score = ((f.mass * 1.4 + 2.0) * sourceBonus) / (d + 3.5);
      if (score > bestFoodScore) {
        bestFoodScore = score;
        bestFood = f;
      }
    }

    // Priority C: Evaluate Rival Dragons for Cutoff Kill or Fury Blast
    let bestPrey = null;
    let bestPreyDist = Infinity;
    for (const q of others) {
      if (q.spawnShieldTicks > 0 || q.shieldTicks > 0) continue;
      const d = Math.hypot(q.x - bot.x, q.y - bot.y);
      if (d < arch.cutoffRange && d < bestPreyDist) {
        // Predators & Berserkers hunt almost anyone; others prefer smaller or equal targets
        const sizeOk = arch.aggression > 0.8 || bot.mass >= q.mass * 0.72;
        if (sizeOk) {
          bestPrey = q;
          bestPreyDist = d;
        }
      }
      // Fire elemental Fury breath if rival is right in front!
      if (bot.fury >= 100 && d < 12.5 && !q.isBoss) {
        const angleToQ = Math.atan2(q.y - bot.y, q.x - bot.x);
        if (Math.abs(normalizeAngle(angleToQ - bot.angle)) < 0.55) {
          wantFury = true;
        }
      }
    }

    if (bestPrey && (arch.aggression > 0.65 || bestFoodScore < 1.3)) {
      // Predictive Intercept: aim AHEAD of prey's heading to force them into our body!
      const leadDist = Math.min(9.5, bestPreyDist * 0.62);
      goalX = bestPrey.x + Math.cos(bestPrey.angle) * leadDist;
      goalY = bestPrey.y + Math.sin(bestPrey.angle) * leadDist;
      mode = 'intercept';
      wantBoost = bestPreyDist < 16 && bestPreyDist > 3.5 && bot.stamina > bot.maxStamina * arch.boostThreshold;
    } else if (bestFood) {
      goalX = bestFood.x;
      goalY = bestFood.y;
      mode = bestFood.source === 'death' ? 'scavenge' : 'harvest';
      wantBoost = (bestFood.source === 'death' || bestFood.source === 'event') && bestFoodScore > 1.8 && bot.stamina > 35;
    } else {
      // Patrol gently around inner citadel
      const orbitAngle = Math.atan2(bot.y, bot.x) + (bot.id.charCodeAt(bot.id.length - 1) % 2 ? 0.6 : -0.6);
      const orbitR = Math.min(safeRadius * 0.52, 42);
      goalX = Math.cos(orbitAngle) * orbitR;
      goalY = Math.sin(orbitAngle) * orbitR;
    }
  }

  // 2. 17-Ray Multi-Depth Predictive Obstacle & Collision Avoidance
  const desiredAngle = Math.atan2(goalY - bot.y, goalX - bot.x);
  let bestHeading = bot.angle;
  let bestUtility = -Infinity;
  let immediateThreat = false;

  const rayCount = 8; // -8 to +8 => 17 candidate headings covering full +-145 deg
  const lookDists = [3.6, 7.2, 11.5];

  for (let r = -rayCount; r <= rayCount; r++) {
    const candidate = normalizeAngle(bot.angle + r * 0.30);
    const cosA = Math.cos(candidate);
    const sinA = Math.sin(candidate);

    // Alignment with tactical goal
    const angleDiff = Math.abs(normalizeAngle(candidate - desiredAngle));
    let utility = Math.cos(angleDiff) * 3.8 - Math.abs(r) * 0.055;

    // Evaluate hazards along short, mid, and long lookahead distances
    for (let li = 0; li < lookDists.length; li++) {
      const ld = lookDists[li];
      const weight = li === 0 ? 3.2 : li === 1 ? 1.55 : 0.72;
      const px = bot.x + cosA * ld;
      const py = bot.y + sinA * ld;

      // Circular Colosseum wall & Storm Ring avoidance
      const radial = Math.hypot(px, py);
      if (radial > safeRadius - 2.2) {
        utility -= (radial - (safeRadius - 2.2)) * 4.8 * weight;
      }

      // Check rival dragon heads (predicted forward) and body segments
      for (let oi = 0; oi < others.length; oi++) {
        const q = others[oi];
        const predQ = { x: q.x + Math.cos(q.angle) * (ld * 0.45), y: q.y + Math.sin(q.angle) * (ld * 0.45) };
        const headD = Math.hypot(px - predQ.x, py - predQ.y);
        const dangerHeadR = q.isBoss ? 6.2 : 4.2;
        if (headD < dangerHeadR) {
          const fear = (q.mass > bot.mass * 0.85 || q.isBoss || q.shieldTicks > 0) ? 4.4 : 1.5;
          utility -= (dangerHeadR - headD) * fear * arch.caution * weight;
          if (li === 0 && r === 0) immediateThreat = true;
        }

        // Body segment collision avoidance (adaptive stride for speed)
        const body = q.body;
        const stride = Math.max(1, Math.floor(body.length / 28));
        const bodyDangerR = q.isBoss ? 4.4 : 3.2;
        for (let k = 1; k < body.length; k += stride) {
          const seg = body[k];
          const dx = px - seg.x;
          const dy = py - seg.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < bodyDangerR * bodyDangerR) {
            const d = Math.sqrt(d2);
            utility -= (bodyDangerR - d) * 5.2 * arch.caution * weight;
            if (li === 0 && r === 0 && d < 2.5) immediateThreat = true;
          }
        }
      }
    }

    if (utility > bestUtility) {
      bestUtility = utility;
      bestHeading = candidate;
    }
  }

  bot.aimAngle = bestHeading;
  // Emergency evade boost if threatened and clear path found
  if (immediateThreat && bot.stamina > 20 && bestUtility > -2) {
    bot.boost = true;
  } else {
    bot.boost = wantBoost && !immediateThreat && mode !== 'escape_edge' ? true : wantBoost;
  }
  bot.wantFury = wantFury;
}
