# VOIDPULSE — Neon Arena

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/ndamario2/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/ndamario2/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

A top-down 2D arena roguelite shooter in plain canvas and ES modules. You are
a pulse-runner in a neon arena: survive the waves, draft upgrades between
them, and break the Voidwarden — the boss that arrives every fifth wave.
Score is the goal: how far can one run go?

## Play

```sh
node serve.ts
# open http://localhost:8080
```

| Key | Action |
| --- | --- |
| W A S D | Move |
| Mouse | Aim |
| Hold click | Fire the pulse blaster (watch the heat bar) |
| Space | Dash — brief i-frames, damages enemies with Shockwave Dash |
| P / Esc | Pause |
| 1 / 2 / 3 or click | Pick an upgrade card |
| Enter / click | Start, restart |

## The game

- **Waves** — each wave spawns a budget of enemies that trickles in from the
  arena's edges; clear it to draft one of three upgrades. Waves scale in
  count, health and speed.
- **Enemies** — five kinds with distinct behaviour: Seekers chase, Spitters
  keep their distance and fire orbs, Mites split into three on death,
  Rammers telegraph and then charge in a line, Bulwarks soak damage. Every
  fifth wave the Voidwarden arrives: radial bursts, aimed spreads, summons
  and charges, in three phases.
- **Upgrades** — 12 cards, each stacking to level 5: damage, fire rate,
  multishot, move speed, max HP, coolant, dash cooldown, magnet, surge,
  healing on wave clear, piercing rounds, shockwave dash.
- **Feel** — particles, screenshake, hit flash, floating damage numbers,
  kill streaks (Rampage at x5, Unstoppable at x15), synthesised WebAudio
  effects and a bass pulse under the action. No audio files.
- **Score** — kills, wave bonuses, streak bonuses and credits. The best
  score is kept in localStorage. Endless: the run ends when your hull hits
  zero, and the game-over screen shows kills, streak, damage and accuracy.

## Build

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, stdlib only) copies `game/` and `screenshots/` to the
output directory and writes `dossier.json` with the vendored make.fun
library. The build is deterministic: two runs to different directories are
byte-identical.

Screenshots are deterministic captures of the game itself:
`?shot=start&seed=1` (title over a live arena), `?shot=play&seed=1`
(mid-wave combat), `?shot=boss&seed=1` (the Voidwarden), `?shot=end&seed=1`
(game over with stats).

## Layout

```
game/
  index.html            canvas + status line
  src/
    main.js             boot, fixed 60 Hz loop, screens, debug hook
    config.js           every tuning number and colour
    rng.js              seeded random numbers
    input.js            keyboard + mouse
    audio.js            synthesised WebAudio SFX and bass pulse
    world.js            state, waves, collisions, score, pickups
    player.js           movement, dash, weapon heat, damage
    enemies.js          five enemy kinds plus the Voidwarden boss
    weapons.js          pulse blaster volleys and enemy orbs
    upgrades.js         the 12-card draft pool
    effects.js          particles, floating text, shake, flash
    hud.js              HUD, wave banner, title, draft, pause, game over
    render.js           the neon arena painter
    shots.js            deterministic screenshot scenes + autopilot
```

## Licence

MIT — see `LICENSE`.
