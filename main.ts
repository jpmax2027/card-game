// Crown Duel — the entrypoint. It hands the game in: copies game/ and screenshots/ from
// beside this file into the output directory and writes dossier.json there, the summary
// the judge reads, built with the kit's vendored library. Node 22, standard library only.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output; without it, /output is used.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The same caps the scorer enforces: at most 4 screenshots, each at most 256 KiB;
// game/ at most 993 files and 48 MiB; dossier text at most 160 KiB.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
