// VOIDPULSE — Neon Arena: a best-game-01 entry (Node 22, standard library only).
// The game is this directory's game/ folder: plain static files a desktop
// browser loads offline (game/index.html and its ES modules, no library and no
// network request), and this program hands it in. It copies game/ and
// screenshots/ from beside this file to /output and writes /output/dossier.json,
// the summary the judge reads, with the vendored make.fun library.
//
// The game: a top-down 2D arena roguelite shooter. WASD moves, the mouse aims,
// hold-click fires, Space dashes through danger, and after every cleared wave
// the player drafts one of three upgrades. Waves scale, a boss — the
// Voidwarden — arrives every fifth wave, and the score is the goal: survive,
// stack upgrades, and see how far the run goes.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// VOIDPULSE: fail fast when the entry is laid out wrong, before copying anything.
function requireEntryFile(relative) {
  const path = join(here, relative);
  if (!existsSync(path)) {
    throw new Error(`VOIDPULSE: missing ${relative} at ${path}`);
  }
  return path;
}

const gameDir = requireEntryFile('game');
const indexHtml = requireEntryFile(join('game', 'index.html'));
const vendorLib = requireEntryFile(join('vendor', 'makefun-game.ts'));
const shotsDir = requireEntryFile('screenshots');

if (!statSync(gameDir).isDirectory()) throw new Error('VOIDPULSE: game/ is not a directory');
if (!statSync(indexHtml).isFile()) throw new Error('VOIDPULSE: game/index.html is not a file');
if (!statSync(vendorLib).isFile()) throw new Error('VOIDPULSE: vendor/makefun-game.ts is not a file');

// The gate caps screenshots at 4 files of 256 KiB: refuse a bad set here, where
// the message names the file, instead of handing in an entry the scorer refuses.
const shotFiles = readdirSync(shotsDir).filter((name) => !name.startsWith('.'));
if (shotFiles.length < 3 || shotFiles.length > 4) {
  throw new Error(`VOIDPULSE: screenshots/ must hold 3 or 4 images, found ${shotFiles.length}`);
}
for (const name of shotFiles) {
  const size = statSync(join(shotsDir, name)).size;
  if (size > 262144) throw new Error(`VOIDPULSE: screenshots/${name} is ${size} bytes, over the 256 KiB cap`);
}

mkdirSync(out, { recursive: true });
cpSync(gameDir, join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
