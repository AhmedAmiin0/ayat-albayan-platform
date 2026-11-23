// guard:move-only on a `move/imports-*` branch (docs/32 R12): an import rewrite such as
// `pnpm imports:absolute`. Each changed file keeps its code once its module sources are emptied;
// a suppression or guard baseline may only shrink. No file is added, removed or renamed.
import { compareFile } from '../../ci-checks/comment-only/compare.mjs';
import { readAt } from '../../ci-checks/comment-only/git.mjs';
import { CODE } from '../../ci-checks/comment-only/patterns.mjs';
import { jsonFailure, PATH_JSON } from './json.mjs';
import { maskSources } from './specifiers.mjs';

const sides = (e, ctx) => [readAt(ctx.git, ctx.base, e.path), readAt(ctx.git, 'HEAD', e.path)];

function codeFailure(e, ctx) {
  const [base, head] = sides(e, ctx);
  return compareFile({ file: e.path, base: maskSources(base, e.path), head: maskSources(head, e.path) });
}

function baselineFailure(e, ctx) {
  const [base, head] = sides(e, ctx);
  return jsonFailure({ file: e.path, base, head, renames: [] });
}

const modified = (e) => e.status === 'M';
const RULES = [
  { when: (e) => modified(e) && CODE.test(e.path), check: codeFailure },
  { when: (e) => modified(e) && PATH_JSON.test(e.path), check: baselineFailure },
];

const KIND = { A: 'added', D: 'deleted', R: 'renamed', C: 'copied', T: 'type changed' };

function entryFailure(e, ctx) {
  const rule = RULES.find(({ when }) => when(e));
  const kind = KIND[e.status[0]] ?? 'changed';
  const found = rule === undefined ? `${kind}, not an import rewrite` : rule.check(e, ctx);
  return found === null ? null : `${e.path}: ${found}`;
}

/** One message per changed path an import rewrite may not hold. */
export function importFailures({ git, base, entries }) {
  const ctx = { git, base };
  return entries.map((e) => entryFailure(e, ctx)).filter((f) => f !== null);
}
