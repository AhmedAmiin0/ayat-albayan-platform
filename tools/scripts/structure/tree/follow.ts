import type { Moves } from './tree.types.ts';

/** The one folder all of `dir`'s files moved into together, if they did. */
function movedTogether(dir: string, m: Moves, inside: readonly string[]): string | undefined {
  const homes = new Set(
    inside.map((f) => {
      const to = m.files.get(f) ?? f;
      const rest = f.slice(dir.length);
      return to.endsWith(rest) ? to.slice(0, -rest.length) : `split:${to}`;
    }),
  );
  return homes.size === 1 ? [...homes][0] : undefined;
}

/**
 * Where `path` (a file or folder of the old tree) is after the moves: a folder that keeps a file
 * stays; one whose files all moved together follows them; one whose files split up has no place.
 */
export function follow(path: string, m: Moves): string | undefined {
  if (m.before.has(path)) return m.files.get(path) ?? path;
  if (!m.folders.has(path)) return undefined;
  const inside = [...m.before].filter((f) => f.startsWith(`${path}/`));
  const emptied = inside.every((f) => !(m.files.get(f) ?? f).startsWith(`${path}/`));
  return emptied ? movedTogether(path, m, inside) : path;
}
