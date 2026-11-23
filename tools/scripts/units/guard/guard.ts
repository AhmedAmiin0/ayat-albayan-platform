import type { UnitCounts } from './guard.types.ts';
import { guardedUnits } from '../scan/scan.ts';

/** Floating units per folder (scan/floating.ts), outside the excluded trees; sorted by folder. */
export function unitCounts(paths: readonly string[]): UnitCounts {
  const out: UnitCounts = {};
  for (const u of guardedUnits(paths)) out[u.dir] = (out[u.dir] ?? 0) + 1;
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

const line = (dir: string, now: number, was: number): string =>
  `${dir}: ${now} floating units (baseline ${was})`;

/** Folders above their baseline (fail) and below it (develop's baselines job prunes them). */
export function compareUnits(
  now: UnitCounts,
  baseline: UnitCounts,
): { grew: string[]; shrank: string[] } {
  const dirs = [...new Set([...Object.keys(now), ...Object.keys(baseline)])].sort();
  const pairs = dirs.map((d) => ({ d, now: now[d] ?? 0, was: baseline[d] ?? 0 }));
  return {
    grew: pairs.filter((p) => p.now > p.was).map((p) => line(p.d, p.now, p.was)),
    shrank: pairs.filter((p) => p.now < p.was).map((p) => line(p.d, p.now, p.was)),
  };
}

export const total = (counts: UnitCounts): number =>
  Object.values(counts).reduce((n, c) => n + c, 0);
