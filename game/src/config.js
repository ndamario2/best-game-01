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
  sniper: { radius: 15, hp: 24, speed: 95, damage: 14, score: 120, cost: 3, color: '#b388ff' },
  kamikaze: { radius: 14, hp: 16, speed: 215, damage: 18, score: 90, cost: 2, color: '#ff2e63' },
  orbiter: { radius: 15, hp: 28, speed: 140, damage: 9, score: 100, cost: 2, color: '#4dd7ff' },
  boss: { radius: 52, hp: 950, speed: 58, damage: 24, score: 1500, cost: 0, color: '#c26bff' },
  ringboss: { radius: 58, hp: 1150, speed: 46, damage: 22, score: 2500, cost: 0, color: '#ff5ad9' },
};

/** Wave N spawns this many points of enemies; a boss wave spawns the boss plus adds. */
export function waveBudget(wave) {
  // Gentle onboarding: the first three waves are small, then the budget grows.
  if (wave <= 3) return 4 + wave * 2;
  return 10 + (wave - 3) * 4;
}

/** Seconds between spawns while a wave trickles in; the opening waves breathe. */
export function spawnInterval(wave) {
  return wave <= 3 ? 1.15 : 0.85;
}

export const BOSS_EVERY = 5;

/** Every tenth wave the Halo Warden replaces the Voidwarden. */
export const RING_BOSS_EVERY = 10;

/** Weapon tuning, per weapon: the blaster is the starter; the draft unlocks the rest. */
export const WEAPON = {
  blaster: { name: 'Pulse Blaster', interval: 0.15, damage: 12, speed: 720 },
  shotgun: { name: 'Scattergun', pellets: 5, spread: 0.55, damage: 9, interval: 0.55, speed: 640, life: 0.5, heat: 10 },
  railgun: { name: 'Railgun', damage: 70, interval: 0.95, speed: 1400, pierce: 99, radius: 9, life: 1.2, heat: 22 },
  missiles: { name: 'Seeker Missiles', count: 2, damage: 16, interval: 0.5, speed: 520, turn: 6.0, heat: 6 },
};

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
