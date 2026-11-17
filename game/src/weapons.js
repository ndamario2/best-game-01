// Weapons: four ways to answer the arena. The pulse blaster is the starter;
// the draft unlocks the Scattergun (a close-range spread), the Railgun (one
// piercing bolt that hits everything in a line) and Seeker Missiles (homing).
// The player owns the numbers; this module turns a trigger pull into bullets.

import { PLAYER, WEAPON } from './config.js';
import { upgradeLevel } from './upgrades.js';

/** Level of the player's current weapon (0 for the starter blaster). */
export function weaponLevel(player) {
  return player.weapon === 'blaster' ? 0 : upgradeLevel(player, player.weapon);
}

/** Derived weapon stats from the player's weapon and upgrade counts. */
export function weaponStats(player) {
  const up = player.upgrades;
  const damageUp = 1 + 0.25 * (up.damage || 0);
  const rateUp = 1 + 0.2 * (up.rate || 0);
  if (player.weapon === 'shotgun') {
    // Level 1 is the base weapon; further levels add pellets and damage.
    const lv = Math.max(0, upgradeLevel(player, 'shotgun') - 1);
    return {
      damage: WEAPON.shotgun.damage * (1 + 0.2 * lv) * damageUp,
      interval: WEAPON.shotgun.interval / rateUp,
      projectiles: WEAPON.shotgun.pellets + lv,
      pierce: 0,
      heatPerShot: WEAPON.shotgun.heat,
      spread: WEAPON.shotgun.spread,
      speed: WEAPON.shotgun.speed,
      life: WEAPON.shotgun.life,
      radius: PLAYER.bulletRadius,
      homing: 0,
      kind: 'shotgun',
    };
  }
  if (player.weapon === 'railgun') {
    const lv = Math.max(0, upgradeLevel(player, 'railgun') - 1);
    return {
      damage: WEAPON.railgun.damage * (1 + 0.25 * lv) * damageUp,
      interval: WEAPON.railgun.interval / rateUp,
      projectiles: 1,
      pierce: WEAPON.railgun.pierce,
      heatPerShot: WEAPON.railgun.heat,
      spread: 0,
      speed: WEAPON.railgun.speed,
      life: WEAPON.railgun.life,
      radius: WEAPON.railgun.radius,
      homing: 0,
      kind: 'railgun',
    };
  }
  if (player.weapon === 'missiles') {
    const lv = Math.max(0, upgradeLevel(player, 'missiles') - 1);
    return {
      damage: WEAPON.missiles.damage * (1 + 0.2 * lv) * damageUp,
      interval: WEAPON.missiles.interval / rateUp,
      projectiles: WEAPON.missiles.count + lv,
      pierce: 0,
      heatPerShot: WEAPON.missiles.heat,
      spread: 0.3,
      speed: WEAPON.missiles.speed,
      life: 2.4,
      radius: 6,
      homing: WEAPON.missiles.turn,
      kind: 'missiles',
    };
  }
  return {
    damage: PLAYER.bulletDamage * damageUp * (1 + 0.15 * (up.surge || 0)),
    interval: PLAYER.fireInterval / (rateUp * (1 + 0.1 * (up.surge || 0))),
    projectiles: 1 + (up.multishot || 0),
    pierce: up.pierce || 0,
    heatPerShot: PLAYER.heatPerShot * (1 - 0.25 * (up.coolant || 0)),
    /** Spread between projectiles in radians; a single shot has none. */
    spread: 0.14,
    speed: PLAYER.bulletSpeed,
    life: 2.2,
    radius: PLAYER.bulletRadius,
    homing: 0,
    kind: 'blaster',
  };
}

/**
 * Fire one volley toward `angle` from the player's nose. Returns true when at
 * least one bullet left the barrel (false while overheated or still cooling down).
 */
export function fireVolley(world, player, angle) {
  const stats = weaponStats(player);
  if (player.heat >= 100) return false;
  const count = stats.projectiles;
  const critChance = 0.08 * upgradeLevel(player, 'crit');
  for (let i = 0; i < count; i += 1) {
    const offset = (i - (count - 1) / 2) * stats.spread;
    const a = angle + offset;
    const crit = world.random() < critChance;
    spawnBullet(
      world,
      player.x + Math.cos(a) * (player.radius + 6),
      player.y + Math.sin(a) * (player.radius + 6),
      Math.cos(a) * stats.speed,
      Math.sin(a) * stats.speed,
      crit ? stats.damage * 2 : stats.damage,
      stats.pierce,
      'player',
      { life: stats.life, radius: stats.radius, homing: stats.homing, crit, kind: stats.kind },
    );
  }
  player.heat = Math.min(100, player.heat + stats.heatPerShot);
  if (player.heat >= 100) player.overheated = true;
  if (stats.kind === 'railgun') world.audio.rail();
  else if (stats.kind === 'missiles') world.audio.missile();
  return true;
}

/** An enemy orb: slow, glowing, and the thing that makes the player move. */
export function fireEnemyOrb(world, x, y, angle, speed, damage) {
  spawnBullet(world, x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, damage, 0, 'enemy');
}

function spawnBullet(world, x, y, vx, vy, damage, pierce, from, opts) {
  for (let i = 0; i < world.bullets.length; i += 1) {
    const b = world.bullets[i];
    if (b.active) continue;
    b.active = true;
    b.x = x;
    b.y = y;
    b.vx = vx;
    b.vy = vy;
    b.damage = damage;
    b.pierce = pierce;
    b.from = from;
    b.life = (opts && opts.life) || 2.2;
    b.radius = (opts && opts.radius) || (from === 'player' ? PLAYER.bulletRadius : 7);
    b.homing = (opts && opts.homing) || 0;
    b.crit = !!(opts && opts.crit);
    b.kind = (opts && opts.kind) || 'blaster';
    b.bounced = false;
    b.hitSet = b.hitSet || new Set();
    b.hitSet.clear();
    return;
  }
}
