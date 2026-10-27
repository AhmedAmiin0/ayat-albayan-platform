// Imports and exports of a TypeScript source, by regex (enough for the e2e selection; graph.mjs widens
// to the whole module whenever a form is not understood).

/**
 * Every import/re-export of a source: { spec, names, reexport, bare }. names: [{ from, as }] (`a as b`),
 * or null for the whole module (default, namespace, side-effect, dynamic import, export *); bare = a
 * side-effect import (`import './x'`).
 */
export function parseImports(src) {
  const out = [];
  const list = (s) =>
    s
      .split(',')
      .map((p) =>
        p
          .trim()
          .replace(/^type\s+/, '')
          .split(/\s+as\s+/),
      )
      .filter(([from]) => from)
      .map(([from, as = from]) => ({ from: from.trim(), as: as.trim() }));
  const re =
    /(?:^|[;\n}])\s*(import|export)\s+(?:type\s+)?(?:\{([^}]*)\}|\*(?:\s+as\s+[\w$]+)?|[\w$]+(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+[\w$]+))?)?\s*(?:from\s*)?['"]([^'"]+)['"]/g;
  for (const m of src.matchAll(re)) {
    const [whole, kind, braces, spec] = m;
    const named = braces !== undefined && !/(import|export)\s+(type\s+)?[\w$]+\s*,/.test(whole);
    const bare = /^[;\n}]?\s*import\s*['"]/.test(whole);
    out.push({ spec, names: named ? list(braces) : null, reexport: kind === 'export', bare });
  }
  for (const m of src.matchAll(/\bimport\(\s*['"`]([^'"`]+)['"`]\s*\)/g))
    out.push({ spec: m[1], names: null, reexport: false, bare: false });
  return out;
}

/** Names a file declares itself (not re-exports). */
export function ownExports(src) {
  const out = new Set();
  const decl =
    /\bexport\s+(?:declare\s+)?(?:default\s+)?(?:async\s+)?(?:abstract\s+)?(?:function\*?|const|let|var|class|interface|type|enum|namespace)\s+([\w$]+)/g;
  for (const m of src.matchAll(decl)) out.add(m[1]);
  for (const m of src.matchAll(/\bexport\s+(?:type\s+)?\{([^}]*)\}(?!\s*from)/g))
    for (const part of m[1].split(',')) {
      const name = part
        .trim()
        .replace(/^type\s+/, '')
        .split(/\s+as\s+/)
        .pop()
        ?.trim();
      if (name) out.add(name);
    }
  return out;
}
