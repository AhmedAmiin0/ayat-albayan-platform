import { posix } from 'node:path';
import type { Move } from './plan.types.ts';
import { isCode, isTest } from '../scan/files.ts';

/** tools/scripts/ci-checks/folder-cap.mjs: code files (tests not counted) and sub-folders. */
const MAX = 12;
const SKIP = /^(?:node_modules|dist|build|coverage|\.turbo|\.expo|__snapshots__)$/;

interface Count {
  files: number;
  dirs: Set<string>;
}

const countFile = (name: string): number => (isCode(name) && !isTest(name) ? 1 : 0);

/** Adds `path` to the counts of its own folder and of every folder above it. */
function add(counts: Map<string, Count>, path: string): void {
  const parts = path.split('/');
  parts.slice(0, -1).forEach((part, i) => {
    const dir = parts.slice(0, i + 1).join('/');
    const sub = parts[i + 1] ?? '';
    const c = counts.get(dir) ?? { files: 0, dirs: new Set<string>() };
    const leaf = i === parts.length - 2;
    c.files += leaf ? countFile(sub) : 0;
    if (!leaf && !SKIP.test(sub)) c.dirs.add(sub);
    counts.set(dir, c);
  });
}

const countsOf = (paths: readonly string[]): Map<string, Count> => {
  const counts = new Map<string, Count>();
  paths.forEach((p) => add(counts, p));
  return counts;
};

const over = (after: number, before: number): boolean => after > MAX && after > before;

function reasonAt(dir: string, after: Count, before: Count | undefined): string | undefined {
  const was = before ?? { files: 0, dirs: new Set<string>() };
  if (over(after.files, was.files))
    return `${dir} would hold ${after.files} code files (max ${MAX})`;
  return over(after.dirs.size, was.dirs.size)
    ? `${dir} would hold ${after.dirs.size} sub-folders (max ${MAX})`
    : undefined;
}

/**
 * Why `moves` (and the new files `added`, the unit barrels) would break the folder cap in a
 * folder they touch, or undefined.
 */
export function capReason(
  paths: readonly string[],
  moves: readonly Move[],
  added: readonly string[] = [],
): string | undefined {
  const to = new Map(moves.map((m) => [m.from, m.to]));
  const before = countsOf(paths);
  const after = countsOf([...paths.map((p) => to.get(p) ?? p), ...added]);
  const touched = new Set(moves.flatMap((m) => [posix.dirname(m.from), posix.dirname(m.to)]));
  const reasons = [...touched].sort().map((d) => {
    const count = after.get(d);
    return count === undefined ? undefined : reasonAt(d, count, before.get(d));
  });
  return reasons.find((r) => r !== undefined);
}
