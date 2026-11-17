// Juice: particles, floating damage numbers, screenshake and hit flash. All of
// it is spawned by the world and drawn by the renderer; nothing here owns game
// rules, only the look of an event that already happened.

import { POOL_SIZE } from './config.js';

/** Create the effects state (one fixed pool, allocated once). `random` is the
 * world's seeded generator, so every spark lands the same way for a seed. */
export function createEffects(random) {
  const particles = [];
  const floaters = [];
  for (let i = 0; i < POOL_SIZE; i += 1) {
    particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#fff', drag: 0.9 });
    floaters.push({ active: false, x: 0, y: 0, life: 0, maxLife: 1, text: '', color: '#fff', size: 14 });
  }
  return {
    particles,
    floaters,
    shake: 0,
    flash: 0,
    /** Step counter: the shake offset is a pure function of it, never random. */
    tick: 0,
    /** Trauma 0..1: the camera shakes by this much while it decays. */
    addShake(amount) {
      this.shake = Math.min(1, this.shake + amount);
    },
    /** A full-screen flash, 0..1, that fades out. */
    addFlash(amount) {
      this.flash = Math.min(1, this.flash + amount);
    },
    /** A burst of sparks flying out of (x, y). */
    burst(x, y, color, count, speed, life) {
      let made = 0;
      for (let i = 0; i < particles.length && made < count; i += 1) {
        const p = particles[i];
        if (p.active) continue;
        const angle = random() * Math.PI * 2;
        const v = speed * (0.3 + random() * 0.7);
        p.active = true;
        p.x = x;
        p.y = y;
        p.vx = Math.cos(angle) * v;
        p.vy = Math.sin(angle) * v;
        p.life = p.maxLife = life * (0.6 + random() * 0.4);
        p.size = 2 + random() * 3;
        p.color = color;
        p.drag = 0.88;
        made += 1;
      }
    },
    /** A ring that reads as an explosion: many sparks plus a few slow embers. */
    explosion(x, y, color, scale) {
      this.burst(x, y, color, Math.round(26 * scale), 320 * scale, 0.6);
      this.burst(x, y, '#ffffff', Math.round(8 * scale), 140 * scale, 0.4);
    },
    /** A short dash trail behind the player. */
    trail(x, y, color) {
      this.burst(x, y, color, 3, 40, 0.3);
    },
    /** Floating combat text that rises and fades. */
    floater(x, y, text, color, size) {
      for (let i = 0; i < floaters.length; i += 1) {
        const f = floaters[i];
        if (f.active) continue;
        f.active = true;
        f.x = x + (random() * 14 - 7);
        f.y = y;
        f.life = f.maxLife = 0.9;
        f.text = text;
        f.color = color;
        f.size = size || 14;
        return;
      }
    },
    /** Advance every particle and floater one fixed step. */
    step(dt) {
      this.tick += 1;
      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        if (!p.active) continue;
        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= p.drag;
        p.vy *= p.drag;
      }
      for (let i = 0; i < floaters.length; i += 1) {
        const f = floaters[i];
        if (!f.active) continue;
        f.life -= dt;
        if (f.life <= 0) {
          f.active = false;
          continue;
        }
        f.y -= 42 * dt;
      }
      this.shake = Math.max(0, this.shake - dt * 2.2);
      this.flash = Math.max(0, this.flash - dt * 3);
    },
    /** Current shake offset in pixels, a pure function of the step counter. */
    shakeOffset() {
      const amount = this.shake * this.shake * 14;
      return { x: Math.sin(this.tick * 1.7) * amount, y: Math.cos(this.tick * 2.3) * amount };
    },
  };
}
