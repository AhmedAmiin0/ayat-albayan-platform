import { existsSync } from 'node:fs';
import { posix } from 'node:path';

const EXT = /\.(?:[cm]?jsx?)$/;
const ENDINGS = ['', '.ts', '.tsx', '.mts', '/index.ts', '/index.tsx'];

/** The folder of the nearest package.json above `path` (repo-relative), '' for the root. */
export function workspaceOf(root: string, path: string): string {
  const dir = posix.dirname(path);
  if (dir === '.' || existsSync(posix.join(root, dir, 'package.json')))
    return dir === '.' ? '' : dir;
  return workspaceOf(root, dir);
}

/** The path a relative or `@/` specifier starts from, before its extension is resolved. */
const BASES: [RegExp, (root: string, from: string, spec: string) => string][] = [
  [/^\.\.?(?:\/|$)/, (_r, from, spec) => posix.join(posix.dirname(from), spec)],
  [/^@\//, (root, from, spec) => posix.join(workspaceOf(root, from), 'src', spec.slice(2))],
];

/** The file among `known` that a relative or `@/` specifier written in `from` points at. */
export function targetOf(
  root: string,
  ref: { from: string; spec: string },
  known: ReadonlySet<string>,
): string | undefined {
  const base = BASES.find(([re]) => re.test(ref.spec))?.[1](root, ref.from, ref.spec);
  if (base === undefined) return undefined;
  const stems = [base, base.replace(EXT, '')];
  return stems.flatMap((s) => ENDINGS.map((e) => s + e)).find((c) => known.has(c));
}
