// The pulse blaster: fire rate, heat, multishot and piercing. The player owns the
// numbers; this module turns a trigger pull into bullets in the world.

import { PLAYER } from './config.js';

/** Derived weapon stats from the player's upgrade counts. */
export function weaponStats(player) {
  const up = player.upgrades;
  return {
    damage: PLAYER.bulletDamage * (1 + 0.25 * (up.damage || 0)) * (1 + 0.15 * (up.surge || 0)),
    interval: PLAYER.fireInterval / ((1 + 0.2 * (up.rate || 0)) * (1 + 0.1 * (up.surge || 0))),
    projectiles: 1 + (up.multishot || 0),
    pierce: up.pierce || 0,
    heatPerShot: PLAYER.heatPerShot * (1 - 0.25 * (up.coolant || 0)),
    /** Spread between projectiles in radians; a single shot has none. */
    spread: 0.14,
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
  for (let i = 0; i < count; i += 1) {
    const offset = (i - (count - 1) / 2) * stats.spread;
    const a = angle + offset;
    spawnBullet(world, player.x + Math.cos(a) * (player.radius + 6), player.y + Math.sin(a) * (player.radius + 6), Math.cos(a) * PLAYER.bulletSpeed, Math.sin(a) * PLAYER.bulletSpeed, stats.damage, stats.pierce, 'player');
  }
  player.heat = Math.min(100, player.heat + stats.heatPerShot);
  if (player.heat >= 100) player.overheated = true;
  return true;
}

/** An enemy orb: slow, glowing, and the thing that makes the player move. */
export function fireEnemyOrb(world, x, y, angle, speed, damage) {
  spawnBullet(world, x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, damage, 0, 'enemy');
}

function spawnBullet(world, x, y, vx, vy, damage, pierce, from) {
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
    b.life = 2.2;
    b.radius = from === 'player' ? PLAYER.bulletRadius : 7;
    b.hitSet = b.hitSet || new Set();
    b.hitSet.clear();
    return;
  }
}
