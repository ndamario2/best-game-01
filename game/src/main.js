// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between five screens: title,
// play, upgrade draft, paused and game over. The title runs an autopilot game
// behind it, so it is alive before the player starts.
//
// ?seed=N fixes the waves. ?shot=start|play|boss|end (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.

import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './rng.js';
import { createWorld, resetWorld, startWave, chooseUpgrade, stepWorld, toField, EVENT_OVER, EVENT_WAVE_CLEAR } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_DASH, ACTION_CARD_1, ACTION_CARD_2, ACTION_CARD_3, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer } from './render.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_UPGRADE, SCREEN_PAUSED, SCREEN_OVER, drawHud, drawWaveBanner, drawTitle, drawUpgrade, drawPaused, drawOver, upgradeCardRect } from './hud.js';
import { stageShot, createAutopilot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const audio = createAudio();
const world = createWorld(seed, audio);
const renderer = createRenderer(canvas);

/** Debug hook for playtests: the live screen, score, HP, wave and kills. */
window.__voidpulse = { screen: SCREEN_TITLE, score: 0, hp: 100, wave: 0, kills: 0, credits: 0, phase: 'intro', enemies: 0, px: 640, py: 360, heat: 0, dash: 0, damage: 0, shotsFired: 0, shotsHit: 0, upgrades: {}, choices: [], nearest: null };

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  world.view = renderer.view();
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world);
    renderer.beginOverlay();
    const ctx = renderer.context();
    if (scene.screen === SCREEN_TITLE) drawTitle(ctx, world, scene.best);
    else if (scene.screen === SCREEN_OVER) drawOver(ctx, world, scene.best);
    else {
      drawHud(ctx, world, scene.best);
      drawWaveBanner(ctx, world);
    }
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  const attract = createAutopilot(world, 1);
  startWave(world, 1);

  // Screen readers (and anyone watching the page's text) hear the screen changes and each hit.
  function announce(message) {
    status.textContent = message;
  }

  function refreshDebug() {
    window.__voidpulse.screen = screen;
    window.__voidpulse.score = world.score;
    window.__voidpulse.hp = Math.ceil(world.player.hp);
    window.__voidpulse.wave = world.wave;
    window.__voidpulse.kills = world.kills;
    window.__voidpulse.credits = world.credits;
    window.__voidpulse.phase = world.phase;
    window.__voidpulse.enemies = world.enemies.filter((e) => e.active).length;
    window.__voidpulse.px = Math.round(world.player.x);
    window.__voidpulse.py = Math.round(world.player.y);
    window.__voidpulse.heat = Math.round(world.player.heat);
    window.__voidpulse.dash = Math.round(world.player.dashCooldown * 10) / 10;
    window.__voidpulse.damage = Math.round(world.damageDealt);
    window.__voidpulse.shotsFired = world.shotsFired;
    window.__voidpulse.shotsHit = world.shotsHit;
    window.__voidpulse.upgrades = { ...world.player.upgrades };
    window.__voidpulse.choices = world.upgradeChoices.map((u) => u.id);
    let nearest = null;
    let nearestDist = Infinity;
    for (let i = 0; i < world.enemies.length; i += 1) {
      const e = world.enemies[i];
      if (!e.active) continue;
      const d = Math.hypot(e.x - world.player.x, e.y - world.player.y);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = { x: Math.round(e.x), y: Math.round(e.y), vx: Math.round(e.vx), vy: Math.round(e.vy), kind: e.kind, hp: Math.round(e.hp), dist: Math.round(d) };
      }
    }
    window.__voidpulse.nearest = nearest;
  }

  function startGame() {
    audio.unlock();
    resetWorld(world);
    startWave(world, 1);
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.startMusic();
    announce('Playing. Survive the waves.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    audio.stopMusic();
    audio.over();
    if (world.score > best) {
      best = world.score;
      saveBest(best);
    }
    announce(`Game over. Score ${world.score}. Best ${best}.`);
  }

  function pickCard(index) {
    if (screen !== SCREEN_UPGRADE) return;
    if (chooseUpgrade(world, index)) {
      audio.click();
      audio.startMusic();
      screen = SCREEN_PLAY;
      announce(`Wave ${world.wave}.`);
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_DASH) input.dashQueued = true;
    if (actions & ACTION_CONFIRM) audio.unlock();
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
      if (actions & ACTION_CONFIRM) startGame();
    } else if (screen === SCREEN_PLAY) {
      if (actions & ACTION_PAUSE) {
        screen = SCREEN_PAUSED;
        audio.stopMusic();
        announce('Paused.');
      }
    } else if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        audio.startMusic();
        announce('Playing.');
      }
    } else if (screen === SCREEN_UPGRADE) {
      if (actions & ACTION_CARD_1) pickCard(0);
      else if (actions & ACTION_CARD_2) pickCard(1);
      else if (actions & ACTION_CARD_3) pickCard(2);
      else if (actions & ACTION_CONFIRM) {
        // A click on a card picks it; a click elsewhere does nothing.
        const mouse = toField(world, input.mouse().x, input.mouse().y);
        for (let i = 0; i < 3; i += 1) {
          const r = upgradeCardRect(i);
          if (mouse.x >= r.x && mouse.x <= r.x + r.w && mouse.y >= r.y && mouse.y <= r.y + r.h) {
            pickCard(i);
            break;
          }
        }
      }
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      const events = stepWorld(world, attract, STEP);
      if (events & EVENT_OVER) {
        resetWorld(world);
        startWave(world, 1);
      }
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const events = stepWorld(world, input, STEP);
    if (events & EVENT_OVER) endGame();
    else if (events & EVENT_WAVE_CLEAR) {
      screen = SCREEN_UPGRADE;
      audio.stopMusic();
      announce(`Wave ${world.wave} cleared. Choose an upgrade.`);
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    world.view = renderer.view();
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world);
    renderer.beginOverlay();
    const ctx = renderer.context();
    if (screen === SCREEN_TITLE) drawTitle(ctx, world, best);
    else if (screen === SCREEN_UPGRADE) drawUpgrade(ctx, world);
    else if (screen === SCREEN_PAUSED) drawPaused(ctx);
    else if (screen === SCREEN_OVER) drawOver(ctx, world, best);
    else {
      drawHud(ctx, world, best);
      drawWaveBanner(ctx, world);
    }
    refreshDebug();
  }

  // Leaving the tab pauses a running game rather than letting enemies close in unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      audio.stopMusic();
      announce('Paused.');
    }
  });

  announce('Voidpulse Neon Arena. Press Enter or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
