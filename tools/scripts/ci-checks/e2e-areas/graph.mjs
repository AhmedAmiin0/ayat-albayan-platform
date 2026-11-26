// The import graph of the code e2e runs (web, api, the packages, e2e), for the PR spec selection.
// Edges are name-precise through barrels: `import { a } from '@ab/shared'` points at the file that
// declares `a`, not at the whole barrel (every module is imported through its index.ts, so a file-level
// graph would make every file reach almost every page). A name the parser cannot place points at the
// barrel and everything it re-exports (wider, never narrower).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import { ownExports, parseImports } from './parse.mjs';
import { ALIAS, CODE, ROOTS, UNIT } from './graph-roots.mjs';
import { baseOf } from './spec-base.mjs';

const keepDir = (p) => !UNIT.test(`${p}/`);
const keepFile = (p, name) => CODE.test(name) && !UNIT.test(p);

/** Repo-relative code files under the roots, unit tests excluded (e2e never runs them). */
export function listFiles(root) {
  const out = [];
  const visit = (rel, e) => {
    const p = posix.join(rel, e.name);
    const dir = e.isDirectory();
    if (dir && keepDir(p)) walk(p);
    if (!dir && keepFile(p, e.name)) out.push(p);
  };
  const walk = (rel) => {
    for (const e of readdirSync(join(root, rel), { withFileTypes: true })) visit(rel, e);
  };
  for (const r of ROOTS) if (existsSync(join(root, r))) walk(r);
  return out.sort();
}

/** Repo-relative file a specifier points at, or null (a package, an asset, a JSON bundle). */
export function resolveSpec(files, from, spec) {
  if (ALIAS[spec]) return ALIAS[spec];
  const base = baseOf(from, spec);
  if (base === null) return null;
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

function readSources(root, fileList) {
  const parsed = new Map();
  const own = new Map();
  for (const f of fileList) {
    const src = readFileSync(join(root, f), 'utf8');
    parsed.set(f, parseImports(src));
    own.set(f, ownExports(src));
  }
  return { files: new Set(fileList), parsed, own };
}

function makeDefiners({ files, parsed, own }) {
  const memo = new Map();
  /** The files that declare `name` as exported from `file` (through its re-exports), or null. */
  const definers = (file, name, seen = new Set()) => {
    const key = `${file}#${name}`;
    if (!memo.has(key) && !seen.has(file)) memo.set(key, search({ file, name, seen }));
    return memo.get(key) ?? null;
  };
  const search = (at) => {
    at.seen.add(at.file);
    let found = own.get(at.file)?.has(at.name) ? [at.file] : null;
    for (const imp of parsed.get(at.file) ?? []) found ??= viaReexport(at, imp);
    return found;
  };
  const viaReexport = (at, { spec, names, reexport }) => {
    const target = reexport ? resolveSpec(files, at.file, spec) : null;
    if (!target) return null;
    if (names === null) return definers(target, at.name, at.seen);
    const hit = names.find((n) => n.as === at.name);
    return hit ? (definers(target, hit.from, at.seen) ?? [target]) : null;
  };
  return definers;
}

function makeWholeBarrel({ files, parsed }) {
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
  return wholeBarrel;
}

const add = (map, key, value) => (map.get(key) ?? map.set(key, new Set()).get(key)).add(value);

/** { files, edges, … } — forward edges file -> files, name-precise through re-exports. */
export function buildGraph(root, fileList = listFiles(root)) {
  const src = readSources(root, fileList);
  const { files, parsed } = src;
  const definers = makeDefiners(src);
  const wholeBarrel = makeWholeBarrel(src);
  const edges = new Map();
  /** File-level importers (any import or re-export) and the files each one re-exports from. */
  const importers = new Map();
  const reexportsFrom = new Map();
  const bareOf = (file) =>
    (parsed.get(file) ?? []).filter((i) => i.bare).map((i) => resolveSpec(files, file, i.spec));
  const namedTargets = (target, names) =>
    names.flatMap((n) => [...(definers(target, n.from) ?? wholeBarrel(target))]);
  const targetsOf = (target, names) => {
    if (names === null) return [target];
    // A barrel's own side-effect imports (`import './register'`) run for whoever imports from it.
    return [...namedTargets(target, names), ...bareOf(target).filter(Boolean)];
  };
  const link = (f, out, { spec, names, reexport }) => {
    const target = resolveSpec(files, f, spec);
    if (!target) return;
    add(importers, target, f);
    if (reexport) add(reexportsFrom, f, target);
    for (const d of targetsOf(target, names)) out.add(d);
  };
  for (const f of fileList) {
    const out = new Set();
    for (const imp of parsed.get(f) ?? []) link(f, out, imp);
    edges.set(f, out);
  }
  return { files, edges, importers, reexportsFrom };
}
