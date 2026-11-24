import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { OUT_DIR } from './plan.ts';
import type { Part, SeedState } from './screens.types.ts';

// Each test writes its own part to disk: a failed test restarts the worker, and the earlier
// tests' shots and seeded rows must survive that.

const PARTS = join(OUT_DIR, '.parts');
const SEED = join(OUT_DIR, '.seed.json');

export function writePart(name: string, part: Part): void {
  mkdirSync(PARTS, { recursive: true });
  writeFileSync(join(PARTS, `${name}.json`), JSON.stringify(part));
}

export function writeSeed(state: SeedState): void {
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(SEED, JSON.stringify(state));
}

export function readSeed(): SeedState {
  return JSON.parse(readFileSync(SEED, 'utf8')) as SeedState;
}

/** index.json: every shot (app, role, route, variant, file, how it was reached) and every skip. */
export function writeIndex(): void {
  mkdirSync(PARTS, { recursive: true });
  const parts = readdirSync(PARTS).map(
    (file) => JSON.parse(readFileSync(join(PARTS, file), 'utf8')) as Part,
  );
  const index = {
    shots: parts.flatMap((p) => p.entries),
    skipped: parts.flatMap((p) => p.skipped),
  };
  writeFileSync(join(OUT_DIR, 'index.json'), JSON.stringify(index, null, 2));
}
