// One module statement as the pure-move gate's STATEMENTS regex finds it, read for the facade rules
// (pure-move/facade.mjs, deps.mjs): its kind, shape, bindings and type-only flags.

const SHAPE =
  /^(import|export)\s+(type\s+)?(?:([\w$]+)\s*,?\s*)?(\{[^}]*\}|\*(?:\s+as\s+[\w$]+)?)?\s*(from\b)?/;
const ITEM = /^(type\s+)?([\w$]+)(?:\s+as\s+([\w$]+))?$/;
const REQUIRE = /=\s*require\(/;

const SHAPES = [
  ['star', (list) => list === '*'],
  ['ns', (list) => list.startsWith('*')],
  ['list', (list) => list.startsWith('{')],
];
const shapeOf = (list) => SHAPES.find(([, test]) => test(list))?.[0] ?? 'plain';
const entry = (m) => ({ name: m[2] ?? '', alias: m[3] ?? '', inline: m[1] !== undefined });
const itemsOf = (list) => list.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean);

/** Named bindings of a `{ … }` list or a default import (null when an item does not parse). */
export function entriesOf(list, def) {
  const parsed = itemsOf(list).map((item) => ITEM.exec(item));
  const first = def === undefined ? [] : [{ name: 'default', alias: def, inline: false }];
  return parsed.includes(null) ? null : [...first, ...parsed.map(entry)];
}
const ENTRIES = { list: entriesOf, plain: entriesOf, star: () => null, ns: () => null };
const isBound = (from, text, entries) =>
  from !== undefined && !REQUIRE.test(text) && (entries?.length ?? 0) > 0;
/** The name of an `export * as name` line. */
export const nsName = (text) => text.replace(/^.*\*\s+as\s+([\w$]+).*$/s, '$1');

/**
 * One module statement (squashed, path replaced): `shape` star | ns | list | plain, its bindings,
 * and `bound` when it imports or re-exports named bindings that may be regrouped.
 */
export function statementOf(text, spec) {
  const [, kind = '', type, def, list = '', from] = SHAPE.exec(text) ?? [];
  const shape = shapeOf(list);
  const entries = ENTRIES[shape](list, def);
  const bound = isBound(from, text, entries);
  return { kind, type: type !== undefined, spec, text, shape, entries: entries ?? [], bound };
}

/** The statements of a normalized source, each with its own module path. */
export const statementsOf = (n) =>
  n.statements.map((text, i) => statementOf(text, n.paths[i] ?? ''));
