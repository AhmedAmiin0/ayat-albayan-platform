// The app alias (docs/32 R12): `#/…`, defined by the app's package.json `imports` (Node subpath
// imports). TypeScript and Metro resolve an `imports` target exactly, with no extension or index
// lookup, so a `#/` specifier names the file with its extension (`#/inbox/index.ts`).
import { existsSync, readFileSync, statSync } from 'node:fs';
import { posix } from 'node:path';
import { z } from 'zod';

const KEYS = ['#/*', '#/*.ts'];
const target = z.union([z.string(), z.object({ types: z.string() }), z.object({ default: z.string() })]);
const manifest = z.object({ imports: z.record(z.string(), target).optional() });

const pathOf = (t) => (typeof t === 'string' ? t : ('types' in t ? t.types : t.default));

/** `{ root, scope, dir }` (`dir`: the folder `#/` names) from `scope`'s package.json, or undefined. */
export function aliasOf(root, scope) {
  const file = posix.join(root, scope, 'package.json');
  if (!existsSync(file)) return undefined;
  const imports = manifest.parse(JSON.parse(readFileSync(file, 'utf8'))).imports ?? {};
  const key = KEYS.find((k) => k in imports);
  const value = key === undefined ? undefined : imports[key];
  if (value === undefined) return undefined;
  const folder = pathOf(value).split('*')[0] ?? '';
  return { root, scope, dir: posix.join(scope, folder).replace(/\/$/, '') };
}

const JS_TO_TS = { '.js': ['.ts', '.tsx'], '.jsx': ['.tsx'] };
const BARE = ['.ts', '.tsx', '/index.ts', '/index.tsx'];

/** The candidate files a path names: itself, its `.js` → `.ts`, then extensions and index. */
function candidates(path) {
  const ext = posix.extname(path);
  const swaps = (JS_TO_TS[ext] ?? []).map((e) => path.slice(0, -ext.length) + e);
  return [path, ...swaps, ...BARE.map((e) => path + e)];
}

const isFile = (abs) => existsSync(abs) && statSync(abs).isFile();

const PREFIXES = ['@/', '#/'];
const isParent = (spec) => spec === '..' || spec.startsWith('../');

/** The repo path `spec` (no query) points at from `file`, or null when it is no app path. */
function pathFor(alias, file, spec) {
  if (isParent(spec)) return posix.normalize(posix.join(posix.dirname(file), spec));
  const prefix = PREFIXES.find((p) => spec.startsWith(p));
  return prefix === undefined ? null : posix.join(alias.dir, spec.slice(prefix.length));
}

/** The `#/` form of `spec` written in `file` (repo-relative), or null when it stays as it is. */
export function absoluteSpec(alias, file, spec) {
  const [base = '', ...query] = spec.split('?');
  const path = pathFor(alias, file, base);
  if (path === null || !path.startsWith(`${alias.dir}/`)) return null;
  const found = candidates(path).find((p) => isFile(posix.join(alias.root, p)));
  if (found === undefined) return null;
  const out = ['#/' + found.slice(alias.dir.length + 1), ...query].join('?');
  return out === spec ? null : out;
}

/** True for a specifier the codemod looks at: `../`, `@/` or `#/`. */
export const isAppPath = (spec) => isParent(spec) || PREFIXES.some((p) => spec.startsWith(p));
