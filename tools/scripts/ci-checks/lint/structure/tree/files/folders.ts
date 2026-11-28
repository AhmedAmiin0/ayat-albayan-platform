import { posix } from 'node:path';
import type { FolderCount } from '../tree.types.ts';

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

export const isCode = (file: string): boolean => CODE.test(file) && !TEST.test(file);

/** Every folder that holds a file (directly or below), with its ancestors. */
export function foldersOf(files: readonly string[]): Set<string> {
  const out = new Set<string>();
  for (const file of files) {
    for (let d = posix.dirname(file); d !== '.' && !out.has(d); d = posix.dirname(d)) out.add(d);
  }
  return out;
}

/** Code files (not tests) and sub-folders of each folder under `root`, as folder-cap counts. */
export function countUnder(files: readonly string[], root: string): Map<string, FolderCount> {
  const inside = files.filter(
    (f) => f.startsWith(`${root}/`) && !f.split('/').some((s) => SKIP.has(s)),
  );
  const out = new Map<string, FolderCount>();
  const at = (dir: string): FolderCount => {
    const seen = out.get(dir) ?? { files: 0, dirs: 0 };
    out.set(dir, seen);
    return seen;
  };
  inside.filter(isCode).forEach((f) => (at(posix.dirname(f)).files += 1));
  for (const dir of foldersOf(inside)) {
    if (dir.length <= root.length) continue;
    at(dir);
    at(posix.dirname(dir)).dirs += 1;
  }
  return out;
}
