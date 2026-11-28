import type { Moves } from './tree.types.ts';

/** Where `path` (a file or folder of the old tree) ends up, when all of it moves together. */
export function follow(path: string, m: Moves): string | undefined {
  const file = m.files.get(path);
  if (file !== undefined || m.before.has(path)) return file ?? path;
  if (!m.folders.has(path)) return undefined;
  const inside = [...m.before].filter((f) => f.startsWith(`${path}/`));
  const homes = new Set(
    inside.map((f) => {
      const to = m.files.get(f) ?? f;
      const rest = f.slice(path.length);
      return to.endsWith(rest) ? to.slice(0, -rest.length) : `split:${to}`;
    }),
  );
  return homes.size === 1 ? [...homes][0] : undefined;
}

