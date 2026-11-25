// A fold of a kit adds one `exports` entry per folder the apps import by deep path (docs/63 §4).
// Such an entry may only point at an index.ts the move added; addedFailure proves it re-exports.
import { isDeepStrictEqual } from 'node:util';
import { z } from 'zod';
import { parseJson } from '../../ci-checks/lint/json-file.mjs';

export const KIT_PACKAGE = /^packages\/[^/]+-kit\/package\.json$/;

const manifest = z.looseObject({ exports: z.record(z.string(), z.json()).optional() });

const followed = (value, pairs) =>
  typeof value === 'string' ? (pairs.find(([from]) => from === value)?.[1] ?? value) : value;

const relativePairs = (dir, renames) =>
  renames
    .filter(([from, to]) => from.startsWith(dir) && to.startsWith(dir))
    .map(([from, to]) => [`./${from.slice(dir.length)}`, `./${to.slice(dir.length)}`]);

const isAddedIndex = (value, dir, added) =>
  typeof value === 'string' && /\/index\.ts$/.test(value) && added.has(dir + value.slice(2));

/** Why the kit manifest `head` is more than `base` plus entries for added index files, or null. */
export function kitExportsFailure({ file, base, head, added, renames }) {
  const [b, h] = [parseJson(base, manifest), parseJson(head, manifest)];
  const { exports: bx = {}, ...bRest } = b;
  const { exports: hx = {}, ...hRest } = h;
  if (!isDeepStrictEqual(bRest, hRest)) return 'changed outside exports (a move adds entries only)';
  const dir = file.replace(/package\.json$/, '');
  const pairs = relativePairs(dir, renames);
  const lost = Object.keys(bx).find((k) => !isDeepStrictEqual(followed(bx[k], pairs), hx[k]));
  const extra = Object.keys(hx).find(
    (k) => !Object.hasOwn(bx, k) && !isAddedIndex(hx[k], dir, added),
  );
  const bad = lost ?? extra;
  return bad === undefined ? null : `exports ${JSON.stringify(bad)} is not a move's entry`;
}
