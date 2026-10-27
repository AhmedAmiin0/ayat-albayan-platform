// Walks over the import graph of graph.mjs.

/**
 * Everyone who imports from `file` or from a barrel that re-exports it (transitively): for a changed
 * barrel, whose re-exports (renamed, re-pointed) change what its consumers get.
 */
export function barrelConsumers(graph, file) {
  const out = new Set();
  const q = [file];
  while (q.length) {
    const x = q.pop();
    for (const y of graph.importers.get(x) ?? []) {
      if (out.has(y)) continue;
      out.add(y);
      if (graph.reexportsFrom.get(y)?.has(x)) q.push(y);
    }
  }
  return out;
}

/** Every file that imports `start` directly or transitively (start included); stops at `stop(file)`. */
export function reverseClosure(graph, start, stop = () => false) {
  const rev = (graph.rev ??= invert(graph.edges));
  const seen = new Set(start);
  const q = [...start];
  while (q.length)
    for (const x of rev.get(q.pop()) ?? []) if (!seen.has(x) && !stop(x)) seen.add(x) && q.push(x);
  return seen;
}

function invert(edges) {
  const rev = new Map();
  for (const [from, tos] of edges)
    for (const t of tos) (rev.get(t) ?? rev.set(t, new Set()).get(t)).add(from);
  return rev;
}
