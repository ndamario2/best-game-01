// Enemies: five kinds plus the boss, each with its own way of hunting. A chaser
// runs the player down, a shooter keeps its distance and fires orbs, a splitter
// bursts into mites, a charger telegraphs and then rams, a brute soaks damage,
// and the Warden — the boss of every fifth wave — cycles radial bursts, aimed
// spreads, summons and charges.

import { ENEMY, FIELD } from './config.js';
import { angleTo, clamp, distance, randomPick } from './rng.js';
import { fireEnemyOrb } from './weapons.js';
import { collideObstacles } from './world.js';

/** Spawn one enemy of `kind` at (x, y) in the world; returns the enemy. */
export function spawnEnemy(world, kind, x, y) {
  const def = ENEMY[kind];
  const waveScale = 1 + (world.wave - 1) * 0.08;
  for (let i = 0; i < world.enemies.length; i += 1) {
    const e = world.enemies[i];
    if (e.active) continue;
    e.active = true;
    e.kind = kind;
    e.x = x;
    e.y = y;
    e.vx = 0;
    e.vy = 0;
    e.radius = def.radius;
    e.maxHp = Math.round(def.hp * waveScale * (kind === 'boss' ? 1 + world.wave * 0.12 : 1));
    e.hp = e.maxHp;
    e.speed = def.speed * (0.9 + world.random() * 0.2);
    e.damage = def.damage;
    e.score = def.score;
    e.color = def.color;
    e.angle = 0;
    e.state = 'hunt';
    e.timer = 0;
    e.fireTimer = 1 + world.random();
    e.hitFlash = 0;
    e.attack = 0;
    e.summonTimer = 6;
    return e;
  }
  return null;
}

/** A spawn point on the arena's edge, at least 260px from the player. */
export function edgeSpawnPoint(world) {
  const player = world.player;
  for (let tries = 0; tries < 12; tries += 1) {
    const side = Math.floor(world.random() * 4);
    let x = 0;
    let y = 0;
    if (side === 0) {
      x = 40 + world.random() * (FIELD.width - 80);
      y = 40;
    } else if (side === 1) {
      x = 40 + world.random() * (FIELD.width - 80);
      y = FIELD.height - 40;
    } else if (side === 2) {
      x = 40;
      y = 40 + world.random() * (FIELD.height - 80);
    } else {
      x = FIELD.width - 40;
      y = 40 + world.random() * (FIELD.height - 80);
    }
    if (distance(x, y, player.x, player.y) >= 260) return { x, y };
  }
  return { x: 40, y: 40 };
}

/** The spawn queue for a wave: a shuffled list of kinds from the wave's budget. */
export function buildWaveQueue(world, wave) {
  const budget = 6 + wave * 4;
  const queue = [];
  let spent = 0;
  const kinds = ['chaser', 'shooter', 'splitter', 'charger'];
  if (wave >= 3) kinds.push('brute');
  const costs = { chaser: 1, shooter: 2, splitter: 2, charger: 2, brute: 4 };
  while (spent < budget) {
    const kind = randomPick(world.random, kinds);
    if (spent + costs[kind] > budget + 2) break;
    queue.push(kind);
    spent += costs[kind];
  }
  // Shuffle so the wave never opens the same way twice.
  for (let i = queue.length - 1; i > 0; i -= 1) {
    const j = Math.floor(world.random() * (i + 1));
    const tmp = queue[i];
    queue[i] = queue[j];
    queue[j] = tmp;
  }
  return queue;
}

function steer(e, tx, ty, speed, dt) {
  const a = angleTo(e.x, e.y, tx, ty);
  e.vx += Math.cos(a) * speed * 3 * dt;
  e.vy += Math.sin(a) * speed * 3 * dt;
  const v = Math.hypot(e.vx, e.vy);
  if (v > speed) {
    e.vx = (e.vx / v) * speed;
    e.vy = (e.vy / v) * speed;
  }
  e.angle = a;
}

function keepInField(e) {
  e.x = clamp(e.x, e.radius, FIELD.width - e.radius);
  e.y = clamp(e.y, e.radius, FIELD.height - e.radius);
}

/** One fixed step of a single enemy's behaviour. */
export function stepEnemy(world, e, dt) {
  const player = world.player;
  const dist = distance(e.x, e.y, player.x, player.y);
  e.hitFlash = Math.max(0, e.hitFlash - dt * 6);

  if (e.kind === 'chaser' || e.kind === 'mite') {
    steer(e, player.x, player.y, e.speed, dt);
  } else if (e.kind === 'shooter') {
    if (dist > 300) steer(e, player.x, player.y, e.speed, dt);
    else if (dist < 220) steer(e, 2 * e.x - player.x, 2 * e.y - player.y, e.speed, dt);
    else {
      e.vx *= 0.9;
      e.vy *= 0.9;
    }
    e.angle = angleTo(e.x, e.y, player.x, player.y);
    e.fireTimer -= dt;
    if (e.fireTimer <= 0 && dist < 560) {
      e.fireTimer = 2.1 + world.random() * 0.6;
      fireEnemyOrb(world, e.x, e.y, e.angle, 240, e.damage);
      world.audio.hit();
    }
  } else if (e.kind === 'splitter') {
    steer(e, player.x, player.y, e.speed, dt);
  } else if (e.kind === 'charger') {
    if (e.state === 'hunt') {
      steer(e, player.x, player.y, e.speed, dt);
      if (dist < 230) {
        e.state = 'aim';
        e.timer = 0.6;
        e.angle = angleTo(e.x, e.y, player.x, player.y);
      }
    } else if (e.state === 'aim') {
      e.timer -= dt;
      e.vx *= 0.85;
      e.vy *= 0.85;
      e.angle = angleTo(e.x, e.y, player.x, player.y);
      if (e.timer <= 0) {
        e.state = 'charge';
        e.timer = 0.55;
        e.vx = Math.cos(e.angle) * 520;
        e.vy = Math.sin(e.angle) * 520;
      }
    } else if (e.state === 'charge') {
      e.timer -= dt;
      if (e.timer <= 0) {
        e.state = 'rest';
        e.timer = 1.1;
      }
    } else {
      e.timer -= dt;
      e.vx *= 0.8;
      e.vy *= 0.8;
      if (e.timer <= 0) e.state = 'hunt';
    }
  } else if (e.kind === 'brute') {
    steer(e, player.x, player.y, e.speed, dt);
  } else if (e.kind === 'boss') {
    stepBoss(world, e, dt, dist);
  }

  e.x += e.vx * dt;
  e.y += e.vy * dt;
  keepInField(e);
  collideObstacles(world, e);
}

/** The Warden: cycles radial bursts, aimed spreads, summons and a charge. */
function stepBoss(world, e, dt, dist) {
  e.attack += dt;
  e.summonTimer -= dt;
  const phase = e.hp < e.maxHp * 0.33 ? 3 : e.hp < e.maxHp * 0.66 ? 2 : 1;
  const cycle = 3.4 - phase * 0.5;
  if (e.state === 'hunt') {
    steer(e, world.player.x, world.player.y, e.speed + phase * 8, dt);
    if (e.attack >= cycle) {
      e.attack = 0;
      const roll = world.random();
      if (roll < 0.4) {
        // Radial burst: a ring of orbs in every direction.
        for (let i = 0; i < 12; i += 1) {
          fireEnemyOrb(world, e.x, e.y, (i / 12) * Math.PI * 2, 190, 10);
        }
        world.audio.boss();
      } else if (roll < 0.75) {
        // Aimed spread: five orbs fanned at the player.
        const base = angleTo(e.x, e.y, world.player.x, world.player.y);
        for (let i = -2; i <= 2; i += 1) {
          fireEnemyOrb(world, e.x, e.y, base + i * 0.16, 300, 12);
        }
        world.audio.boss();
      } else {
        e.state = 'aim';
        e.timer = 0.7;
        e.angle = angleTo(e.x, e.y, world.player.x, world.player.y);
      }
    }
    if (e.summonTimer <= 0) {
      e.summonTimer = 7;
      for (let i = 0; i < 3; i += 1) {
        const p = edgeSpawnPoint(world);
        spawnEnemy(world, 'chaser', p.x, p.y);
      }
      world.effects.burst(e.x, e.y, '#c26bff', 20, 260, 0.6);
    }
  } else if (e.state === 'aim') {
    e.timer -= dt;
    e.vx *= 0.85;
    e.vy *= 0.85;
    e.angle = angleTo(e.x, e.y, world.player.x, world.player.y);
    if (e.timer <= 0) {
      e.state = 'charge';
      e.timer = 0.7;
      e.vx = Math.cos(e.angle) * 460;
      e.vy = Math.sin(e.angle) * 460;
    }
  } else if (e.state === 'charge') {
    e.timer -= dt;
    if (e.timer <= 0) {
      e.state = 'hunt';
      e.attack = 0;
    }
  }
  if (dist < 120 && world.player.invuln <= 0) {
    // The boss's bulk hurts on contact, handled by the world's contact pass too;
    // this keeps the pressure on even between passes.
  }
}
