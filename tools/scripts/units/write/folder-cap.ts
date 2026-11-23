import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { posix } from 'node:path';
import { z } from 'zod';
import { parseJson } from '../json.ts';

/** As tools/scripts/ci-checks/folder-cap.mjs measures a folder. */
const MAX = 12;
const CODE = /\.[cm]?[jt]sx?$/;
const TEST = /\.(test|spec)\.[cm]?[jt]sx?$/;
const SKIP = new Set([
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.turbo',
  '.expo',
  '__snapshots__',
]);
const DIR = posix.join('refactor', 'folder-cap');

const allowList = z.record(z.string(), z.object({ files: z.number(), dirs: z.number() }));
type Count = z.infer<typeof allowList>[string];

function measure(root: string, dir: string): Count {
  const entries = readdirSync(posix.join(root, dir), { withFileTypes: true });
  const files = entries.filter((e) => e.isFile() && CODE.test(e.name) && !TEST.test(e.name)).length;
  return { files, dirs: entries.filter((e) => e.isDirectory() && !SKIP.has(e.name)).length };
}

const within = (c: Count): boolean => c.files <= MAX && c.dirs <= MAX;

function updated(root: string, list: z.infer<typeof allowList>, dirs: ReadonlySet<string>): string {
  const entries = Object.entries(list).flatMap(([dir, count]): [string, Count][] => {
    if (!dirs.has(dir)) return [[dir, count]];
    const now = measure(root, dir);
    return within(now) ? [] : [[dir, now]];
  });
  return `${JSON.stringify(Object.fromEntries(entries), null, 2)}\n`;
}

/** Re-measures the allow-listed folders a fold changed (refactor/folder-cap/*.json). */
export function updateFolderCap(root: string, changed: readonly string[]): void {
  const abs = posix.join(root, DIR);
  if (!existsSync(abs)) return;
  const dirs = new Set(changed);
  for (const name of readdirSync(abs).filter((n) => n.endsWith('.json'))) {
    const file = posix.join(abs, name);
    const text = readFileSync(file, 'utf8');
    const next = updated(root, parseJson(text, allowList), dirs);
    if (next !== text) writeFileSync(file, next);
  }
}
