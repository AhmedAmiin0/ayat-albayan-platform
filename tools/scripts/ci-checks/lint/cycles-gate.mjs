// Acyclic folders (docs/32 §3.4 k1a): inside a package that lane K splits, the top folders may not
// import each other in a cycle, or the packages cut from them would depend on each other.
// It counts, per root, the folder edges that sit on a cycle. On a PR, CI checks the base branch
// out beside it (GUARD_BASE): a count above the base's own is a new cycle; equal or below passes.
// Nothing is stored, so no PR edits a baseline and none conflict.
// Usage: [GUARD_BASE=<base checkout>] node tools/scripts/ci-checks/lint/cycles-gate.mjs
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** The roots whose top folders must stay acyclic (production code only). */
export const ROOTS = ['packages/core/src', 'packages/time/src', 'packages/shared/src'];
const CODE = /\.[cm]?[jt]sx?$/;
const TEST = /\.(test|spec)\.[cm]?[jt]sx?$/;
const SPEC = /(?:\bfrom\s*|\bimport\s*\(\s*|^\s*import\s+)(['"])(\.{1,2}\/[^'"\n]*)\1/gm;

const COMMENTS = /\/\*[\s\S]*?\*\/|(?<![:'"\w])\/\/[^\n]*/g;

/** The relative module paths `text` imports or re-exports (comments skipped). */
export const specsOf = (text) => [...text.replace(COMMENTS, '').matchAll(SPEC)].map((m) => m[2]);

/** The top folder of a root-relative path (null for a file at the root). */
export const folderOf = (rel) => (rel.includes('/') ? rel.split('/')[0] : null);

/** `Map<folder, Set<folder>>` from `{ path, text }` files (root-relative paths). */
export function folderGraph(files) {
  const graph = new Map();
  for (const { path, text } of files) {
    const from = folderOf(path);
    if (from === null) continue;
    for (const spec of specsOf(text)) {
      const to = folderOf(posix.normalize(posix.join(posix.dirname(path), spec)));
      if (to === null || to === from || to.startsWith('..')) continue;
      if (!graph.has(from)) graph.set(from, new Set());
      graph.get(from).add(to);
    }
  }
  return graph;
}

/** The strongly connected components with more than one folder (Tarjan), each sorted. */
export function cycles(graph) {
  const index = new Map();
  const low = new Map();
  const stack = [];
  const out = [];
  const visit = (v) => {
    index.set(v, index.size);
    low.set(v, index.get(v));
    stack.push(v);
    for (const w of graph.get(v) ?? []) {
      if (!index.has(w)) visit(w);
      if (stack.includes(w)) low.set(v, Math.min(low.get(v), low.get(w)));
    }
    if (low.get(v) !== index.get(v)) return;
    const scc = stack.splice(stack.lastIndexOf(v));
    if (scc.length > 1) out.push(scc.sort());
  };
  for (const v of [...graph.keys()].sort()) if (!index.has(v)) visit(v);
  return out.sort((a, b) => a[0].localeCompare(b[0]));
}

/** The edges `a → b` whose two ends sit in the same cycle, sorted. */
export function cycleEdges(graph) {
  const sccOf = new Map(cycles(graph).flatMap((scc, i) => scc.map((f) => [f, i])));
  const edges = [...graph].flatMap(([a, tos]) => [...tos].map((b) => [a, b]));
  return edges
    .filter(([a, b]) => sccOf.has(a) && sccOf.get(a) === sccOf.get(b))
    .map(([a, b]) => `${a} → ${b}`)
    .sort();
}

/**
 * One line per root whose count is above the base branch's (a new cycle); equal or below passes.
 * A root the base lacks (added by this PR) takes its first count as the baseline.
 */
export function check(now, base) {
  return Object.entries(now)
    .filter(([root, n]) => n > (base[root] ?? n))
    .map(([root, n]) => `${root}: ${n} cycle edges > the base branch's ${base[root]}`);
}

function filesOf(root, rel = '') {
  return readdirSync(join(root, rel), { withFileTypes: true }).flatMap((e) => {
    const path = rel === '' ? e.name : `${rel}/${e.name}`;
    if (e.isDirectory()) return filesOf(root, path);
    return CODE.test(e.name) && !TEST.test(e.name) ? [{ path, text: readFileSync(join(root, path), 'utf8') }] : [];
  });
}

/** `{ root: cycle edge count }` of the tree at `dir`, for the roots it has. */
function counts(dir) {
  const roots = ROOTS.filter((r) => existsSync(join(dir, r)));
  const count = (r) => cycleEdges(folderGraph(filesOf(join(dir, r)))).length;
  return Object.fromEntries(roots.map((r) => [r, count(r)]));
}

function main() {
  const repo = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
  const graphs = Object.fromEntries(ROOTS.map((r) => [r, folderGraph(filesOf(join(repo, r)))]));
  const now = Object.fromEntries(ROOTS.map((r) => [r, cycleEdges(graphs[r]).length]));
  const dir = process.env.GUARD_BASE;
  const base = dir ? counts(dir) : now;
  console.log(`cycles: ${JSON.stringify(now)} (base branch ${dir ? JSON.stringify(base) : 'not given'})`);
  for (const r of ROOTS) for (const scc of cycles(graphs[r])) console.log(`  ${r}: ${scc.join(' ↔ ')}`);
  const problems = check(now, base);
  for (const p of problems) console.log(`  ${p}`);
  if (problems.length > 0) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
