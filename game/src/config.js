// Every tuning number and colour in one place. The playfield is a fixed 1280x720
// logical area; the renderer scales it to the window, so no rule below depends on
// the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** How many bullets, particles and floating texts can exist at once; pools are allocated once, at boot. */
export const POOL_SIZE = 512;

export const PLAYER = {
  radius: 15,
  speed: 300,
  accel: 2600,
  friction: 2200,
  maxHp: 100,
  /** Dash: burst speed, how long it lasts, the i-frames it grants, its cooldown. */
  dashSpeed: 920,
  dashTime: 0.18,
  dashInvuln: 0.3,
  dashCooldown: 2.5,
  /** Weapon heat: each shot adds this much; cooling per second; overheat locks fire until cooled below this. */
  heatPerShot: 8,
  heatCool: 34,
  heatUnlock: 30,
  fireInterval: 0.15,
  bulletSpeed: 720,
  bulletDamage: 12,
  bulletRadius: 5,
  pickupRadius: 70,
};

/** Seconds of the wave banner before enemies start trickling in. */
export const WAVE_INTRO = 2.2;

export const ENEMY = {
  chaser: { radius: 16, hp: 22, speed: 165, damage: 10, score: 50, cost: 1, color: '#ff4d8d' },
  shooter: { radius: 17, hp: 30, speed: 105, damage: 8, score: 80, cost: 2, color: '#ff9f2e' },
  splitter: { radius: 20, hp: 26, speed: 120, damage: 10, score: 70, cost: 2, color: '#59e391' },
  mite: { radius: 9, hp: 8, speed: 235, damage: 6, score: 20, cost: 0, color: '#8dff6a' },
  charger: { radius: 18, hp: 46, speed: 130, damage: 16, score: 110, cost: 2, color: '#ffe14d' },
  brute: { radius: 30, hp: 130, speed: 62, damage: 20, score: 200, cost: 4, color: '#ff5a4d' },
  boss: { radius: 52, hp: 950, speed: 58, damage: 24, score: 1500, cost: 0, color: '#c26bff' },
};

/** Wave N spawns this many points of enemies; a boss wave spawns the boss plus adds. */
export function waveBudget(wave) {
  return 6 + wave * 4;
}

export const BOSS_EVERY = 5;

/** Kill streak: kills inside this window keep the streak alive. */
export const STREAK_WINDOW = 2.5;

export const PALETTE = {
  backdrop: '#070a18',
  grid: '#12203d',
  gridBright: '#1b2f55',
  obstacle: '#241b4d',
  obstacleEdge: '#7b5cff',
  player: '#35f2ff',
  playerCore: '#eafcff',
  bullet: '#8ef6ff',
  enemyBullet: '#ff7ad9',
  credit: '#ffd94d',
  health: '#5cff8a',
  panel: '#0d1330',
  panelEdge: '#2b3a6b',
  text: '#eef3ff',
  muted: '#8b96b8',
  danger: '#ff5a6e',
  gold: '#ffd94d',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'voidpulse.best';
