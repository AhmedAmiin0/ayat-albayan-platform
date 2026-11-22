// One side of the package-boundary gate: the workspace edges of a tree (manifests, imports, path
// literals) and its per-workspace counts of cross-workspace re-exports and out-of-place `@ab/db`.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { eachFacts } from './packages-code.mjs';
import { CONFIG, configStrings, landing } from './packages-paths.mjs';
import { resolver, workspaces } from './packages-workspaces.mjs';

const CODE = /\.(ts|tsx|mts|cts|js|mjs|cjs)$/;
const TEST = /(^|\/)__tests__\/|\.(test|spec)\.[cm]?[jt]sx?$/;
const SKIPPED = /fixture|^tools\/scripts\/.*\.(test|spec)\.[cm]?[jt]sx?$/;
const PATH_SCOPE = /^(apps|packages)\/[^/]+\/|^e2e\//;
const DB = /^@ab\/db(\/|$)/;
const DB_HOME =
  /^(packages\/db|tools\/migrate)\/|^apps\/api\/.*\.(repo|mapper|rows|row|types|fakes)\.ts$/;
const KINDS = {
  dependencies: 'dep',
  peerDependencies: 'dep',
  optionalDependencies: 'dep',
  devDependencies: 'dev',
};

function tracked(root) {
  const out = execFileSync('git', ['ls-files', '-z'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 2 ** 28,
  });
  return out.split('\0').filter((p) => p !== '' && existsSync(join(root, p)));
}

function manifestEdges(list) {
  const names = new Set(list.map((w) => w.name));
  const edges = (w, field) =>
    Object.keys(w.manifest[field] ?? {})
      .filter((to) => names.has(to) && to !== w.name)
      .map((to) => ({ from: w.name, to, kind: KINDS[field], file: `${w.dir}/package.json` }));
  return list.flatMap((w) => Object.keys(KINDS).flatMap((field) => edges(w, field)));
}

const bump = (counts, key, n) => Object.assign(counts, { [key]: (counts[key] ?? 0) + n });
const wantsPaths = (path) => PATH_SCOPE.test(path) && !TEST.test(path);
const isAlias = (path, specs) =>
  path.startsWith('packages/') && specs.some((s) => s.startsWith('@/'));
const isOutOfPlaceDb = (path, specs) => !DB_HOME.test(path) && specs.some((s) => DB.test(s));

/** The edges of one code file: its specifiers and the path literals that leave its workspace. */
function codeEdges(out, { at, path, facts }) {
  const from = at.owner(path);
  const kind = TEST.test(path) ? 'test-import' : 'import';
  const elsewhere = (to) => to !== undefined && to !== from;
  const imports = facts.specs.map((s) => at.spec(path, s)).filter(elsewhere);
  const paths = new Set(facts.literals.map((l) => landing(out.ctx(path), l)).filter(elsewhere));
  return [
    ...imports.map((to) => ({ from, to, kind, file: path })),
    ...[...paths].map((to) => ({ from, to, kind: 'path', file: path })),
  ];
}

/** The facts of one code file folded into `out`; tests only add edges. */
function fold(out, file) {
  out.edges.push(...codeEdges(out, file));
  const { at, path, facts } = file;
  if (TEST.test(path)) return;
  const from = at.owner(path);
  const crossing = facts.reexports
    .map((s) => at.spec(path, s))
    .filter((to) => to !== undefined && to !== from);
  bump(out.counts.reexports, from, Number(crossing.length > 0));
  bump(out.counts.dbScope, from, Number(isOutOfPlaceDb(path, facts.specs)));
  out.aliases.push(...(isAlias(path, facts.specs) ? [path] : []));
}

function configEdges({ root, at, files }) {
  return files.flatMap((file) => {
    const from = at.owner(file);
    const tos = configStrings(file, readFileSync(join(root, file), 'utf8')).map((s) =>
      landing({ root, at, file }, s),
    );
    return [...new Set(tos)]
      .filter((to) => to !== undefined && to !== from)
      .map((to) => ({ from, to, kind: 'path', file }));
  });
}

const scanned = (root, at) =>
  tracked(root).filter((p) => at.owner(p) !== undefined && !SKIPPED.test(p));

/** The tracked code files the gate reads: inside a workspace, fixtures and script tests aside. */
export const codeFilesOf = (root, at) => scanned(root, at).filter((p) => CODE.test(p));

/** `{ edges, counts: { reexports, dbScope }, aliases, files }` of the tree at `root`. */
export function scan(root) {
  const list = workspaces(root);
  const at = resolver(list);
  const files = scanned(root, at);
  const code = files.filter((p) => CODE.test(p));
  const configs = files.filter((p) => CONFIG.test(p) && PATH_SCOPE.test(p));
  const out = {
    edges: [...manifestEdges(list), ...configEdges({ root, at, files: configs })],
    counts: { reexports: {}, dbScope: {} },
    aliases: [],
    ctx: (file) => ({ root, at, file }),
  };
  eachFacts(code, {
    read: (p) => readFileSync(join(root, p), 'utf8'),
    wantLiterals: wantsPaths,
    visit: (path, facts) => fold(out, { at, path, facts }),
  });
  return { edges: out.edges, counts: out.counts, aliases: out.aliases, files: code.length };
}
