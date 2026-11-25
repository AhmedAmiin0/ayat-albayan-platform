import { posix } from 'node:path';

// The folded component files phase 2 works on (docs/63 §4): `Name/Name.tsx` in the six frontend
// workspaces, minus routes, tests, showcases, test helpers and icon sets.
const SCOPE = /^(?:apps\/(?:staff|family)-(?:web|mobile)|packages\/(?:web|mobile)-kit)\/src\//;
const SKIP =
  /\/routes\/|\/(?:tests?|testing|__tests__|fixtures)\/|\.(?:test|spec|showcase|testing)\.tsx$|-icons\.tsx$/;

export interface Target {
  path: string;
  name: string;
  ws: string;
}

const under = (path: string, prefixes: readonly string[]): boolean =>
  prefixes.some((p) => `${path}/`.startsWith(`${p.replace(/\/$/, '')}/`) || path === p);

/** `Name/Name.tsx` files under `only`. */
export function targetsOf(paths: readonly string[], only: readonly string[]): Target[] {
  return paths
    .filter((p) => p.endsWith('.tsx') && SCOPE.test(p) && !SKIP.test(p) && under(p, only))
    .filter((p) => posix.basename(posix.dirname(p)) === posix.basename(p, '.tsx'))
    .map((path) => ({
      path,
      name: posix.basename(path, '.tsx'),
      ws: path.split('/').slice(0, 2).join('/'),
    }));
}

/** Exclude file lines: `path<TAB>reason`; `#` comments and blank lines skipped. */
export const parseExcludes = (text: string): Map<string, string> =>
  new Map(
    text
      .split('\n')
      .filter((l) => l.trim() !== '' && !l.startsWith('#'))
      .map((l): [string, string] => {
        const [path = '', why = 'excluded'] = l.split('\t');
        return [path.trim().replace(/\/$/, ''), why.trim()];
      }),
  );

/** The reason a target is excluded: its own path or a folder above it is listed. */
export const excludedWhy = (
  path: string,
  excludes: ReadonlyMap<string, string>,
): string | undefined => [...excludes].find(([p]) => under(path, [p]))?.[1];
