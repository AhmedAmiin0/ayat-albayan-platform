// Where an import specifier starts in the repo, for the e2e import graph (graph.mjs).
import { posix } from 'node:path';

const KIT = '@ab/web-kit/';
const appOf = (from) => /^apps\/[^/]+\/src\//.exec(from)?.[0];

const appAlias = (from, spec) => {
  const app = appOf(from);
  return spec.startsWith('@/') && app ? posix.join(app, spec.slice(2)) : null;
};
const kitAlias = (_from, spec) =>
  spec.startsWith(KIT) ? posix.join('packages/web-kit/src', spec.slice(KIT.length)) : null;
const relative = (from, spec) =>
  spec.startsWith('.') ? posix.join(posix.dirname(from), spec) : null;

/**
 * `@/x` → the importing app's src/x (web and api, tsconfig `paths`; docs/32 R12); `@ab/web-kit/x`
 * → the kit's source (both web apps alias it, docs/51 §2); `./x` → beside the importer; else null
 * (a package, an asset).
 */
export const baseOf = (from, spec) =>
  [appAlias, kitAlias, relative].reduce((found, rule) => found ?? rule(from, spec), null);
