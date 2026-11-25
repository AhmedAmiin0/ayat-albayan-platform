// The baselines a move may change: suppression keys and guard paths follow their renamed files,
// counts stay or shrink (lint may need a prune once a `../` import became `@/`), nothing new.
import { isDeepStrictEqual } from 'node:util';
import { z } from 'zod';
import { parseJson } from '../../ci-checks/lint/json-file.mjs';

const SUPPRESSIONS = /(?:^|\/)oxlint-suppressions\.json$/;
const CAP = /^refactor\/folder-cap\/[^/]+\.json$/;
export const PATH_JSON = new RegExp(
  `${SUPPRESSIONS.source}|^refactor\\/guards\\/(?!packages\\.json$)[^/]+\\.json$|${CAP.source}`,
);

/** tools/scripts/ci-checks/folder-cap.mjs: a fold may add sub-folders up to the cap. */
const CAP_DIRS = 12;

function relativePairs(file, renames) {
  const base = SUPPRESSIONS.test(file) ? file.replace(/[^/]*$/, '') : '';
  return renames
    .filter(([from, to]) => from.startsWith(base) && to.startsWith(base))
    .map(([from, to]) => [from.slice(base.length), to.slice(base.length)]);
}

const renamed = (s, pairs) =>
  pairs.reduce(
    (acc, [from, to]) =>
      acc === from || acc.startsWith(`${from} `) ? to + acc.slice(from.length) : acc,
    s,
  );

const typeName = (v) => (v === null ? 'null' : typeof v);
const kindOf = (v) => (Array.isArray(v) ? 'array' : typeName(v));

const MAP = {
  array: (v, pairs) => v.map((x) => mapped(x, pairs)),
  object: (v, pairs) =>
    Object.fromEntries(Object.entries(v).map(([k, x]) => [renamed(k, pairs), mapped(x, pairs)])),
  string: (v, pairs) => renamed(v, pairs),
};

/** The base with its paths renamed as the move renamed its files. */
const mapped = (v, pairs) => (MAP[kindOf(v)] ?? ((x) => x))(v, pairs);

const WITHIN = {
  array: (b, h) => kindOf(b) === 'array' && h.every((x) => b.some((y) => isDeepStrictEqual(x, y))),
  object: (b, h, at) =>
    kindOf(b) === 'object' &&
    Object.entries(h).every(([k, v]) => Object.hasOwn(b, k) && within(b[k], v, { ...at, key: k })),
  number: (b, h, at) => h <= b || (at.cap && at.key === 'dirs' && h <= CAP_DIRS),
};

/** True when `head` holds nothing `base` does not (counts may shrink). */
const within = (b, h, at) => (WITHIN[kindOf(h)] ?? isDeepStrictEqual)(b, h, at);

const firstNew = (base, head, at) =>
  kindOf(head) === 'array'
    ? head.find((x) => !within(base, [x], at))
    : Object.keys(head).find((k) => !within(base, { [k]: head[k] }, at));

/** Why `head` is more than `base` with its paths renamed, or null. */
export function jsonFailure({ file, base, head, renames }) {
  const [b, h] = [parseJson(base, z.json()), parseJson(head, z.json())];
  const at = { cap: CAP.test(file), key: '' };
  const m = mapped(b, relativePairs(file, renames));
  if (within(m, h, at)) return null;
  return `${JSON.stringify(firstNew(m, h, at) ?? '(value)')} is new or grew (a move only renames paths)`;
}
