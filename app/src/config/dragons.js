/**
 * Dragon Arena — 24 Unique 3D Dragons with Real Scaling Capacities,
 * Distinct Visual Geometry Traits, Elemental Abilities & Upgrade Curves.
 */

export const RARITY_CONFIG = Object.freeze({
  common: {
    label: 'COMMON',
    color: '#94a3b8',
    glow: [0.55, 0.72, 0.88],
    ringCount: 0,
    wingScale: 0.72,
    hornScale: 0.75,
    auraIntensity: 0.25,
    upgradeBaseCost: 250,
  },
  uncommon: {
    label: 'UNCOMMON',
    color: '#34d399',
    glow: [0.22, 0.85, 0.58],
    ringCount: 0,
    wingScale: 0.84,
    hornScale: 0.88,
    auraIntensity: 0.38,
    upgradeBaseCost: 450,
  },
  rare: {
    label: 'RARE',
    color: '#38bdf8',
    glow: [0.24, 0.72, 0.98],
    ringCount: 0,
    wingScale: 0.95,
    hornScale: 1.0,
    auraIntensity: 0.52,
    upgradeBaseCost: 800,
  },
  epic: {
    label: 'EPIC',
    color: '#c084fc',
    glow: [0.76, 0.45, 0.98],
    ringCount: 1,
    wingScale: 1.08,
    hornScale: 1.15,
    auraIntensity: 0.72,
    upgradeBaseCost: 1500,
  },
  legendary: {
    label: 'LEGENDARY',
    color: '#fbbf24',
    glow: [1.0, 0.76, 0.22],
    ringCount: 1,
    wingScale: 1.22,
    hornScale: 1.32,
    auraIntensity: 0.95,
    upgradeBaseCost: 2800,
  },
  mythic: {
    label: 'MYTHIC',
    color: '#fb7185',
    glow: [1.0, 0.38, 0.68],
    ringCount: 2,
    wingScale: 1.38,
    hornScale: 1.5,
    auraIntensity: 1.25,
    upgradeBaseCost: 4800,
  },
});

export const DRAGONS = Object.freeze([
  // COMMON (0 - 300 coins)
  {
    id: 'pebble_wisp', name: 'Pebble Wisp', rarity: 'common', price: 0,
    element: 'Earth', ability: 'Stone Guard', abilityDesc: 'Hardens scales for +25% wider collision safety',
    primary: [0.52, 0.58, 0.64], secondary: [0.74, 0.82, 0.88], accent: [0.95, 0.80, 0.45],
    eyeColor: [1.0, 0.88, 0.35], crestStyle: 'ridge', wingStyle: 'drake',
    stats: { speed: 1.00, agility: 1.00, boostCap: 100, magnet: 1.00, massMult: 1.00, furyRate: 1.00 },
  },
  {
    id: 'leafling', name: 'Sylvan Leafling', rarity: 'common', price: 0,
    element: 'Nature', ability: 'Verdant Pulse', abilityDesc: 'Draws nearby botanical orbs +12% faster',
    primary: [0.22, 0.68, 0.38], secondary: [0.46, 0.88, 0.52], accent: [0.96, 0.85, 0.32],
    eyeColor: [0.95, 1.0, 0.45], crestStyle: 'leaf', wingStyle: 'feathered',
    stats: { speed: 1.02, agility: 1.04, boostCap: 102, magnet: 1.12, massMult: 1.00, furyRate: 1.02 },
  },
  {
    id: 'bubbletail', name: 'Tide Bubbletail', rarity: 'common', price: 250,
    element: 'Water', ability: 'Slipstream', abilityDesc: 'Smooth agile turns with lower boost drain',
    primary: [0.18, 0.56, 0.82], secondary: [0.45, 0.86, 0.96], accent: [0.82, 0.96, 1.0],
    eyeColor: [0.4, 1.0, 1.0], crestStyle: 'fin', wingStyle: 'aquatic',
    stats: { speed: 1.03, agility: 1.06, boostCap: 108, magnet: 1.04, massMult: 1.02, furyRate: 1.03 },
  },
  {
    id: 'rockcoil', name: 'Basalt Rockcoil', rarity: 'common', price: 350,
    element: 'Earth', ability: 'Heavy Scales', abilityDesc: 'Starts matches with +15 bonus starting mass',
    primary: [0.44, 0.36, 0.32], secondary: [0.78, 0.48, 0.24], accent: [1.0, 0.55, 0.18],
    eyeColor: [1.0, 0.52, 0.15], crestStyle: 'spike', wingStyle: 'armored',
    stats: { speed: 0.99, agility: 0.98, boostCap: 112, magnet: 1.02, massMult: 1.06, furyRate: 1.04 },
  },

  // UNCOMMON (600 - 1,100 coins)
  {
    id: 'aqua_crystal', name: 'Aqua Crystal', rarity: 'uncommon', price: 650,
    element: 'Water', ability: 'Tidal Surge', abilityDesc: 'Boost bursts emit a water wake that pulls orbs',
    primary: [0.10, 0.62, 0.78], secondary: [0.35, 0.94, 0.98], accent: [0.88, 0.98, 1.0],
    eyeColor: [0.6, 1.0, 1.0], crestStyle: 'crystal', wingStyle: 'aquatic',
    stats: { speed: 1.05, agility: 1.07, boostCap: 115, magnet: 1.14, massMult: 1.05, furyRate: 1.06 },
  },
  {
    id: 'forest_sprite', name: 'Emerald Sprite', rarity: 'uncommon', price: 750,
    element: 'Nature', ability: 'Nectar Harvest', abilityDesc: '+8% extra mass from natural arena food',
    primary: [0.14, 0.58, 0.42], secondary: [0.38, 0.92, 0.62], accent: [1.0, 0.88, 0.40],
    eyeColor: [1.0, 0.95, 0.4], crestStyle: 'leaf', wingStyle: 'feathered',
    stats: { speed: 1.06, agility: 1.08, boostCap: 114, magnet: 1.16, massMult: 1.08, furyRate: 1.07 },
  },
  {
    id: 'flame_wisp', name: 'Ember Flamewisp', rarity: 'uncommon', price: 900,
    element: 'Fire', ability: 'Cinder Trail', abilityDesc: 'High top boost velocity & scorching fire breath',
    primary: [0.82, 0.24, 0.14], secondary: [0.98, 0.58, 0.16], accent: [1.0, 0.92, 0.48],
    eyeColor: [1.0, 0.92, 0.3], crestStyle: 'horn', wingStyle: 'drake',
    stats: { speed: 1.08, agility: 1.05, boostCap: 118, magnet: 1.08, massMult: 1.06, furyRate: 1.10 },
  },
  {
    id: 'frost_scale', name: 'Glacier Frostscale', rarity: 'uncommon', price: 1050,
    element: 'Ice', ability: 'Permafrost Cone', abilityDesc: 'Ultimate breath slows rival dragons in range',
    primary: [0.36, 0.64, 0.88], secondary: [0.76, 0.92, 1.0], accent: [0.92, 0.98, 1.0],
    eyeColor: [0.65, 0.95, 1.0], crestStyle: 'crystal', wingStyle: 'armored',
    stats: { speed: 1.06, agility: 1.09, boostCap: 120, magnet: 1.12, massMult: 1.07, furyRate: 1.08 },
  },

  // RARE (1,800 - 2,800 coins)
  {
    id: 'crystal_fox', name: 'Prism Kitsune', rarity: 'rare', price: 1800,
    element: 'Arcane', ability: 'Mirage Juke', abilityDesc: 'Razor-sharp turning agility and wide orb pull',
    primary: [0.28, 0.52, 0.92], secondary: [0.62, 0.84, 1.0], accent: [0.98, 0.72, 0.96],
    eyeColor: [1.0, 0.86, 1.0], crestStyle: 'crystal', wingStyle: 'feathered',
    stats: { speed: 1.09, agility: 1.15, boostCap: 125, magnet: 1.22, massMult: 1.10, furyRate: 1.12 },
  },
  {
    id: 'lunar_bunny', name: 'Lunar Crescent', rarity: 'rare', price: 2100,
    element: 'Moon', ability: 'Moonlight Leap', abilityDesc: 'Extended boost capacity & lunar orb bonus',
    primary: [0.42, 0.46, 0.76], secondary: [0.82, 0.86, 0.98], accent: [1.0, 0.90, 0.58],
    eyeColor: [1.0, 0.92, 0.55], crestStyle: 'crown', wingStyle: 'feathered',
    stats: { speed: 1.10, agility: 1.13, boostCap: 132, magnet: 1.20, massMult: 1.11, furyRate: 1.14 },
  },
  {
    id: 'thunder_cub', name: 'Voltaic Stormdrake', rarity: 'rare', price: 2450,
    element: 'Storm', ability: 'Arc Lightning', abilityDesc: 'Blazing acceleration & rapid Fury charging',
    primary: [0.22, 0.42, 0.78], secondary: [0.96, 0.84, 0.24], accent: [0.58, 0.94, 1.0],
    eyeColor: [1.0, 0.96, 0.45], crestStyle: 'spike', wingStyle: 'drake',
    stats: { speed: 1.13, agility: 1.12, boostCap: 130, magnet: 1.18, massMult: 1.10, furyRate: 1.18 },
  },
  {
    id: 'shadow_pup', name: 'Umbra Nightstalker', rarity: 'rare', price: 2800,
    element: 'Shadow', ability: 'Phantom Fang', abilityDesc: '+20% bonus coins & mass from defeated rivals',
    primary: [0.22, 0.18, 0.34], secondary: [0.56, 0.34, 0.84], accent: [0.95, 0.42, 0.74],
    eyeColor: [1.0, 0.32, 0.55], crestStyle: 'horn', wingStyle: 'drake',
    stats: { speed: 1.12, agility: 1.14, boostCap: 134, magnet: 1.20, massMult: 1.13, furyRate: 1.16 },
  },

  // EPIC (4,200 - 6,500 coins)
  {
    id: 'neon_dragonling', name: 'Azure Skyblade', rarity: 'epic', price: 4200,
    element: 'Plasma', ability: 'Aero Overdrive', abilityDesc: 'Balanced apex fighter with plasma wing trail',
    primary: [0.16, 0.54, 0.88], secondary: [0.34, 0.86, 0.98], accent: [0.98, 0.76, 0.28],
    eyeColor: [1.0, 0.90, 0.38], crestStyle: 'crown', wingStyle: 'drake',
    stats: { speed: 1.14, agility: 1.16, boostCap: 142, magnet: 1.28, massMult: 1.15, furyRate: 1.20 },
  },
  {
    id: 'solar_wyvern', name: 'Solaris Wyvern', rarity: 'epic', price: 4900,
    element: 'Solar', ability: 'Sunflare Nova', abilityDesc: 'Wide solar blast that shatters rival shields',
    primary: [0.88, 0.44, 0.12], secondary: [1.0, 0.78, 0.24], accent: [1.0, 0.96, 0.72],
    eyeColor: [1.0, 0.98, 0.65], crestStyle: 'horn', wingStyle: 'drake',
    stats: { speed: 1.16, agility: 1.14, boostCap: 146, magnet: 1.26, massMult: 1.17, furyRate: 1.24 },
  },
  {
    id: 'void_serpent', name: 'Abyssal Voidwyrm', rarity: 'epic', price: 5600,
    element: 'Void', ability: 'Gravity Well', abilityDesc: 'Passive magnetic pull draws loot from far away',
    primary: [0.24, 0.14, 0.42], secondary: [0.62, 0.28, 0.88], accent: [0.42, 0.88, 0.96],
    eyeColor: [0.76, 0.46, 1.0], crestStyle: 'spike', wingStyle: 'serpent',
    stats: { speed: 1.15, agility: 1.18, boostCap: 148, magnet: 1.42, massMult: 1.16, furyRate: 1.22 },
  },
  {
    id: 'ocean_leviathan', name: 'Abyss Leviathan', rarity: 'epic', price: 6400,
    element: 'Abyss', ability: 'Maelstrom Coil', abilityDesc: 'Massive stamina reserve & heavy body armor',
    primary: [0.08, 0.38, 0.58], secondary: [0.18, 0.76, 0.82], accent: [0.96, 0.82, 0.36],
    eyeColor: [0.35, 1.0, 0.92], crestStyle: 'fin', wingStyle: 'aquatic',
    stats: { speed: 1.15, agility: 1.17, boostCap: 158, magnet: 1.32, massMult: 1.20, furyRate: 1.22 },
  },

  // LEGENDARY (10,500 - 16,000 coins)
  {
    id: 'celestial_dragon', name: 'Celestial Sovereign', rarity: 'legendary', price: 10500,
    element: 'Light', ability: 'Radiant Decree', abilityDesc: 'Golden halo aura + massive 1.26x mass harvest',
    primary: [0.86, 0.66, 0.22], secondary: [1.0, 0.90, 0.55], accent: [0.42, 0.82, 1.0],
    eyeColor: [1.0, 0.98, 0.78], crestStyle: 'crown', wingStyle: 'royal',
    stats: { speed: 1.19, agility: 1.20, boostCap: 168, magnet: 1.40, massMult: 1.26, furyRate: 1.30 },
  },
  {
    id: 'crimson_phoenix', name: 'Crimson Phoenix', rarity: 'legendary', price: 12200,
    element: 'Inferno', ability: 'Rebirth Flame', abilityDesc: 'Blazing inferno speed & explosive kill shockwaves',
    primary: [0.84, 0.16, 0.18], secondary: [1.0, 0.56, 0.14], accent: [1.0, 0.90, 0.38],
    eyeColor: [1.0, 0.92, 0.35], crestStyle: 'crown', wingStyle: 'feathered',
    stats: { speed: 1.22, agility: 1.19, boostCap: 172, magnet: 1.36, massMult: 1.25, furyRate: 1.35 },
  },
  {
    id: 'galactic_serpent', name: 'Galactic Starwyrm', rarity: 'legendary', price: 14000,
    element: 'Cosmos', ability: 'Starlight Siphon', abilityDesc: 'Extreme magnetic pull & orbiting star-ring aura',
    primary: [0.22, 0.26, 0.66], secondary: [0.58, 0.44, 0.96], accent: [1.0, 0.80, 0.36],
    eyeColor: [0.72, 0.95, 1.0], crestStyle: 'crystal', wingStyle: 'royal',
    stats: { speed: 1.20, agility: 1.22, boostCap: 175, magnet: 1.52, massMult: 1.28, furyRate: 1.32 },
  },
  {
    id: 'emerald_kirin', name: 'Jade Imperial Kirin', rarity: 'legendary', price: 15800,
    element: 'Jade', ability: 'Imperial Gale', abilityDesc: 'Supreme turn agility + jade lightning wake',
    primary: [0.10, 0.62, 0.44], secondary: [0.34, 0.92, 0.68], accent: [1.0, 0.82, 0.30],
    eyeColor: [1.0, 0.92, 0.45], crestStyle: 'horn', wingStyle: 'royal',
    stats: { speed: 1.21, agility: 1.26, boostCap: 178, magnet: 1.44, massMult: 1.30, furyRate: 1.34 },
  },

  // MYTHIC (25,000 - 38,000 coins)
  {
    id: 'infinity_dragon', name: 'Infinity Sovereign', rarity: 'mythic', price: 25000,
    element: 'Aether', ability: 'Eternal Singularity', abilityDesc: 'Dual astral rings + overwhelming Fury & mass gain',
    primary: [0.34, 0.28, 0.78], secondary: [0.96, 0.74, 0.28], accent: [0.46, 0.96, 1.0],
    eyeColor: [1.0, 0.96, 0.65], crestStyle: 'crown', wingStyle: 'mythic',
    stats: { speed: 1.25, agility: 1.26, boostCap: 200, magnet: 1.58, massMult: 1.38, furyRate: 1.45 },
  },
  {
    id: 'nebula_phoenix', name: 'Nebula Seraphim', rarity: 'mythic', price: 29000,
    element: 'Supernova', ability: 'Supernova Wings', abilityDesc: 'Apex velocity & cosmic firestorm ultimate',
    primary: [0.76, 0.20, 0.48], secondary: [1.0, 0.64, 0.26], accent: [0.62, 0.88, 1.0],
    eyeColor: [1.0, 0.94, 0.55], crestStyle: 'crown', wingStyle: 'mythic',
    stats: { speed: 1.28, agility: 1.25, boostCap: 208, magnet: 1.55, massMult: 1.40, furyRate: 1.48 },
  },
  {
    id: 'time_wyrm', name: 'Chronos Timewyrm', rarity: 'mythic', price: 33000,
    element: 'Chrono', ability: 'Time Dilation', abilityDesc: 'Ultimate pulse slows all nearby enemies dramatically',
    primary: [0.16, 0.44, 0.58], secondary: [0.96, 0.82, 0.34], accent: [0.58, 1.0, 0.92],
    eyeColor: [1.0, 0.96, 0.58], crestStyle: 'crystal', wingStyle: 'mythic',
    stats: { speed: 1.26, agility: 1.30, boostCap: 215, magnet: 1.62, massMult: 1.42, furyRate: 1.52 },
  },
  {
    id: 'astra_leviathan', name: 'Astra Apex Emperor', rarity: 'mythic', price: 38000,
    element: 'Astral', ability: 'Astral Cataclysm', abilityDesc: 'Peak stats across every category + dual galaxy rings',
    primary: [0.18, 0.20, 0.48], secondary: [0.98, 0.42, 0.68], accent: [1.0, 0.86, 0.38],
    eyeColor: [1.0, 0.98, 0.82], crestStyle: 'crown', wingStyle: 'mythic',
    stats: { speed: 1.30, agility: 1.30, boostCap: 225, magnet: 1.70, massMult: 1.48, furyRate: 1.58 },
  },
]);

export function getDragonById(id) {
  return DRAGONS.find(d => d.id === id) || DRAGONS[0];
}

export function getDragonEffectiveStats(dragonId, level = 1) {
  const d = getDragonById(dragonId);
  const lv = Math.max(1, Math.min(5, Number(level) || 1));
  const bonus = 1 + (lv - 1) * 0.065; // +6.5% per upgrade level up to +26% at Lv.5
  return {
    speed: +(d.stats.speed * (1 + (lv - 1) * 0.045)).toFixed(3),
    agility: +(d.stats.agility * (1 + (lv - 1) * 0.04)).toFixed(3),
    boostCap: Math.round(d.stats.boostCap * bonus),
    magnet: +(d.stats.magnet * bonus).toFixed(3),
    massMult: +(d.stats.massMult * (1 + (lv - 1) * 0.05)).toFixed(3),
    furyRate: +(d.stats.furyRate * bonus).toFixed(3),
    powerScore: Math.round(
      (d.stats.speed * 220 + d.stats.agility * 180 + d.stats.boostCap * 1.1 + d.stats.magnet * 140 + d.stats.massMult * 210) * bonus
    ),
  };
}

export function getUpgradeCost(dragonId, currentLevel = 1) {
  const d = getDragonById(dragonId);
  const base = RARITY_CONFIG[d.rarity]?.upgradeBaseCost || 400;
  return Math.round(base * Math.pow(1.65, Math.max(0, currentLevel - 1)));
}
