// CRIMSON VAULT — main.ts
// The entrypoint make.fun runs (Node 22, standard library only, no network).
// It hands the game in: copies this repository's game/ and screenshots/
// into the output directory and writes dossier.json there, built by the
// kit's vendored library from exactly those files.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// In the grader the output directory is /output. The program runs twice
// and both runs must write the same bytes, so it copies files as they are
// and never stamps a time or a random value into the dossier.

import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-game.ts";

const repoRoot = fileURLToPath(new URL(".", import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

// Copy one directory tree from the repo into the output, creating the
// destination first so an empty source still leaves the folder behind.
function copyTree(name: string): void {
  const from = join(repoRoot, name);
  const to = join(outputDir, name);
  mkdirSync(to, { recursive: true });
  if (existsSync(from)) cpSync(from, to, { recursive: true });
}

mkdirSync(outputDir, { recursive: true });
copyTree("game");
copyTree("screenshots");

// The gate's own caps, so a bad entry is refused here instead of on the
// server: at most 4 screenshots of 256 KiB each, at most 993 files and
// 48 MiB under game/, no game/ path over 1000 bytes, and the dossier text
// capped at 160 KiB — the rest of the caps are the scorer's, not ours.
writeFileSync(
  join(outputDir, "dossier.json"),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
