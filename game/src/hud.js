// The HUD and the screens: health, wave, score, credits, heat and dash, the
// wave banner, the boss bar, the three-card upgrade draft, and the title,
// pause and game-over screens. Everything here draws in field coordinates
// after the renderer has set the transform.

import { FIELD, PALETTE, FONT, BOSS_EVERY } from './config.js';
import { upgradeLevel, UPGRADE_MAX_LEVEL } from './upgrades.js';
import { enemiesAlive } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_UPGRADE = 'upgrade';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function bar(ctx, x, y, w, h, fraction, color, bg) {
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, fraction)), h);
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(13, 19, 48, 0.88)';
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();
}

/** The in-play HUD: HP, wave, score, credits, heat, dash and streak. */
export function drawHud(ctx, world, best) {
  const player = world.player;
  ctx.textBaseline = 'middle';
  // Top-left: HP and dash.
  ctx.textAlign = 'left';
  ctx.font = `bold 15px ${FONT}`;
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('HULL', 24, 30);
  bar(ctx, 24, 42, 220, 16, player.hp / player.maxHp, player.hp < 30 ? PALETTE.danger : '#5cff8a', '#1a2342');
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 14px ${FONT}`;
  ctx.fillText(`${Math.ceil(player.hp)} / ${player.maxHp}`, 252, 50);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `bold 13px ${FONT}`;
  ctx.fillText(player.dashCooldown <= 0 ? 'DASH READY  [SPACE]' : `DASH ${player.dashCooldown.toFixed(1)}s`, 24, 76);
  // Top-centre: wave and enemies left.
  ctx.textAlign = 'center';
  ctx.font = `bold 20px ${FONT}`;
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(world.wave % BOSS_EVERY === 0 && world.boss ? `WAVE ${world.wave} — THE VOIDWARDEN` : `WAVE ${world.wave}`, FIELD.width / 2, 30);
  ctx.font = `bold 13px ${FONT}`;
  ctx.fillStyle = PALETTE.muted;
  const left = world.queue.length + enemiesAlive(world);
  ctx.fillText(world.phase === 'intro' ? 'GET READY' : `${left} hostiles left`, FIELD.width / 2, 54);
  // Boss bar.
  if (world.boss && world.boss.active) {
    bar(ctx, FIELD.width / 2 - 260, 68, 520, 10, world.boss.hp / world.boss.maxHp, '#c26bff', '#1a2342');
  }
  // Top-right: score, best and credits.
  ctx.textAlign = 'right';
  ctx.font = `bold 20px ${FONT}`;
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(`SCORE ${world.score}`, FIELD.width - 24, 30);
  ctx.font = `bold 14px ${FONT}`;
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText(`BEST ${Math.max(best, world.score)}`, FIELD.width - 24, 54);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = `bold 16px ${FONT}`;
  ctx.fillText(`⬢ ${world.credits} cr`, FIELD.width - 24, 78);
  // Bottom-centre: weapon heat.
  const heatX = FIELD.width / 2 - 130;
  ctx.textAlign = 'left';
  ctx.fillStyle = player.overheated ? PALETTE.danger : PALETTE.muted;
  ctx.font = `bold 12px ${FONT}`;
  ctx.fillText(player.overheated ? 'OVERHEATED — COOLING' : 'HEAT', heatX, FIELD.height - 34);
  bar(ctx, heatX, FIELD.height - 26, 260, 8, player.heat / 100, player.overheated ? PALETTE.danger : '#35f2ff', '#1a2342');
  // Kill streak.
  if (world.streak >= 5) {
    ctx.textAlign = 'center';
    ctx.font = `bold 24px ${FONT}`;
    ctx.fillStyle = '#ff9f2e';
    ctx.fillText(`STREAK x${world.streak}`, FIELD.width / 2, 108);
  }
}

/** The wave banner shown while a wave is introducing itself. */
export function drawWaveBanner(ctx, world) {
  if (world.phase !== 'intro') return;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold 52px ${FONT}`;
  ctx.fillStyle = 'rgba(238, 243, 255, 0.95)';
  ctx.fillText(world.wave % BOSS_EVERY === 0 ? `WAVE ${world.wave}` : `WAVE ${world.wave}`, FIELD.width / 2, FIELD.height / 2 - 60);
  ctx.font = `bold 22px ${FONT}`;
  ctx.fillStyle = world.wave % BOSS_EVERY === 0 ? '#c26bff' : PALETTE.muted;
  ctx.fillText(world.wave % BOSS_EVERY === 0 ? 'THE VOIDWARDEN APPROACHES' : 'CLEAR THE ARENA', FIELD.width / 2, FIELD.height / 2 - 14);
}

/** The title screen: name, goal, controls, best score, and how to start. */
export function drawTitle(ctx, world, best) {
  ctx.fillStyle = 'rgba(7, 10, 24, 0.55)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold 84px ${FONT}`;
  ctx.fillStyle = '#35f2ff';
  ctx.shadowColor = '#35f2ff';
  ctx.shadowBlur = 28;
  ctx.fillText('VOIDPULSE', FIELD.width / 2, 190);
  ctx.shadowBlur = 0;
  ctx.font = `bold 26px ${FONT}`;
  ctx.fillStyle = '#ff4d8d';
  ctx.fillText('— NEON ARENA —', FIELD.width / 2, 248);
  ctx.font = `20px ${FONT}`;
  ctx.fillStyle = PALETTE.text;
  ctx.fillText('Survive the waves. Break the Warden every 5 waves.', FIELD.width / 2, 300);
  ctx.fillText('Pick an upgrade after each wave. How long can you last?', FIELD.width / 2, 330);
  ctx.font = `bold 17px ${FONT}`;
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('WASD move   ·   Mouse aim   ·   Hold click fire   ·   SPACE dash   ·   P pause', FIELD.width / 2, 400);
  ctx.fillText('Dash through danger — its i-frames save you. Watch the heat bar.', FIELD.width / 2, 428);
  ctx.font = `bold 24px ${FONT}`;
  ctx.fillStyle = best > 0 ? PALETTE.gold : PALETTE.text;
  ctx.fillText(best > 0 ? `BEST SCORE ${best}` : 'NO RUNS YET — BE THE FIRST', FIELD.width / 2, 486);
  const blink = Math.floor(world.steps / 30) % 2 === 0;
  if (blink) {
    ctx.font = `bold 26px ${FONT}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('CLICK OR PRESS ENTER TO START', FIELD.width / 2, 556);
  }
}

/** The three-card upgrade draft between waves. */
export function upgradeCardRect(index) {
  const cardW = 300;
  const cardH = 220;
  const gap = 36;
  const total = cardW * 3 + gap * 2;
  const startX = (FIELD.width - total) / 2;
  return { x: startX + index * (cardW + gap), y: 250, w: cardW, h: cardH };
}

export function drawUpgrade(ctx, world) {
  ctx.fillStyle = 'rgba(7, 10, 24, 0.72)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold 40px ${FONT}`;
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(`WAVE ${world.wave} CLEARED`, FIELD.width / 2, 110);
  ctx.font = `20px ${FONT}`;
  ctx.fillStyle = PALETTE.gold;
  ctx.fillText(`+${10 + world.wave * 2} credits  ·  score ${world.score}`, FIELD.width / 2, 150);
  ctx.font = `bold 22px ${FONT}`;
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('CHOOSE ONE UPGRADE  —  click a card or press 1 / 2 / 3', FIELD.width / 2, 200);
  const cardW = 300;
  const cardH = 220;
  const gap = 36;
  const total = cardW * 3 + gap * 2;
  const startX = (FIELD.width - total) / 2;
  for (let i = 0; i < world.upgradeChoices.length; i += 1) {
    const u = world.upgradeChoices[i];
    const rect = upgradeCardRect(i);
    const x = rect.x;
    const y = rect.y;
    panel(ctx, x, y, cardW, cardH);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `bold 15px ${FONT}`;
    ctx.fillText(`[${i + 1}]`, x + cardW / 2, y + 28);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 22px ${FONT}`;
    ctx.fillText(u.name, x + cardW / 2, y + 62, cardW - 24);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `17px ${FONT}`;
    ctx.fillText(u.desc, x + cardW / 2, y + 100, cardW - 24);
    const level = upgradeLevel(world.player, u.id);
    ctx.fillStyle = '#35f2ff';
    ctx.font = `bold 15px ${FONT}`;
    let pips = '';
    for (let p = 0; p < UPGRADE_MAX_LEVEL; p += 1) pips += p < level ? '●' : '○';
    ctx.fillText(`LEVEL ${level}  ${pips}`, x + cardW / 2, y + 150);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `14px ${FONT}`;
    ctx.fillText(level + 1 >= UPGRADE_MAX_LEVEL ? 'MAX NEXT' : `NEXT: LV ${level + 1}`, x + cardW / 2, y + 182);
  }
  // The player's current build, for the record.
  const owned = Object.entries(world.player.upgrades).filter(([, v]) => v > 0);
  ctx.font = `15px ${FONT}`;
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText(owned.length === 0 ? 'No upgrades yet.' : `Your build: ${owned.map(([k, v]) => `${k} ${v}`).join('  ·  ')}`, FIELD.width / 2, 520);
}

/** The pause screen. */
export function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(7, 10, 24, 0.66)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold 56px ${FONT}`;
  ctx.fillStyle = PALETTE.text;
  ctx.fillText('PAUSED', FIELD.width / 2, FIELD.height / 2 - 30);
  ctx.font = `20px ${FONT}`;
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('Press P or Escape to resume', FIELD.width / 2, FIELD.height / 2 + 24);
}

/** The game-over screen: stats, best score, and the restart prompt. */
export function drawOver(ctx, world, best) {
  ctx.fillStyle = 'rgba(7, 10, 24, 0.72)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold 64px ${FONT}`;
  ctx.fillStyle = '#ff5a6e';
  ctx.shadowColor = '#ff5a6e';
  ctx.shadowBlur = 24;
  ctx.fillText('SIGNAL LOST', FIELD.width / 2, 160);
  ctx.shadowBlur = 0;
  ctx.font = `bold 30px ${FONT}`;
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(`SCORE ${world.score}`, FIELD.width / 2, 240);
  ctx.font = `20px ${FONT}`;
  ctx.fillStyle = best > 0 && world.score >= best ? PALETTE.gold : PALETTE.muted;
  ctx.fillText(best > 0 && world.score >= best ? '★ NEW BEST SCORE ★' : `BEST ${best}`, FIELD.width / 2, 282);
  const accuracy = world.shotsFired > 0 ? Math.round((world.shotsHit / world.shotsFired) * 100) : 0;
  ctx.fillStyle = PALETTE.text;
  ctx.font = `19px ${FONT}`;
  const stats = [
    `Waves cleared: ${Math.max(0, world.wave - 1)}`,
    `Kills: ${world.kills}`,
    `Best streak: x${world.bestStreak}`,
    `Damage dealt: ${Math.round(world.damageDealt)}`,
    `Accuracy: ${accuracy}%`,
  ];
  for (let i = 0; i < stats.length; i += 1) {
    ctx.fillText(stats[i], FIELD.width / 2, 330 + i * 30);
  }
  const blink = Math.floor(world.steps / 30) % 2 === 0;
  if (blink) {
    ctx.font = `bold 24px ${FONT}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('CLICK OR PRESS ENTER TO PLAY AGAIN', FIELD.width / 2, 540);
  }
}
