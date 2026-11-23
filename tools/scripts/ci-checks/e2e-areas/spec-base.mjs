// Where an import specifier starts in the repo, for the e2e import graph (graph.mjs).
import { readFileSync } from 'node:fs';
import { posix } from 'node:path';

const KIT = '@ab/web-kit/';
const KIT_DIR = 'packages/web-kit';
const KIT_JSON = new URL(`../../../../${KIT_DIR}/package.json`, import.meta.url);
// ci «changes» runs the selection with no `pnpm i` (no-install.test.mjs): node built-ins only.
/** @type {Record<string, string>} */
const kitExports = JSON.parse(readFileSync(KIT_JSON, 'utf8')).exports ?? {};

const srcOf = (from) => /^(?:apps|packages)\/[^/]+\/src\//.exec(from)?.[0];
const appOf = (from) => /^apps\/[^/]+\/src\//.exec(from)?.[0];

const own = (from, spec) => {
  const src = srcOf(from);
  return spec.startsWith('#/') && src ? posix.join(src, spec.slice(2)) : null;
};
const appAlias = (from, spec) => {
  const app = appOf(from);
  return spec.startsWith('@/') && app ? posix.join(app, spec.slice(2)) : null;
};
const kitEntry = (_from, spec) => {
  if (!spec.startsWith(KIT)) return null;
  const entry = kitExports[`./${spec.slice(KIT.length)}`];
  return entry === undefined
    ? posix.join(KIT_DIR, 'src', spec.slice(KIT.length))
    : posix.join(KIT_DIR, entry);
};
const relative = (from, spec) =>
  spec.startsWith('.') ? posix.join(posix.dirname(from), spec) : null;

/**
 * `#/x` → the importing workspace's src/x (package.json `imports`, docs/32 R12); `@/x` → the
 * importing app's src/x (tsconfig `paths`, until the app moves to `#/`); `@ab/web-kit/<entry>`
 * → the file the kit's package.json `exports` names (a deep path: the kit's source, until
 * staff-web moves); `./x` → beside the importer; else null (a package, an asset).
 */
export const baseOf = (from, spec) =>
  [own, appAlias, kitEntry, relative].reduce((found, rule) => found ?? rule(from, spec), null);
