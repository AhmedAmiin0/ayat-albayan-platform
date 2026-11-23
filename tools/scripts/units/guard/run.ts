import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { posix } from 'node:path';
import { z } from 'zod';
import { parseJson } from '../json.ts';
import { trackedFiles } from '../scan/tree.ts';
import { compareUnits, total, unitCounts } from './guard.ts';
import type { GuardIo } from './guard.types.ts';

const BASELINE = posix.join('refactor', 'guards', 'units.json');
const baseline = z.record(z.string(), z.number().int().nonnegative());
const flags = z.union([z.tuple([]), z.tuple([z.literal('--write')])]);

const readBaseline = (file: string): z.infer<typeof baseline> =>
  existsSync(file) ? parseJson(readFileSync(file, 'utf8'), baseline) : {};

function save(file: string, now: Record<string, number>): void {
  mkdirSync(posix.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(now, null, 2)}\n`);
}

/**
 * guard:units: no folder gains a floating unit (CLAUDE.md rule 13). `--write` (develop's
 * baselines job) rewrites the baseline from today's tree, so it only shrinks. Returns the exit
 * code.
 */
export function runGuard(argv: readonly string[], io: GuardIo): number {
  const [write] = flags.parse(argv.filter((a) => a !== '--'));
  const file = posix.join(io.root, BASELINE);
  const now = unitCounts(trackedFiles(io.root));
  if (write !== undefined) save(file, now);
  const { grew, shrank } = compareUnits(now, readBaseline(file));
  io.log(`units: ${total(now)} floating units in ${Object.keys(now).length} folders`);
  grew.forEach((g) => io.log(`  new: ${g} (pnpm units:fold -- --write --paths <dir>)`));
  shrank.forEach((s) => io.log(`  fixed: ${s} (develop drops it from the baseline)`));
  return grew.length > 0 ? 1 : 0;
}
