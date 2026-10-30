// The import graph of the code e2e runs (web, api, shared, client-core, e2e), for the PR spec selection.
// Edges are name-precise through barrels: `import { a } from '@ab/shared'` points at the file that
// declares `a`, not at the whole barrel (every module is imported through its index.ts, so a file-level
// graph would make every file reach almost every page). A name the parser cannot place points at the
// barrel and everything it re-exports (wider, never narrower).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import { ownExports, parseImports } from './parse.mjs';

export const ROOTS = [
  'apps/web/src',
  'apps/api/src',
  'packages/shared/src',
  'packages/client-core/src',
  'e2e',
];
const CODE = /\.(ts|tsx|mjs)$/;
const UNIT =
  /\.test\.(ts|tsx|mjs)$|(^|\/)(node_modules|dist|__snapshots__|playwright-report|test-results)\//;
const ALIAS = {
  '@ab/shared': 'packages/shared/src/index.ts',
  '@ab/shared/testing': 'packages/shared/src/testing/index.ts',
  '@ab/client-core': 'packages/client-core/src/index.ts',
};

/** Repo-relative code files under the roots, unit tests excluded (e2e never runs them). */
export function listFiles(root) {
  const out = [];
  const walk = (rel) => {
    for (const e of readdirSync(join(root, rel), { withFileTypes: true })) {
      const p = posix.join(rel, e.name);
      if (e.isDirectory()) {
        if (!UNIT.test(`${p}/`)) walk(p);
      } else if (CODE.test(e.name) && !UNIT.test(p)) out.push(p);
    }
  };
  for (const r of ROOTS) if (existsSync(join(root, r))) walk(r);
  return out.sort();
}

/** Repo-relative file a specifier points at, or null (a package, an asset, a JSON bundle). */
export function resolveSpec(files, from, spec) {
  let base;
  if (ALIAS[spec]) return ALIAS[spec];
  const app = /^apps\/[^/]+\/src\//.exec(from)?.[0];
  // `@/x` → the importing app's src/x (web and api, tsconfig `paths`; docs/32 R12).
  if (spec.startsWith('@/') && app) base = posix.join(app, spec.slice(2));
  else if (spec.startsWith('.')) base = posix.join(posix.dirname(from), spec);
  else return null;
  const bare = base.replace(/\.(js|mjs|ts|tsx)$/, '');
  for (const c of [
    base,
    `${bare}.ts`,
    `${bare}.tsx`,
    `${bare}.mjs`,
    `${bare}/index.ts`,
    `${bare}/index.tsx`,
  ])
    if (files.has(c)) return c;
  return null;
}

/** { files, edges, … } — forward edges file -> files, name-precise through re-exports. */
export function buildGraph(root, fileList = listFiles(root)) {
  const files = new Set(fileList);
  const parsed = new Map();
  const own = new Map();
  for (const f of fileList) {
    const src = readFileSync(join(root, f), 'utf8');
    parsed.set(f, parseImports(src));
    own.set(f, ownExports(src));
  }
  const memo = new Map();
  /** The files that declare `name` as exported from `file` (through its re-exports), or null. */
  const definers = (file, name, seen = new Set()) => {
    const key = `${file}#${name}`;
    if (memo.has(key)) return memo.get(key);
    if (seen.has(file)) return null;
    seen.add(file);
    let found = own.get(file)?.has(name) ? [file] : null;
    for (const { spec, names, reexport } of parsed.get(file) ?? []) {
      const target = reexport && !found ? resolveSpec(files, file, spec) : null;
      if (!target) continue;
      const hit = names?.find((n) => n.as === name);
      if (names === null) found = definers(target, name, seen);
      else if (hit) found = definers(target, hit.from, seen) ?? [target];
    }
    memo.set(key, found);
    return found;
  };
  /** A barrel and every file it re-exports, transitively (the fallback for a name not found). */
  const wholeBarrel = (file, seen = new Set()) => {
    if (seen.has(file)) return seen;
    seen.add(file);
    for (const { spec, reexport } of parsed.get(file) ?? []) {
      const target = reexport ? resolveSpec(files, file, spec) : null;
      if (target) wholeBarrel(target, seen);
    }
    return seen;
  };
  const edges = new Map();
  /** File-level importers (any import or re-export) and the files each one re-exports from. */
  const importers = new Map();
  const reexportsFrom = new Map();
  const add = (map, key, value) => (map.get(key) ?? map.set(key, new Set()).get(key)).add(value);
  const bareOf = (file) =>
    (parsed.get(file) ?? []).filter((i) => i.bare).map((i) => resolveSpec(files, file, i.spec));
  for (const f of fileList) {
    const out = new Set();
    for (const { spec, names, reexport } of parsed.get(f) ?? []) {
      const target = resolveSpec(files, f, spec);
      if (!target) continue;
      add(importers, target, f);
      if (reexport) add(reexportsFrom, f, target);
      if (names === null) out.add(target);
      else
        for (const n of names)
          for (const d of definers(target, n.from) ?? wholeBarrel(target)) out.add(d);
      // A barrel's own side-effect imports (`import './register'`) run for whoever imports from it.
      if (names !== null) for (const b of bareOf(target)) if (b) out.add(b);
    }
    edges.set(f, out);
  }
  return { files, edges, importers, reexportsFrom };
}
