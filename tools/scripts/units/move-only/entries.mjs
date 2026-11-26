// One verdict per changed path of a move: a pure rename, a file whose code differs only in its
// path strings, an added export-only index.ts, a kit `exports` entry for one, or a baseline whose
// paths followed their files.
import { compareFile } from '../../ci-checks/comment-only/compare.mjs';
import { readAt } from '../../ci-checks/comment-only/git.mjs';
import { CODE } from '../../ci-checks/comment-only/patterns.mjs';
import { addedFailure } from './barrel.mjs';
import { jsonFailure, PATH_JSON } from './json.mjs';
import { KIT_PACKAGE, kitExportsFailure } from './kit-exports.mjs';
import { pairRenames } from './pairs.mjs';
import { maskSpecifiers } from './specifiers.mjs';

const KIND = {
  A: 'added',
  D: 'deleted',
  C: 'copied',
  T: 'type changed',
  R: 'renamed and changed',
  M: 'modified',
};

function codeFailure(e, ctx) {
  const [base, head] = [
    readAt(ctx.git, ctx.base, e.from ?? e.path),
    readAt(ctx.git, 'HEAD', e.path),
  ];
  const file = e.path;
  return compareFile({ file, base: maskSpecifiers(base, file), head: maskSpecifiers(head, file) });
}

const baselineFailure = (e, ctx) =>
  jsonFailure({
    file: e.path,
    base: readAt(ctx.git, ctx.base, e.path),
    head: readAt(ctx.git, 'HEAD', e.path),
    renames: ctx.renames,
  });

const kitFailure = (e, ctx) =>
  kitExportsFailure({
    file: e.path,
    base: readAt(ctx.git, ctx.base, e.path),
    head: readAt(ctx.git, 'HEAD', e.path),
    added: ctx.added,
    renames: ctx.renames,
  });

const isCode = (e) => CODE.test(e.path) && CODE.test(e.from ?? e.path);

const TEST = /\.(?:test|spec)\.[mc]?[jt]sx?$/;
const lostTest = (e) => e.from !== undefined && TEST.test(e.from) && !TEST.test(e.path);

/** The first rule whose `when` holds decides; a path no rule takes fails with its kind. */
const RULES = [
  { when: lostTest, check: (e) => `no longer a test (was ${e.from})` },
  { when: (e) => e.status === 'R100', check: () => null },
  { when: (e) => /^[RM]/.test(e.status) && isCode(e), check: codeFailure },
  { when: (e) => e.status === 'M' && PATH_JSON.test(e.path), check: baselineFailure },
  { when: (e) => e.status === 'M' && KIT_PACKAGE.test(e.path), check: kitFailure },
  {
    when: (e) => e.status === 'A',
    check: (e, ctx) => addedFailure(e.path, readAt(ctx.git, 'HEAD', e.path)),
  },
];

function entryFailure(e, ctx) {
  const rule = RULES.find(({ when }) => when(e));
  const found =
    rule === undefined ? `${KIND[e.status[0]] ?? e.status}, not a move` : rule.check(e, ctx);
  return found === null ? null : `${e.path}: ${found}`;
}

/** One message per changed path a move may not hold; `ctx`: `{ git, base, entries }`. */
export function moveFailures({ git, base, entries: listed }) {
  const entries = pairRenames(
    listed,
    (path) => readAt(git, base, path),
    (path) => readAt(git, 'HEAD', path),
  );
  const renames = entries.filter((e) => e.from !== undefined).map((e) => [e.from, e.path]);
  const added = new Set(entries.filter((e) => e.status === 'A').map((e) => e.path));
  const ctx = { git, base, renames, added };
  return entries.map((e) => entryFailure(e, ctx)).filter((f) => f !== null);
}
