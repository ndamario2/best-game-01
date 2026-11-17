// Seeded random numbers: one small generator the whole game shares, so a fixed
// seed always plays the same waves, spawns and shots.

/** Mulberry32: fast, small, and good enough for a game. `seed` is any 32-bit int. */
export function createRandom(seed) {
  let state = seed >>> 0;
  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer in [min, max] from `random`. */
export function randomInt(random, min, max) {
  return min + Math.floor(random() * (max - min + 1));
}

/** Pick one element of `items` using `random`. */
export function randomPick(random, items) {
  return items[Math.floor(random() * items.length)];
}

/** Angle in radians pointing from (x1, y1) to (x2, y2). */
export function angleTo(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

/** Distance between two points. */
export function distance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Clamp `value` into [min, max]. */
export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}
