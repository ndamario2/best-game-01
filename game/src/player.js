// The player: a pulse-runner with a dash. Movement is acceleration plus
// friction, the dash is a short burst with i-frames, and damage goes through
// the invulnerability window first. All numbers come from config plus the
// upgrade levels on the player.

import { FIELD, PLAYER, STEP } from './config.js';
import { clamp } from './rng.js';
import { fireVolley, weaponStats } from './weapons.js';
import { upgradeLevel } from './upgrades.js';
import { collideObstacles, damageEnemiesNear, onPlayerShot, toField } from './world.js';

/** Fresh player state at the centre of the field. */
export function createPlayer() {
  return {
    x: FIELD.width / 2,
    y: FIELD.height / 2,
    vx: 0,
    vy: 0,
    radius: PLAYER.radius,
    angle: -Math.PI / 2,
    hp: PLAYER.maxHp,
    maxHp: PLAYER.maxHp,
    speed: PLAYER.speed,
    fireTimer: 0,
    heat: 0,
    overheated: false,
    dashTimer: 0,
    dashCooldown: 0,
    dashX: 0,
    dashY: 0,
    invuln: 0,
    upgrades: {},
    kills: 0,
  };
}

/** Move speed after the Ion Thrusters upgrades. */
export function playerSpeed(player) {
  return PLAYER.speed * (1 + 0.12 * upgradeLevel(player, 'speed'));
}

/** Dash cooldown after the Dash Capacitor upgrades. */
export function dashCooldownMax(player) {
  return PLAYER.dashCooldown * (1 - 0.3 * upgradeLevel(player, 'dash'));
}

/** Pickup radius after the Magnet Core upgrades. */
export function pickupRadius(player) {
  return PLAYER.pickupRadius * (1 + 0.6 * upgradeLevel(player, 'magnet'));
}

/**
 * One fixed step of the player: steer, dash, cool the weapon, fire toward the
 * mouse. Returns 'dash' when a dash started this step, else null.
 */
export function stepPlayer(world, player, input, dt) {
  const move = input.move();
  const mouse = input.mouse();
  const aim = toField(world, mouse.x, mouse.y);
  player.angle = Math.atan2(aim.y - player.y, aim.x - player.x);

  let dashed = null;
  if (player.dashTimer > 0) {
    player.dashTimer -= dt;
    player.vx = player.dashX * PLAYER.dashSpeed;
    player.vy = player.dashY * PLAYER.dashSpeed;
    world.effects.trail(player.x, player.y, '#35f2ff');
  } else {
    const speed = playerSpeed(player);
    player.vx += move.x * PLAYER.accel * dt;
    player.vy += move.y * PLAYER.accel * dt;
    const v = Math.hypot(player.vx, player.vy);
    if (v > speed) {
      player.vx = (player.vx / v) * speed;
      player.vy = (player.vy / v) * speed;
    }
    if (move.x === 0 && move.y === 0) {
      const f = Math.max(0, v - PLAYER.friction * dt);
      if (v > 0) {
        player.vx = (player.vx / v) * f;
        player.vy = (player.vy / v) * f;
      }
    }
    if (input.dashQueued && player.dashCooldown <= 0) {
      const dx = move.x !== 0 || move.y !== 0 ? move.x : Math.cos(player.angle);
      const dy = move.x !== 0 || move.y !== 0 ? move.y : Math.sin(player.angle);
      const len = Math.hypot(dx, dy) || 1;
      player.dashX = dx / len;
      player.dashY = dy / len;
      player.dashTimer = PLAYER.dashTime;
      player.dashCooldown = dashCooldownMax(player);
      player.invuln = Math.max(player.invuln, PLAYER.dashInvuln);
      dashed = 'dash';
      if (upgradeLevel(player, 'shockwave') > 0) {
        damageEnemiesNear(world, player.x, player.y, 110, 30 * upgradeLevel(player, 'shockwave'));
      }
    }
  }
  input.dashQueued = false;

  player.x = clamp(player.x + player.vx * dt, player.radius, FIELD.width - player.radius);
  player.y = clamp(player.y + player.vy * dt, player.radius, FIELD.height - player.radius);
  collideObstacles(world, player);

  if (player.dashCooldown > 0) player.dashCooldown -= dt;
  if (player.invuln > 0) player.invuln -= dt;

  // Heat: firing adds it, cooling removes it; overheat locks the trigger.
  const stats = weaponStats(player);
  player.heat = Math.max(0, player.heat - PLAYER.heatCool * dt);
  if (player.overheated && player.heat <= PLAYER.heatUnlock) player.overheated = false;

  player.fireTimer -= dt;
  if (input.firing() && player.fireTimer <= 0 && !player.overheated) {
    if (fireVolley(world, player, player.angle)) {
      player.fireTimer = stats.interval;
      onPlayerShot(world);
    }
  }
  return dashed;
}

/** Damage the player, respecting i-frames; returns the damage actually taken. */
export function damagePlayer(world, player, amount) {
  if (player.invuln > 0 || player.hp <= 0) return 0;
  player.hp = Math.max(0, player.hp - amount);
  player.invuln = 0.7;
  world.effects.addShake(0.45);
  world.effects.addFlash(0.25);
  world.effects.burst(player.x, player.y, '#ff5a6e', 14, 260, 0.5);
  return amount;
}

/** Heal the player, never past the cap; returns the HP actually restored. */
export function healPlayer(player, amount) {
  const healed = Math.min(amount, player.maxHp - player.hp);
  player.hp += healed;
  return healed;
}
