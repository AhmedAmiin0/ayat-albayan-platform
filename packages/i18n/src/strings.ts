// The UI copy as a flat map: ar.json / en.json are nested trees of strings; translation overrides
// (table translation_overrides) are addressed by the dotted path of a leaf, e.g. 'nav.leads'.
import rfdc from 'rfdc';
import { z } from 'zod';

/** Flat `{ 'nav.leads': '…', … }` of every string leaf of a bundle. */
export type FlatStrings = Record<string, string>;

const text = z.string();
const filledText = z.string().min(1);
// instanceof keeps the reference (a record schema copies it): writes land in the caller's tree.
const branch = z.instanceof(Object);
const deepCopy = rfdc();

const childPath = (path: string, key: string): string => (path ? `${path}.${key}` : key);

/** The own entries of a branch; none for a leaf or a missing node. */
function entriesOf(node: unknown): [string, unknown][] {
  const parsed = branch.safeParse(node);
  return parsed.success ? Object.entries(parsed.data) : [];
}

function walk(node: unknown, path: string, out: FlatStrings): void {
  const leaf = text.safeParse(node);
  if (leaf.success) out[path] = leaf.data;
  for (const [k, v] of entriesOf(node)) walk(v, childPath(path, k), out);
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

/** A deep copy of a bundle (plain JS: works the same on Hermes, jsdom and Node). */
export function cloneBundle<T extends object>(bundle: T): T {
  return deepCopy(bundle);
}

function ownChild(node: unknown, key: string): unknown {
  const parsed = branch.safeParse(node);
  return parsed.success && Object.hasOwn(parsed.data, key)
    ? Reflect.get(parsed.data, key)
    : undefined;
}

/** Writes `value` over the string leaf at dotted `key`; false when there is no such leaf. */
function writeLeaf(target: object, key: string, value: string): boolean {
  const parts = key.split('.');
  const leaf = parts.pop() ?? '';
  const node = branch.safeParse(parts.reduce<unknown>(ownChild, target));
  if (!node.success || !text.safeParse(ownChild(node.data, leaf)).success) return false;
  return Reflect.set(node.data, leaf, value);
}

/**
 * Writes `values` into the string leaves of `target` IN PLACE, so objects captured elsewhere
 * (`const { nav } = t`) see the change. Only existing string leaves are replaced: an unknown path,
 * a path to an object, or an empty value is skipped. Returns how many leaves were written.
 */
export function applyStrings(target: object, values: FlatStrings): number {
  let applied = 0;
  for (const [key, value] of Object.entries(values)) {
    if (filledText.safeParse(value).success && writeLeaf(target, key, value)) applied += 1;
  }
  return applied;
}
