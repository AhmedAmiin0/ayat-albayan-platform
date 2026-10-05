// The UI copy as a flat map: ar.json / en.json are nested trees of strings; translation overrides
// (table translation_overrides) are addressed by the dotted path of a leaf, e.g. 'nav.leads'.

/** Flat `{ 'nav.leads': '…', … }` of every string leaf of a bundle. */
export type FlatStrings = Record<string, string>;

function walk(node: unknown, path: string, out: FlatStrings): void {
  if (typeof node === 'string') {
    out[path] = node;
    return;
  }
  if (node === null || typeof node !== 'object') return;
  for (const [k, v] of Object.entries(node)) walk(v, path ? `${path}.${k}` : k, out);
}

/** Every string leaf of `tree`, keyed by its dotted path. */
export function flattenStrings(tree: object): FlatStrings {
  const out: FlatStrings = {};
  walk(tree, '', out);
  return out;
}

/** The top-level section of a key: 'nav.leads' → 'nav'. */
export function sectionOf(key: string): string {
  const dot = key.indexOf('.');
  return dot < 0 ? key : key.slice(0, dot);
}

/** A deep copy of a JSON bundle (JSON round trip: works the same on Hermes, jsdom and Node). */
export function cloneBundle<T extends object>(bundle: T): T {
  return JSON.parse(JSON.stringify(bundle)) as T;
}

function ownChild(node: unknown, key: string): unknown {
  if (node === null || typeof node !== 'object') return undefined;
  return Object.hasOwn(node, key) ? Reflect.get(node, key) : undefined;
}

/**
 * Writes `values` into the string leaves of `target` IN PLACE, so objects captured elsewhere
 * (`const { nav } = t`) see the change. Only existing string leaves are replaced: an unknown path,
 * a path to an object, or an empty value is skipped. Returns how many leaves were written.
 */
export function applyStrings(target: object, values: FlatStrings): number {
  let applied = 0;
  for (const [key, value] of Object.entries(values)) {
    if (typeof value !== 'string' || value === '') continue;
    const parts = key.split('.');
    const leaf = parts.pop();
    let node: unknown = target;
    for (const p of parts) node = ownChild(node, p);
    if (leaf === undefined || node === null || typeof node !== 'object') continue;
    if (typeof ownChild(node, leaf) !== 'string') continue;
    Reflect.set(node, leaf, value);
    applied += 1;
  }
  return applied;
}
