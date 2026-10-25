// Module-path part of pure-move-check: a changed import/mock path must point at the same file as before,
// at its new place (a rename of the same diff), seen from the file's own new place.
import { posix } from 'node:path';

const EXT = /\.(d\.ts|[cm]?[jt]sx?)$/;
const strip = (p) => p.replace(EXT, '');

/** `old path → new path` (extensions stripped), with folder keys for moved index files. */
export function renameTable(renames) {
  const table = new Map();
  for (const [from, to] of renames) {
    table.set(strip(from), strip(to));
    if (posix.basename(from).startsWith('index.')) table.set(posix.dirname(from), strip(to));
  }
  return table;
}

/** The repo path a specifier points at from `file` (null for a package). */
export function target(file, spec) {
  if (spec.startsWith('.')) return posix.normalize(posix.join(posix.dirname(file), spec)).replace(/\/$/, '');
  // `@/*` → `./src/*` in each app's tsconfig, for every file of the app (mobile's app/ routes too).
  const app = /^(apps\/[^/]+)\//.exec(file);
  if (spec.startsWith('@/') && app) return posix.join(app[1], 'src', spec.slice(2));
  return null;
}

/** True when `newSpec` in `to` names the file that `oldSpec` named in `from`. */
export function samePath({ from, to, table }, oldSpec, newSpec) {
  const was = target(from, oldSpec);
  const now = target(to, newSpec);
  if (was === null || now === null) return oldSpec === newSpec;
  const key = strip(was);
  const expected = table.get(key) ?? key;
  const got = strip(now);
  return got === expected || `${got}/index` === expected;
}
