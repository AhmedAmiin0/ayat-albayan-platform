// The facade codemod's import rewrites (docs/32 R7, CLAUDE.md rule 23): a named import or
// export-from may name the package that owns the binding instead of the module that re-exported it,
// one statement may be split into several with the same bindings, and a workspace re-export nobody
// uses may go (pure-move/deps.mjs). Mocks, dynamic imports and namespace imports keep their exact
// paths: a mock of the facade and a mock of the owner are not the same test.
import { droppable } from './deps.mjs';
import { statementsOf } from './statements.mjs';

const keyOf = (s, e) => [s.kind, s.type, e.inline, e.name, e.alias].join('|');

/** A source's statements as fixed lines (compared whole) and bindings (compared one by one). */
function sides(n) {
  const list = statementsOf(n);
  const bindings = (s) => s.entries.map((e) => ({ key: keyOf(s, e), s, e }));
  const bound = list.filter((s) => s.bound).flatMap(bindings);
  return { fixed: list.filter((s) => !s.bound), bound };
}

/** Head fixed lines must be the base's in order; base lines left out are returned. */
function fixedLeft(base, head, c) {
  const left = [];
  let j = 0;
  for (const s of base) {
    const h = head[j];
    const same = h !== undefined && h.text === s.text && c.same(s.spec, h.spec);
    j += same ? 1 : 0;
    if (!same) left.push(s);
  }
  return j === head.length ? left : null;
}

/** Each head binding must match an unused base binding with the same key and an accepted path. */
function boundLeft(base, head, c) {
  const free = [...base];
  const owner = (b, h) =>
    c.modules.reexports(c.from, b.s.spec, { to: c.to, spec: h.s.spec, name: b.e.name });
  const accepts = (b, h) => b.key === h.key && (c.same(b.s.spec, h.s.spec) || owner(b, h));
  for (const h of head) {
    const i = free.findIndex((b) => accepts(b, h));
    if (i < 0) return null;
    free.splice(i, 1);
  }
  return free.map((b) => ({ ...b.s, entries: [b.e] }));
}

/**
 * True when the module statements of two normalized sources (`a`, `b`) differ only by facade moves.
 * `c`: { from, to, same(oldSpec, newSpec), modules } (modules: exports.mjs headModules).
 */
export function facadeMoved(a, b, c) {
  if (c.modules === undefined) return false;
  const [x, y] = [sides(a), sides(b)];
  const fixed = fixedLeft(x.fixed, y.fixed, c);
  const bound = fixed && boundLeft(x.bound, y.bound, c);
  return bound !== null && droppable(c.modules, c.to, [...fixed, ...bound]);
}
