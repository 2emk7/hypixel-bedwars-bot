'use strict';

// Bedwars star/level formula. Every 100 levels ("a prestige") the exp cost
// curve resets: the first 4 levels after a prestige cost 500/1000/2000/3500,
// then every level after that costs a flat 5000 until the next prestige.
const LEVELS_PER_PRESTIGE = 100;
const LEVEL_COST = 5000;
const EASY_LEVEL_COSTS = { 1: 500, 2: 1000, 3: 2000, 4: 3500 };
const EASY_LEVELS = Object.keys(EASY_LEVEL_COSTS).length;
const EASY_EXP = Object.values(EASY_LEVEL_COSTS).reduce((a, b) => a + b, 0);
const PRESTIGE_EXP = EASY_EXP + (LEVELS_PER_PRESTIGE - EASY_LEVELS) * LEVEL_COST;

function bedwarsLevelFromExp(exp) {
  let remaining = exp || 0;
  let levels = Math.floor(remaining / PRESTIGE_EXP) * LEVELS_PER_PRESTIGE;
  remaining %= PRESTIGE_EXP;

  for (let i = 1; i <= EASY_LEVELS; i++) {
    const cost = EASY_LEVEL_COSTS[i];
    if (remaining >= cost) {
      levels += 1;
      remaining -= cost;
    } else {
      return levels;
    }
  }

  levels += Math.floor(remaining / LEVEL_COST);
  return levels;
}

function ratio(a, b) {
  const numerator = a || 0;
  const denominator = b || 0;
  if (denominator === 0) return numerator === 0 ? '0.00' : numerator.toFixed(2);
  return (numerator / denominator).toFixed(2);
}

/**
 * Pulls the useful bits out of the raw player object returned by
 * GET /v2/player and returns a flat, display-ready summary.
 * Returns null if the player has never played Bedwars / has stats hidden.
 */
function summarizeBedwars(player) {
  const bw = player && player.stats && player.stats.Bedwars;
  if (!bw) return null;

  const wins = bw.wins_bedwars || 0;
  const losses = bw.losses_bedwars || 0;
  const finalKills = bw.final_kills_bedwars || 0;
  const finalDeaths = bw.final_deaths_bedwars || 0;
  const kills = bw.kills_bedwars || 0;
  const deaths = bw.deaths_bedwars || 0;
  const bedsBroken = bw.beds_broken_bedwars || 0;
  const gamesPlayed = bw.games_played_bedwars || 0;

  return {
    star: bedwarsLevelFromExp(bw.Experience),
    coins: bw.coins || 0,
    gamesPlayed,
    wins,
    losses,
    wlr: ratio(wins, losses),
    winRatePct: gamesPlayed === 0 ? '0.0' : ((wins / gamesPlayed) * 100).toFixed(1),
    finalKills,
    finalDeaths,
    fkdr: ratio(finalKills, finalDeaths),
    kills,
    deaths,
    kdr: ratio(kills, deaths),
    bedsBroken,
    winstreak: bw.winstreak ?? null, // null if the player hides this
  };
}

module.exports = { summarizeBedwars, bedwarsLevelFromExp };
