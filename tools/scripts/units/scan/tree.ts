import { execFileSync } from 'node:child_process';
import { posix } from 'node:path';
import type { Exclusion } from './scan.types.ts';

const SCANNED = /^(?:apps|packages|tools)\/[^/]+\//;
const SKIP = /(?:^|\/)(?:node_modules|dist|build|coverage|__snapshots__)(?:\/|$)/;

/** Trees a unit move never touches: other lanes own them or a tool reads their paths. */
const EXCLUSIONS: Exclusion[] = [
  { test: /^apps\/api\/src\/modules(?:\/|$)/, why: 'Nest modules (their own lane)' },
  { test: /^apps\/[^/]+-mobile\/app(?:\/|$)/, why: 'expo-router app/ tree' },
  { test: /^apps\/[^/]+\/src\/routes(?:\/|$)/, why: 'file-based route tree' },
  { test: /^packages\/db\/(?:src|supabase)(?:\/|$)/, why: 'packages/db types and supabase' },
];

export const exclusionOf = (dir: string): Exclusion | undefined =>
  EXCLUSIONS.find((e) => e.test.test(dir));

export const workspaceOf = (dir: string): string => dir.split('/').slice(0, 2).join('/');

/** Folder → file names, for the scanned paths (apps, packages, tools; e2e/ is never scanned). */
export function foldersOf(paths: readonly string[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const path of paths.filter((p) => SCANNED.test(p) && !SKIP.test(p))) {
    const dir = posix.dirname(path);
    out.set(dir, [...(out.get(dir) ?? []), posix.basename(path)]);
  }
  return out;
}

/** The repo's tracked files. */
export function trackedFiles(root: string): string[] {
  const out = execFileSync('git', ['ls-files', '--cached', '--deduplicate'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
  return out.split('\n').filter((p) => p !== '');
}
