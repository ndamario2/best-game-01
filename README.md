# VOIDPULSE — Neon Arena v2

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/ndamario2/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/ndamario2/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

A top-down 2D arena roguelite shooter in plain canvas and ES modules. You are
a pulse-runner in a neon arena: survive the waves, draft upgrades between
them, and break the Voidwarden — the boss that arrives every fifth wave — and
the Halo Warden, the bullet-hell ring boss that takes its place every tenth.
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
| Hold click | Fire (watch the heat bar) |
| Space | Dash — brief i-frames, damages enemies with Shockwave Dash |
| P / Esc | Pause |
| 1 / 2 / 3 or click | Pick an upgrade card |
| Enter / click | Start, restart |

## The game

- **Waves** — each wave spawns a budget of enemies that trickles in from the
  arena's edges; clear it to draft one of three upgrades. The first three
  waves onboard gently, then the budget, health and speed scale up.
- **Enemies** — nine kinds with distinct behaviour: Seekers chase, Spitters
  keep their distance and fire orbs, Splitters burst into Mites, Rammers
  telegraph and then charge in a line, Bulwarks soak damage, Snipers draw a
  telegraphed line and fire one fast bolt, Kamikazes run in and detonate,
  Orbiters circle and fire bursts. Every fifth wave the Voidwarden arrives:
  radial bursts, aimed spreads, summons and charges, in three phases. Every
  tenth wave the Halo Warden takes its place: spiral orb arms and a full ring
  burst, telegraphed by a dashed ring on the floor.
- **Weapons** — the Pulse Blaster is the starter. The draft unlocks three
  more: the Scattergun (a close-range pellet spread), the Railgun (one
  piercing bolt, huge damage) and Seeker Missiles (homing). Each levels up
  through its own card.
- **Upgrades** — 21 cards, each stacking to level 5: damage, fire rate,
  multishot, move speed, max HP, coolant, dash cooldown, magnet, surge,
  healing on wave clear, piercing rounds, shockwave dash, combo window,
  critical hits, dash charges, thorns, ricochet, vampiric hull, and the
  three weapon cards. Maxed cards never reappear in the draft.
- **Feel** — a combo multiplier that grows with the kill streak (with an
  on-screen counter and a chime that climbs in pitch), hit-stop on kills,
  particles, screenshake, hit flash, floating damage numbers and critical
  hits, pickup magnetism, a low-hull heartbeat vignette, synthesised
  WebAudio effects, a boss roar and a bass pulse under the action. No audio
  files.
- **Look** — an animated starfield and drifting nebula clouds over the neon
  grid, a wave banner and a boss intro card, a pause screen with run stats,
  and a game-over screen with kills, accuracy, time, best combo and weapon.
- **Score** — kills, wave bonuses, streak bonuses, the combo multiplier and
  credits. The best score is kept in localStorage. Endless: the run ends
  when your hull hits zero.

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
(mid-wave combat), `?shot=boss&seed=1` (the Halo Warden), `?shot=end&seed=1`
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
    player.js           movement, dash charges, weapon heat, damage
    enemies.js          nine enemy kinds plus two bosses
    weapons.js          four weapons, crits, homing missiles
    upgrades.js         the 21-card draft pool
    effects.js          particles, floating text, shake, flash
    hud.js              HUD, wave banner, title, draft, pause, game over
    render.js           starfield, nebula, arena painter
    shots.js            deterministic screenshot scenes + autopilot
```

## Licence

MIT — see `LICENSE`.
