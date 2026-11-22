import { z } from 'zod';

const deps = z.record(z.string(), z.string()).optional();
const manifest = z.looseObject({
  dependencies: deps,
  devDependencies: deps,
  peerDependencies: deps,
});

/** JSON text; the result is still unknown until the schema below parses it. */
const parseText: (text: string) => unknown = JSON.parse;
const jsonObject = z.string().transform(parseText).pipe(z.record(z.string(), z.unknown()));

const byName = ([a]: [string, string], [b]: [string, string]): number => (a < b ? -1 : 1);

/** The package.json `text` with each missing `names` as a `workspace:*` dependency, sorted. */
export function withDeps(text: string, names: string[]): { text: string; added: string[] } {
  const raw = jsonObject.parse(text);
  const m = manifest.parse(raw);
  const has = new Set(
    [m.dependencies, m.devDependencies, m.peerDependencies].flatMap((d) => Object.keys(d ?? {})),
  );
  const added = [...new Set(names)].filter((n) => !has.has(n)).sort();
  if (added.length === 0) return { text, added };
  const all = { ...m.dependencies, ...Object.fromEntries(added.map((n) => [n, 'workspace:*'])) };
  const dependencies = Object.fromEntries(Object.entries(all).sort(byName));
  return { text: `${JSON.stringify({ ...raw, dependencies }, null, 2)}\n`, added };
}
