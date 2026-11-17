// The world: one state object and one fixed step. It owns the player, the
// enemies, the bullets, the pickups, the obstacles, the waves, the score and
// the kill streak — and it fires the sounds and effects for everything that
// happens in it. The renderer only draws what is here.

import { FIELD, WAVE_INTRO, BOSS_EVERY, STREAK_WINDOW } from './config.js';
import { createRandom, distance } from './rng.js';
import { createEffects } from './effects.js';
import { createPlayer, damagePlayer, healPlayer, pickupRadius, stepPlayer } from './player.js';
import { spawnEnemy, buildWaveQueue, edgeSpawnPoint, stepEnemy } from './enemies.js';
import { rollUpgrades, applyUpgrade, upgradeLevel } from './upgrades.js';

export const EVENT_OVER = 1;
export const EVENT_WAVE_CLEAR = 2;
export const EVENT_HIT = 4;

/** The four cover blocks: neon slabs the player and enemies cannot cross. */
export const OBSTACLES = [
  { x: 300, y: 210, w: 120, h: 26 },
  { x: 860, y: 210, w: 120, h: 26 },
  { x: 300, y: 484, w: 120, h: 26 },
  { x: 860, y: 484, w: 120, h: 26 },
  { x: 604, y: 330, w: 72, h: 60 },
];

/** Create a fresh world for `seed`. */
export function createWorld(seed, audio) {
  const random = createRandom(seed);
  const world = {
    seed,
    random,
    audio,
    effects: createEffects(random),
    time: 0,
    steps: 0,
    wave: 0,
    phase: 'intro',
    phaseTimer: 0,
    score: 0,
    credits: 0,
    kills: 0,
    streak: 0,
    streakTimer: 0,
    bestStreak: 0,
    shotsFired: 0,
    shotsHit: 0,
    damageDealt: 0,
    waveKills: 0,
    queue: [],
    spawnTimer: 0,
    upgradeChoices: [],
    boss: null,
    player: createPlayer(),
    enemies: [],
    bullets: [],
    pickups: [],
    view: { scale: 1, offsetX: 0, offsetY: 0 },
  };
  for (let i = 0; i < 256; i += 1) {
    world.enemies.push({ active: false });
    world.pickups.push({ active: false });
  }
  for (let i = 0; i < 512; i += 1) {
    world.bullets.push({ active: false });
  }
  world.obstacles = OBSTACLES;
  return world;
}

/** Reset the world for a new run (same seed, fresh everything). */
export function resetWorld(world) {
  const fresh = createWorld(world.seed, world.audio);
  Object.assign(world, fresh);
}

/** Map canvas pixels to field coordinates using the renderer's current view. */
export function toField(world, px, py) {
  return {
    x: (px - world.view.offsetX) / world.view.scale,
    y: (py - world.view.offsetY) / world.view.scale,
  };
}

/** Push a circle out of every obstacle it overlaps (player and enemies). */
export function collideObstacles(world, body) {
  for (let i = 0; i < world.obstacles.length; i += 1) {
    const o = world.obstacles[i];
    const cx = Math.max(o.x, Math.min(body.x, o.x + o.w));
    const cy = Math.max(o.y, Math.min(body.y, o.y + o.h));
    const dx = body.x - cx;
    const dy = body.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < body.radius * body.radius) {
      if (d2 === 0) {
        body.y = o.y - body.radius;
        continue;
      }
      const d = Math.sqrt(d2);
      const push = body.radius - d;
      body.x += (dx / d) * push;
      body.y += (dy / d) * push;
    }
  }
}

/** Start wave `n`: banner, then the queue trickles in. */
export function startWave(world, n) {
  world.wave = n;
  world.phase = 'intro';
  world.phaseTimer = WAVE_INTRO;
  world.waveKills = 0;
  world.queue = buildWaveQueue(world, n);
  world.spawnTimer = 0;
  world.boss = null;
  if (n % BOSS_EVERY === 0) {
    // Boss waves stay fair: the boss plus a short escort queue.
    world.queue = world.queue.slice(0, 6);
    const p = edgeSpawnPoint(world);
    world.boss = spawnEnemy(world, 'boss', p.x, p.y);
    world.audio.boss();
  } else {
    world.audio.wave();
  }
}

/** Begin the upgrade draft after a cleared wave. */
export function openUpgradeDraft(world) {
  world.phase = 'upgrade';
  world.upgradeChoices = rollUpgrades(world.random, world.player.upgrades);
  const bonus = 10 + world.wave * 2;
  world.credits += bonus;
  if (upgradeLevel(world.player, 'nanoweave') > 0) {
    healPlayer(world.player, 40 * upgradeLevel(world.player, 'nanoweave'));
  }
  world.audio.upgrade();
}

/** The player took one of the three cards; the next wave starts. */
export function chooseUpgrade(world, index) {
  const choice = world.upgradeChoices[index];
  if (!choice) return false;
  applyUpgrade(world.player, choice);
  world.upgradeChoices = [];
  startWave(world, world.wave + 1);
  return true;
}

/** Count the living enemies. */
export function enemiesAlive(world) {
  let count = 0;
  for (let i = 0; i < world.enemies.length; i += 1) if (world.enemies[i].active) count += 1;
  return count;
}

/** Damage every enemy within `radius` of (x, y) — the shockwave dash. */
export function damageEnemiesNear(world, x, y, radius, damage) {
  for (let i = 0; i < world.enemies.length; i += 1) {
    const e = world.enemies[i];
    if (!e.active) continue;
    if (distance(x, y, e.x, e.y) <= radius + e.radius) hurtEnemy(world, e, damage, true);
  }
}

/** Called when the player fires: counts the shot for the accuracy stat. */
export function onPlayerShot(world) {
  world.shotsFired += 1;
  world.audio.shoot();
}

/** Hurt an enemy; kills it (and splits it, if it is a splitter) at 0 HP. */
export function hurtEnemy(world, e, damage, silent) {
  if (!e.active) return;
  e.hp -= damage;
  e.hitFlash = 1;
  world.damageDealt += damage;
  if (!silent) world.shotsHit += 1;
  world.effects.floater(e.x, e.y - e.radius - 6, String(Math.round(damage)), '#ffe14d', 14);
  if (e.hp <= 0) killEnemy(world, e);
}

/** Kill an enemy: score, streak, drops, particles, and the splitter's mites. */
export function killEnemy(world, e) {
  e.active = false;
  const player = world.player;
  player.kills += 1;
  world.kills += 1;
  world.waveKills += 1;
  const mult = 1 + (world.wave - 1) * 0.1;
  const streakBonus = world.streak >= 5 ? Math.min(50, world.streak * 2) : 0;
  const gained = Math.round(e.score * mult) + streakBonus;
  world.score += gained;
  world.streak += 1;
  world.streakTimer = STREAK_WINDOW;
  world.bestStreak = Math.max(world.bestStreak, world.streak);
  world.effects.explosion(e.x, e.y, e.color, e.kind === 'boss' ? 2.4 : e.kind === 'brute' ? 1.6 : 1);
  world.effects.floater(e.x, e.y - e.radius - 22, `+${gained}`, '#8ef6ff', 16);
  if (world.streak === 5 || world.streak === 10 || world.streak === 15) {
    world.effects.floater(player.x, player.y - 30, world.streak >= 15 ? 'UNSTOPPABLE!' : world.streak >= 10 ? 'RAMPAGE x10!' : 'RAMPAGE x5!', '#ff9f2e', 22);
  }
  world.audio.explode();
  dropPickup(world, e.x, e.y, 'credit', e.kind === 'boss' ? 10 : e.kind === 'brute' ? 3 : 1);
  if (e.kind === 'splitter') {
    for (let i = 0; i < 3; i += 1) {
      const angle = (i / 3) * Math.PI * 2 + world.random();
      spawnEnemy(world, 'mite', e.x + Math.cos(angle) * 24, e.y + Math.sin(angle) * 24);
    }
  }
  if (e.kind === 'boss') {
    world.boss = null;
    world.effects.addShake(1);
    world.effects.addFlash(0.5);
    dropPickup(world, e.x, e.y, 'health', 40);
    world.score += 500;
  }
  if (e.kind === 'brute' && world.random() < 0.4) {
    dropPickup(world, e.x, e.y, 'health', 15);
  }
}

function dropPickup(world, x, y, kind, value) {
  for (let i = 0; i < world.pickups.length; i += 1) {
    const p = world.pickups[i];
    if (p.active) continue;
    p.active = true;
    p.kind = kind;
    p.x = x + (world.random() * 30 - 15);
    p.y = y + (world.random() * 30 - 15);
    p.vx = world.random() * 60 - 30;
    p.vy = world.random() * 60 - 30;
    p.value = value;
    p.radius = kind === 'health' ? 11 : 8;
    p.life = 12;
    return;
  }
}

/** One fixed step of the whole world. Returns an event bitmask. */
export function stepWorld(world, input, dt) {
  world.time += dt;
  world.steps += 1;
  const player = world.player;
  let events = 0;

  if (world.streakTimer > 0) {
    world.streakTimer -= dt;
    if (world.streakTimer <= 0) world.streak = 0;
  }

  if (world.phase === 'intro') {
    world.phaseTimer -= dt;
    if (world.phaseTimer <= 0) world.phase = 'fight';
  } else if (world.phase === 'fight') {
    if (world.queue.length > 0) {
      world.spawnTimer -= dt;
      if (world.spawnTimer <= 0) {
        world.spawnTimer = 0.85;
        const kind = world.queue.shift();
        const p = edgeSpawnPoint(world);
        spawnEnemy(world, kind, p.x, p.y);
      }
    }
    if (world.queue.length === 0 && enemiesAlive(world) === 0) {
      openUpgradeDraft(world);
      events |= EVENT_WAVE_CLEAR;
    }
  }

  if (world.phase === 'fight' || world.phase === 'intro') {
    const dashed = stepPlayer(world, player, input, dt);
    if (dashed === 'dash') world.audio.dash();
    for (let i = 0; i < world.enemies.length; i += 1) {
      const e = world.enemies[i];
      if (e.active) stepEnemy(world, e, dt);
    }
    stepBullets(world, dt);
    stepPickups(world, dt);
    stepContacts(world);
    if (player.hp <= 0) events |= EVENT_OVER;
  }

  world.effects.step(dt);
  world.audio.step(dt);
  return events;
}

function stepBullets(world, dt) {
  const player = world.player;
  for (let i = 0; i < world.bullets.length; i += 1) {
    const b = world.bullets[i];
    if (!b.active) continue;
    b.life -= dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.life <= 0 || b.x < -20 || b.x > FIELD.width + 20 || b.y < -20 || b.y > FIELD.height + 20) {
      b.active = false;
      continue;
    }
    // Bullets die on cover.
    let blocked = false;
    for (let j = 0; j < world.obstacles.length; j += 1) {
      const o = world.obstacles[j];
      if (b.x > o.x && b.x < o.x + o.w && b.y > o.y && b.y < o.y + o.h) {
        blocked = true;
        break;
      }
    }
    if (blocked) {
      world.effects.burst(b.x, b.y, '#8b96b8', 4, 120, 0.25);
      b.active = false;
      continue;
    }
    if (b.from === 'player') {
      for (let j = 0; j < world.enemies.length; j += 1) {
        const e = world.enemies[j];
        if (!e.active || b.hitSet.has(e)) continue;
        if (distance(b.x, b.y, e.x, e.y) < b.radius + e.radius) {
          hurtEnemy(world, e, b.damage, false);
          world.audio.hit();
          b.hitSet.add(e);
          if (b.pierce > 0) {
            b.pierce -= 1;
          } else {
            b.active = false;
          }
          break;
        }
      }
    } else if (player.hp > 0 && player.invuln <= 0) {
      if (distance(b.x, b.y, player.x, player.y) < b.radius + player.radius * 0.8) {
        b.active = false;
        damagePlayer(world, player, b.damage);
        world.audio.hurt();
      }
    }
  }
}

function stepPickups(world, dt) {
  const player = world.player;
  const magnet = pickupRadius(player);
  for (let i = 0; i < world.pickups.length; i += 1) {
    const p = world.pickups[i];
    if (!p.active) continue;
    p.life -= dt;
    if (p.life <= 0) {
      p.active = false;
      continue;
    }
    const d = distance(p.x, p.y, player.x, player.y);
    if (d < magnet) {
      const a = Math.atan2(player.y - p.y, player.x - p.x);
      p.vx += Math.cos(a) * 900 * dt;
      p.vy += Math.sin(a) * 900 * dt;
    } else {
      p.vx *= 0.92;
      p.vy *= 0.92;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (d < player.radius + p.radius + 4) {
      p.active = false;
      if (p.kind === 'credit') {
        world.credits += p.value;
        world.score += p.value * 5;
        world.effects.floater(p.x, p.y - 10, `+${p.value} cr`, '#ffd94d', 13);
        world.audio.pickup();
      } else {
        const healed = healPlayer(player, p.value);
        if (healed > 0) {
          world.effects.floater(p.x, p.y - 10, `+${healed} HP`, '#5cff8a', 14);
          world.audio.heal();
        }
      }
    }
  }
}

/** Contact damage: enemies touching the player hurt them (once per touch). */
function stepContacts(world) {
  const player = world.player;
  if (player.hp <= 0 || player.invuln > 0) return;
  for (let i = 0; i < world.enemies.length; i += 1) {
    const e = world.enemies[i];
    if (!e.active) continue;
    if (distance(e.x, e.y, player.x, player.y) < e.radius + player.radius * 0.85) {
      if (damagePlayer(world, player, e.damage) > 0) {
        world.audio.hurt();
        // Knock the enemy back a little so one touch is not a blender.
        const a = Math.atan2(e.y - player.y, e.x - player.x);
        e.x += Math.cos(a) * 26;
        e.y += Math.sin(a) * 26;
      }
      break;
    }
  }
}
