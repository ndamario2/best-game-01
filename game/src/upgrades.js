// The upgrade draft: after every cleared wave the player picks one of three
// cards. Each upgrade stacks up to 5 times; the pool is the depth of the run,
// so a run that leans into multishot plays differently from one that leans
// into dash and speed.

export const UPGRADE_MAX_LEVEL = 5;

/** The whole pool: id, name, what it does, and the line the card shows. */
export const UPGRADE_POOL = [
  { id: 'damage', name: 'Overclocked Rounds', desc: '+25% bullet damage', apply: 'damage' },
  { id: 'rate', name: 'Rapid Cycler', desc: '+20% fire rate', apply: 'rate' },
  { id: 'multishot', name: 'Split Barrel', desc: '+1 projectile per shot', apply: 'multishot' },
  { id: 'speed', name: 'Ion Thrusters', desc: '+12% move speed', apply: 'speed' },
  { id: 'plating', name: 'Ablative Plating', desc: '+25 max HP, restore 25 HP', apply: 'plating' },
  { id: 'coolant', name: 'Coolant Vents', desc: '-25% heat build-up', apply: 'coolant' },
  { id: 'dash', name: 'Dash Capacitor', desc: '-30% dash cooldown', apply: 'dash' },
  { id: 'magnet', name: 'Magnet Core', desc: '+60% pickup radius', apply: 'magnet' },
  { id: 'surge', name: 'Adrenal Surge', desc: '+15% damage, +10% fire rate', apply: 'surge' },
  { id: 'nanoweave', name: 'Nanoweave', desc: 'Heal 40 HP when a wave clears', apply: 'nanoweave' },
  { id: 'pierce', name: 'Piercing Rounds', desc: 'Bullets pierce +1 enemy', apply: 'pierce' },
  { id: 'shockwave', name: 'Shockwave Dash', desc: 'Dashing damages nearby enemies', apply: 'shockwave' },
];

/** Roll three distinct upgrades the player has not maxed, using the world's rng. */
export function rollUpgrades(random, upgrades) {
  const available = UPGRADE_POOL.filter((u) => (upgrades[u.id] || 0) < UPGRADE_MAX_LEVEL);
  const picks = [];
  const pool = available.slice();
  while (picks.length < 3 && pool.length > 0) {
    const index = Math.floor(random() * pool.length);
    picks.push(pool.splice(index, 1)[0]);
  }
  return picks;
}

/**
 * Apply `upgrade` to the player: bump its level and run the one-time effects
 * (plating heals and raises the cap at once; the rest are read by the systems
 * that use them every step).
 */
export function applyUpgrade(player, upgrade) {
  player.upgrades[upgrade.id] = (player.upgrades[upgrade.id] || 0) + 1;
  if (upgrade.id === 'plating') {
    player.maxHp += 25;
    player.hp = Math.min(player.maxHp, player.hp + 25);
  }
}

/** Current level of an upgrade on the player (0 when never taken). */
export function upgradeLevel(player, id) {
  return player.upgrades[id] || 0;
}
