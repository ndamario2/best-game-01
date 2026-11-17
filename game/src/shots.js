// The screenshot scenes behind ?shot=start|play|boss|end. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered
// by a simple autopilot (keep range, aim at the nearest enemy, dash out of
// trouble), so the frame is what a real game looks like and the same seed
// always gives the same frame.

import { STEP } from './config.js';
import { resetWorld, startWave, chooseUpgrade, stepWorld, EVENT_OVER, EVENT_WAVE_CLEAR } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './hud.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 24;
const BOSS_SECONDS = 10;
const END_LIMIT_SECONDS = 300;

/** An autopilot that plays like a careful human: `skill` 0 plays dead, 1 plays well. */
export function createAutopilot(world, skill) {
  const api = {
    dashQueued: false,
    move() {
      if (skill === 0) return { x: 0, y: 0 };
      const player = world.player;
      let mx = 0;
      let my = 0;
      let nearest = null;
      let nearestDist = Infinity;
      for (let i = 0; i < world.enemies.length; i += 1) {
        const e = world.enemies[i];
        if (!e.active) continue;
        const d = Math.hypot(e.x - player.x, e.y - player.y);
        if (d < nearestDist) {
          nearestDist = d;
          nearest = e;
        }
      }
      if (nearest) {
        const dx = player.x - nearest.x;
        const dy = player.y - nearest.y;
        const len = Math.hypot(dx, dy) || 1;
        if (nearestDist < 130) {
          mx = dx / len;
          my = dy / len;
        } else if (nearestDist > 320) {
          mx = -dx / len;
          my = -dy / len;
        } else {
          // Strafe: circle the enemy while firing.
          mx = (-dy / len) * 0.8;
          my = (dx / len) * 0.8;
        }
        // Dodge an incoming orb: step sideways from its path.
        for (let i = 0; i < world.bullets.length; i += 1) {
          const b = world.bullets[i];
          if (!b.active || b.from !== 'enemy') continue;
          const d = Math.hypot(b.x - player.x, b.y - player.y);
          if (d < 110) {
            const bx = b.vx;
            const by = b.vy;
            const bl = Math.hypot(bx, by) || 1;
            mx += (-by / bl) * 1.2;
            my += (bx / bl) * 1.2;
          }
        }
        if (nearestDist < 70) api.dashQueued = true;
      }
      const len = Math.hypot(mx, my);
      if (len > 1) {
        mx /= len;
        my /= len;
      }
      return { x: mx, y: my };
    },
    mouse() {
      const player = world.player;
      let nearest = null;
      let nearestDist = Infinity;
      for (let i = 0; i < world.enemies.length; i += 1) {
        const e = world.enemies[i];
        if (!e.active) continue;
        const d = Math.hypot(e.x - player.x, e.y - player.y);
        if (d < nearestDist) {
          nearestDist = d;
          nearest = e;
        }
      }
      if (!nearest) return { x: player.x + 100, y: player.y };
      // Aim in field coordinates; the shot window maps 1:1.
      return { x: nearest.x, y: nearest.y };
    },
    firing() {
      if (skill === 0) return false;
      const player = world.player;
      for (let i = 0; i < world.enemies.length; i += 1) {
        const e = world.enemies[i];
        if (!e.active) continue;
        if (Math.hypot(e.x - player.x, e.y - player.y) < 560) return true;
      }
      return false;
    },
  };
  return api;
}

/** Run the world forward for `seconds` with `input`, handling upgrade drafts. */
function simulate(world, input, seconds) {
  let events = 0;
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (world.phase === 'upgrade') {
      chooseUpgrade(world, 0);
      continue;
    }
    events = stepWorld(world, input, STEP);
    if (events & EVENT_OVER) break;
  }
  return events;
}

/**
 * Set `world` to the named scene (start, play, boss or end; any other name is
 * start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  resetWorld(world);
  if (name === 'boss') {
    startWave(world, 5);
    const pilot = createAutopilot(world, 1);
    simulate(world, pilot, BOSS_SECONDS);
    return { screen: SCREEN_PLAY, best: world.score };
  }
  if (name === 'end') {
    // Play well first, so the results screen shows a real run — then stop
    // fighting and let the arena take the player down.
    startWave(world, 1);
    const pilot = createAutopilot(world, 1);
    simulate(world, pilot, 20);
    const passive = createAutopilot(world, 0);
    simulate(world, passive, END_LIMIT_SECONDS);
    return { screen: SCREEN_OVER, best: world.score };
  }
  if (name === 'play') {
    startWave(world, 1);
    const pilot = createAutopilot(world, 1);
    simulate(world, pilot, PLAY_SECONDS);
    return { screen: SCREEN_PLAY, best: world.score };
  }
  startWave(world, 1);
  const pilot = createAutopilot(world, 1);
  simulate(world, pilot, START_SECONDS);
  return { screen: SCREEN_TITLE, best: 0 };
}
