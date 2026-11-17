// The renderer: paints the neon arena — grid, cover, pickups, enemies, the
// player, bullets, particles and floating text — in the 1280x720 field space,
// scaled to the window with letterboxing. The HUD and the screens live in
// hud.js; this file only draws the world itself.

import { FIELD, PALETTE, FONT } from './config.js';

/** The starfield: fixed stars from a fixed seed, so every run paints the same sky. */
const STARS = (() => {
  let state = 1337;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  const stars = [];
  for (let i = 0; i < 130; i += 1) {
    stars.push({ x: next() * FIELD.width, y: next() * FIELD.height, r: 0.6 + next() * 1.6, phase: next() * Math.PI * 2, speed: 0.6 + next() * 1.8 });
  }
  return stars;
})();

/** Nebula clouds: fixed positions, drifting slowly with the run's clock. */
const NEBULAE = [
  { x: 260, y: 170, r: 300, color: '123, 92, 255' },
  { x: 1050, y: 540, r: 340, color: '255, 77, 141' },
  { x: 980, y: 120, r: 260, color: '53, 242, 255' },
  { x: 220, y: 590, r: 240, color: '255, 159, 46' },
];

/** Create the renderer for `canvas`; call `draw()` once a frame. */
export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    offsetX = (canvas.width - FIELD.width * scale) / 2;
    offsetY = (canvas.height - FIELD.height * scale) / 2;
  }

  window.addEventListener('resize', resize);
  resize();

  function drawBackground(world) {
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    // Nebula clouds, drifting a few pixels with the run's clock.
    for (let i = 0; i < NEBULAE.length; i += 1) {
      const n = NEBULAE[i];
      const dx = Math.sin(world.time * 0.07 + i * 2.1) * 14;
      const dy = Math.cos(world.time * 0.05 + i * 1.3) * 10;
      const neb = ctx.createRadialGradient(n.x + dx, n.y + dy, 10, n.x + dx, n.y + dy, n.r);
      neb.addColorStop(0, `rgba(${n.color}, 0.10)`);
      neb.addColorStop(1, `rgba(${n.color}, 0)`);
      ctx.fillStyle = neb;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
    // Starfield: fixed stars that twinkle on their own phase.
    for (let i = 0; i < STARS.length; i += 1) {
      const s = STARS[i];
      const twinkle = 0.45 + 0.55 * Math.abs(Math.sin(world.time * s.speed + s.phase));
      ctx.globalAlpha = twinkle;
      ctx.fillStyle = '#dfe9ff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Neon grid: faint lines every 64px, brighter every 256px.
    ctx.lineWidth = 1;
    for (let x = 0; x <= FIELD.width; x += 64) {
      ctx.strokeStyle = x % 256 === 0 ? PALETTE.gridBright : PALETTE.grid;
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, FIELD.height);
      ctx.stroke();
    }
    for (let y = 0; y <= FIELD.height; y += 64) {
      ctx.strokeStyle = y % 256 === 0 ? PALETTE.gridBright : PALETTE.grid;
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(FIELD.width, y + 0.5);
      ctx.stroke();
    }
    // A soft pulse at the arena's heart.
    const pulse = 0.5 + 0.5 * Math.sin(world.time * 1.4);
    const glow = ctx.createRadialGradient(640, 360, 40, 640, 360, 420);
    glow.addColorStop(0, `rgba(53, 242, 255, ${0.05 + pulse * 0.03})`);
    glow.addColorStop(1, 'rgba(53, 242, 255, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    // Cover blocks.
    for (let i = 0; i < world.obstacles.length; i += 1) {
      const o = world.obstacles[i];
      ctx.fillStyle = PALETTE.obstacle;
      ctx.strokeStyle = PALETTE.obstacleEdge;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(o.x, o.y, o.w, o.h, 6);
      ctx.fill();
      ctx.stroke();
    }
  }

  function drawPickups(world) {
    for (let i = 0; i < world.pickups.length; i += 1) {
      const p = world.pickups[i];
      if (!p.active) continue;
      const blink = p.life < 3 ? (Math.floor(p.life * 6) % 2 === 0 ? 0.35 : 1) : 1;
      ctx.globalAlpha = blink;
      if (p.kind === 'credit') {
        ctx.fillStyle = PALETTE.credit;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#7a5b00';
        ctx.font = `bold ${p.radius}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('c', p.x, p.y + 1);
      } else {
        ctx.fillStyle = PALETTE.health;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#063d1a';
        ctx.fillRect(p.x - 2, p.y - 6, 4, 12);
        ctx.fillRect(p.x - 6, p.y - 2, 12, 4);
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawEnemy(world, e) {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.angle);
    const flash = e.hitFlash > 0;
    ctx.fillStyle = flash ? '#ffffff' : e.color;
    ctx.strokeStyle = flash ? '#ffffff' : e.color;
    ctx.lineWidth = 2;
    if (e.kind === 'chaser' || e.kind === 'mite') {
      ctx.beginPath();
      ctx.moveTo(e.radius, 0);
      ctx.lineTo(-e.radius * 0.8, e.radius * 0.7);
      ctx.lineTo(-e.radius * 0.4, 0);
      ctx.lineTo(-e.radius * 0.8, -e.radius * 0.7);
      ctx.closePath();
      ctx.fill();
    } else if (e.kind === 'shooter') {
      ctx.beginPath();
      ctx.moveTo(e.radius, 0);
      ctx.lineTo(0, e.radius * 0.85);
      ctx.lineTo(-e.radius, 0);
      ctx.lineTo(0, -e.radius * 0.85);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#1a0b00';
      ctx.beginPath();
      ctx.arc(0, 0, e.radius * 0.35, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === 'splitter') {
      ctx.beginPath();
      ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0c2b16';
      ctx.beginPath();
      ctx.arc(0, 0, e.radius * 0.55, 0, Math.PI * 2);
      ctx.stroke();
    } else if (e.kind === 'charger') {
      if (e.state === 'aim') {
        ctx.strokeStyle = '#ff5a6e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(240, 0);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(e.radius * 1.2, 0);
      ctx.lineTo(-e.radius * 0.8, e.radius * 0.8);
      ctx.lineTo(-e.radius * 0.8, -e.radius * 0.8);
      ctx.closePath();
      ctx.fill();
    } else if (e.kind === 'sniper') {
      // The telegraph: a dashed red line down the barrel while it aims.
      if (e.state === 'aim') {
        ctx.strokeStyle = `rgba(255, 90, 110, ${0.45 + 0.35 * Math.sin(e.timer * 18)})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 8]);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(460, 0);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.beginPath();
      ctx.moveTo(e.radius * 1.5, 0);
      ctx.lineTo(0, e.radius * 0.6);
      ctx.lineTo(-e.radius, 0);
      ctx.lineTo(0, -e.radius * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#1d0533';
      ctx.beginPath();
      ctx.arc(0, 0, e.radius * 0.32, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === 'kamikaze') {
      // A spiked mine that pulses faster as it closes in.
      const pulse = 1 + 0.18 * Math.sin(world.time * 9);
      ctx.beginPath();
      for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * Math.PI * 2;
        const r = i % 2 === 0 ? e.radius * pulse : e.radius * 0.55;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, e.radius * 0.25, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === 'orbiter') {
      ctx.beginPath();
      ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#06283d';
      ctx.beginPath();
      ctx.arc(e.radius * 0.35, 0, e.radius * 0.72, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === 'brute') {
      ctx.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2;
        const px = Math.cos(a) * e.radius;
        const py = Math.sin(a) * e.radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#4d0d08';
      ctx.beginPath();
      ctx.arc(0, 0, e.radius * 0.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === 'ringboss') {
      // A halo of rotating arcs around a dark core.
      ctx.rotate(-e.angle);
      const pulse = 1 + 0.05 * Math.sin(world.time * 5);
      ctx.strokeStyle = flash ? '#ffffff' : e.color;
      ctx.lineWidth = 7;
      for (let i = 0; i < 3; i += 1) {
        const a0 = e.spiral + (i * Math.PI * 2) / 3;
        ctx.beginPath();
        ctx.arc(0, 0, e.radius * pulse, a0, a0 + Math.PI * 0.85);
        ctx.stroke();
      }
      ctx.fillStyle = flash ? '#ffffff' : e.color;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2b0218';
      ctx.beginPath();
      ctx.arc(0, 0, e.radius * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.rotate(e.angle);
    } else if (e.kind === 'boss') {
      ctx.rotate(-e.angle);
      const pulse = 1 + 0.06 * Math.sin(e.timer * 6);
      ctx.beginPath();
      ctx.arc(0, 0, e.radius * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#e9ccff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius * 0.72, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#1d0533';
      ctx.beginPath();
      ctx.arc(0, 0, e.radius * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff5a6e';
      ctx.beginPath();
      ctx.arc(0, 0, e.radius * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // The Halo Warden's tell: a dashed ring on the floor grows while it winds up.
    if (e.kind === 'ringboss' && e.state === 'windup') {
      const progress = 1 - Math.max(0, e.timer) / 0.9;
      ctx.strokeStyle = `rgba(255, 90, 217, ${0.5 + 0.4 * Math.sin(world.time * 14)})`;
      ctx.lineWidth = 3;
      ctx.setLineDash([14, 10]);
      ctx.beginPath();
      ctx.arc(e.x, e.y, 60 + progress * 260, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // Health bar over anything that is hurt.
    if (e.hp < e.maxHp && e.kind !== 'mite') {
      const w = e.radius * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(e.x - w / 2, e.y - e.radius - 12, w, 5);
      ctx.fillStyle = e.kind === 'boss' ? '#c26bff' : e.kind === 'ringboss' ? '#ff5ad9' : '#5cff8a';
      ctx.fillRect(e.x - w / 2, e.y - e.radius - 12, w * Math.max(0, e.hp / e.maxHp), 5);
    }
  }

  function drawPlayer(world) {
    const p = world.player;
    if (p.hp <= 0) return;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.shadowColor = PALETTE.player;
    ctx.shadowBlur = p.invuln > 0 && Math.floor(p.invuln * 12) % 2 === 0 ? 0 : 18;
    ctx.fillStyle = PALETTE.player;
    ctx.beginPath();
    ctx.moveTo(p.radius + 6, 0);
    ctx.lineTo(-p.radius * 0.75, p.radius * 0.8);
    ctx.lineTo(-p.radius * 0.35, 0);
    ctx.lineTo(-p.radius * 0.75, -p.radius * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.playerCore;
    ctx.beginPath();
    ctx.arc(2, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Dash cooldown ring under the player.
    if (p.dashCooldown > 0) {
      ctx.strokeStyle = 'rgba(139, 150, 184, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius + 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - p.dashCooldown / 2.5));
      ctx.stroke();
    }
  }

  function drawBullets(world) {
    for (let i = 0; i < world.bullets.length; i += 1) {
      const b = world.bullets[i];
      if (!b.active) continue;
      if (b.from === 'player') {
        if (b.kind === 'missiles') {
          // A seeking missile: a small dart with a fire trail.
          const a = Math.atan2(b.vy, b.vx);
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.rotate(a);
          ctx.fillStyle = '#ffd94d';
          ctx.beginPath();
          ctx.moveTo(10, 0);
          ctx.lineTo(-7, 5);
          ctx.lineTo(-4, 0);
          ctx.lineTo(-7, -5);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
          ctx.strokeStyle = 'rgba(255, 217, 77, 0.5)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(b.x - b.vx * 0.03, b.y - b.vy * 0.03);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        } else if (b.kind === 'railgun') {
          // A railgun bolt: a thick white-hot line.
          ctx.strokeStyle = '#eafcff';
          ctx.shadowColor = '#35f2ff';
          ctx.shadowBlur = 12;
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
          ctx.shadowBlur = 0;
        } else {
          ctx.strokeStyle = PALETTE.bullet;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(b.x - b.vx * 0.016, b.y - b.vy * 0.016);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(b.x, b.y, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        ctx.fillStyle = PALETTE.enemyBullet;
        ctx.shadowColor = PALETTE.enemyBullet;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
  }

  function drawParticles(world) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < world.effects.particles.length; i += 1) {
      const p = world.effects.particles[i];
      if (!p.active) continue;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawFloaters(world) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < world.effects.floaters.length; i += 1) {
      const f = world.effects.floaters[i];
      if (!f.active) continue;
      ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
      ctx.font = `bold ${f.size}px ${FONT}`;
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  return {
    /** Current view: main.js copies it into world.view for mouse mapping. */
    view() {
      return { scale, offsetX, offsetY };
    },
    resize,
    /** Paint the world (no HUD, no screens) in field space. */
    draw(world) {
      const shake = world.effects.shakeOffset();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(scale, 0, 0, scale, offsetX + shake.x * scale, offsetY + shake.y * scale);
      drawBackground(world);
      drawPickups(world);
      for (let i = 0; i < world.enemies.length; i += 1) {
        const e = world.enemies[i];
        if (e.active) drawEnemy(world, e);
      }
      drawPlayer(world);
      drawBullets(world);
      drawParticles(world);
      drawFloaters(world);
      if (world.effects.flash > 0) {
        ctx.fillStyle = `rgba(255, 90, 110, ${world.effects.flash * 0.25})`;
        ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      }
      // Low hull: a red vignette that throbs with the heartbeat.
      const p = world.player;
      if (p.hp > 0 && p.hp < p.maxHp * 0.3) {
        const pulse = 0.16 + 0.1 * Math.sin(world.time * 7);
        const vig = ctx.createRadialGradient(640, 360, 220, 640, 360, 560);
        vig.addColorStop(0, 'rgba(255, 42, 63, 0)');
        vig.addColorStop(1, `rgba(255, 42, 63, ${pulse})`);
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      }
    },
    /** Begin a field-space overlay pass (HUD and screens draw in field coords). */
    beginOverlay() {
      ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
    },
    context() {
      return ctx;
    },
  };
}
