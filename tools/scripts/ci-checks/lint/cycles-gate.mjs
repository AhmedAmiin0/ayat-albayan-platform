// Acyclic folders (docs/32 §3.4 k1a): inside a package that lane K splits, the top folders may not
// import each other in a cycle, or the packages cut from them would depend on each other.
// refactor/guards/cycles.json counts, per root, the folder edges that sit on a cycle; a count above
// it is a new cycle, one below it fails too until it is lowered (--write), so the count only
// shrinks.
// Usage: node tools/scripts/ci-checks/lint/cycles-gate.mjs [--write]
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** The roots whose top folders must stay acyclic (production code only). */
export const ROOTS = ['packages/shared/src'];
const CODE = /\.[cm]?[jt]sx?$/;
const TEST = /\.(test|spec)\.[cm]?[jt]sx?$/;
const SPEC = /(?:\bfrom\s*|\bimport\s*\(\s*|^\s*import\s+)(['"])(\.{1,2}\/[^'"\n]*)\1/gm;

/** The relative module paths `text` imports or re-exports. */
export const specsOf = (text) => [...text.matchAll(SPEC)].map((m) => m[2]);

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

/** One line per root whose count differs from the baseline (above: a new cycle; below: lower). */
export function check(now, baseline) {
  return Object.entries(now)
    .filter(([root, n]) => n !== (baseline[root] ?? 0))
    .map(([root, n]) =>
      n > (baseline[root] ?? 0)
        ? `${root}: ${n} cycle edges > baseline ${baseline[root] ?? 0}`
        : `${root}: ${n} < baseline ${baseline[root]}, lower it: pnpm guard:cycles -- --write`,
    );
}

function filesOf(root, rel = '') {
  return readdirSync(join(root, rel), { withFileTypes: true }).flatMap((e) => {
    const path = rel === '' ? e.name : `${rel}/${e.name}`;
    if (e.isDirectory()) return filesOf(root, path);
    return CODE.test(e.name) && !TEST.test(e.name) ? [{ path, text: readFileSync(join(root, path), 'utf8') }] : [];
  });
}

function main(args) {
  const repo = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
  const graphs = Object.fromEntries(ROOTS.map((r) => [r, folderGraph(filesOf(join(repo, r)))]));
  const now = Object.fromEntries(ROOTS.map((r) => [r, cycleEdges(graphs[r]).length]));
  const file = join(repo, 'refactor', 'guards', 'cycles.json');
  if (args.includes('--write')) writeFileSync(file, `${JSON.stringify(now, null, 2)}\n`);
  const baseline = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  console.log(`cycles: ${JSON.stringify(now)} (baseline ${JSON.stringify(baseline)})`);
  for (const r of ROOTS) for (const scc of cycles(graphs[r])) console.log(`  ${r}: ${scc.join(' ↔ ')}`);
  const problems = check(now, baseline);
  for (const p of problems) console.log(`  ${p}`);
  if (problems.length > 0) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main(process.argv.slice(2));
