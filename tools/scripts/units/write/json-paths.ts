import { posix } from 'node:path';
import type { Move } from '../plan/plan.types.ts';

const SUPPRESSIONS = /(?:^|\/)(?:eslint|oxlint)-suppressions\.json$/;
const GUARDS = /^refactor\/guards\/[^/]+\.json$/;

/** JSON baselines keyed or listed by file path; a move renames their paths, never their counts. */
export const isPathJson = (file: string): boolean => SUPPRESSIONS.test(file) || GUARDS.test(file);

/** Suppression keys are relative to their package (docs/31b §4); guard lists use repo paths. */
const baseOf = (file: string): string => (SUPPRESSIONS.test(file) ? posix.dirname(file) : '.');

function relativePairs(file: string, moves: readonly Move[]): [string, string][] {
  const base = baseOf(file);
  const pre = base === '.' ? '' : `${base}/`;
  return moves
    .filter((m) => m.from.startsWith(pre) && m.to.startsWith(pre))
    .map((m) => [m.from.slice(pre.length), m.to.slice(pre.length)]);
}

const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The file's text with each moved path renamed where it is a whole JSON string or the head of one
 * (`"<path> exports X"` in refactor/guards/knip.json). Text, not a re-serialised object: the
 * layout and every count stay byte for byte.
 */
export function renameJsonText(file: string, text: string, moves: readonly Move[]): string {
  return relativePairs(file, moves).reduce(
    (acc, [from, to]) => acc.replace(new RegExp(`"${escape(from)}(?=["\\s])`, 'g'), `"${to}`),
    text,
  );
}
