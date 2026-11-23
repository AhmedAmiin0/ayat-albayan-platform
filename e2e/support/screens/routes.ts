import type { Filled, Seeded } from './screens.types.ts';

const BAD_LINK = 'demo-invalid-link';

/** Params whose name differs from the seeded row it means. */
const ALIAS: Record<string, keyof Seeded> = { code: 'shortCode', id: 'meetingId' };

const isSeededKey = (name: string, seeded: Seeded): name is keyof Seeded => name in seeded;

/** The `fullPaths` union of a TanStack Router routeTree.gen.ts, without trailing slashes. */
export function parseFullPaths(source: string): string[] {
  const block = /fullPaths:\s*((?:\|\s*'[^']*'\s*)+)/.exec(source);
  if (!block?.[1]) throw new Error('routeTree.gen.ts: no fullPaths union');
  const paths = [...block[1].matchAll(/'([^']*)'/g)].map((m) => m[1] ?? '');
  const trimmed = paths.map((p) => (p.length > 1 ? p.replace(/\/$/, '') : p));
  return [...new Set(trimmed)];
}

function paramValue(name: string, seeded: Seeded): string | undefined {
  const key = ALIAS[name] ?? name;
  return isSeededKey(key, seeded) ? seeded[key] : undefined;
}

/**
 * A route with its params filled: the first seeded row, or for a signed link (a token only the
 * API can mint) an invalid token, which shows the page's error state.
 */
export function fillRoute(path: string, seeded: Seeded): Filled {
  const names = [...path.matchAll(/\$(\w+)/g)].map((m) => m[1] ?? '');
  if (names.length === 0) return { url: path, how: 'direct' };
  const values = names.map((name) => paramValue(name, seeded));
  const signed = values.some((v) => v === undefined);
  const url = names.reduce((acc, name, i) => acc.replace(`$${name}`, values[i] ?? BAD_LINK), path);
  const how = signed ? 'invalid link: error state' : `first seeded ${names.join(', ')}`;
  return { url, how };
}
