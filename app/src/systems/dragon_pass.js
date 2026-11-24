/**
 * Dragon Arena v3.0 — 30-Tier Season Dragon Pass & Weekly Competitive Leagues
 * Includes Free + Premium 30-tier tracks, XP progression, and Bronze -> Sovereign Weekly Leagues.
 */

export const PASS_XP_PER_TIER = 400;
export const PASS_PREMIUM_GEM_COST = 120;

export const DRAGON_PASS_TIERS = Object.freeze(
  Array.from({ length: 30 }, (_, i) => {
    const tier = i + 1;
    const free =
      tier % 10 === 0 ? { gems: 35 }
      : tier % 5 === 0 ? { coins: 900 }
      : tier % 3 === 0 ? { gems: 10 }
      : { coins: 250 + tier * 20 };

    const premium =
      tier === 30 ? { dragonId: 'infinity_dragon', gems: 60 }
      : tier === 20 ? { dragonId: 'celestial_dragon', coins: 2500 }
      : tier === 10 ? { dragonId: 'solar_wyvern', gems: 30 }
      : tier % 5 === 0 ? { gems: 40, coins: 1200 }
      : { coins: 500 + tier * 35, gems: 8 };

    return { tier, free, premium };
  })
);

export const WEEKLY_LEAGUES = Object.freeze([
  { id: 'bronze', name: 'BRONZE COLOSSEUM', icon: '🥉', minScore: 0, reward: { coins: 500 } },
  { id: 'silver', name: 'SILVER CITADEL', icon: '🥈', minScore: 3000, reward: { coins: 1200, gems: 15 } },
  { id: 'gold', name: 'GOLDEN THRONE', icon: '🥇', minScore: 9000, reward: { coins: 2500, gems: 35 } },
  { id: 'obsidian', name: 'OBSIDIAN APEX', icon: '💠', minScore: 20000, reward: { coins: 5000, gems: 65 } },
  { id: 'sovereign', name: 'SOVEREIGN MYTHIC', icon: '👑', minScore: 40000, reward: { coins: 10000, gems: 120 } },
]);

export function getPassTier(passXp = 0) {
  return Math.min(30, 1 + Math.floor(Math.max(0, passXp) / PASS_XP_PER_TIER));
}

export function getPlayerLeague(weeklyScore = 0) {
  let current = WEEKLY_LEAGUES[0];
  for (const lg of WEEKLY_LEAGUES) {
    if (weeklyScore >= lg.minScore) current = lg;
  }
  return current;
}

export function buildLeagueStandings(save) {
  const playerScore = save.weekly?.values?.score || 0;
  const league = getPlayerLeague(playerScore);
  const base = Math.max(800, league.minScore);
  const ghostRivals = [
    { name: 'Aurelia_99', score: Math.round(base + 14500), dragon: 'Infinity Sovereign', isYou: false },
    { name: 'DrakonKing', score: Math.round(base + 9800), dragon: 'Crimson Phoenix', isYou: false },
    { name: 'VortexIndia', score: Math.round(base + 6200), dragon: 'Galactic Starwyrm', isYou: false },
    { name: 'KaelithPro', score: Math.round(base + 3400), dragon: 'Solaris Wyvern', isYou: false },
    { name: 'NyxShadow', score: Math.round(base + 1500), dragon: 'Azure Skyblade', isYou: false },
    { name: save.name || 'DragonLord', score: playerScore, dragon: save.skin, isYou: true },
  ].sort((a, b) => b.score - a.score);
  return { league, standings: ghostRivals };
}
