// The file-level rule: a comment sweep only modifies code files (and may shrink lint baselines).
import { z } from 'zod';
import { CODE, FORBIDDEN, SUPPRESSIONS } from './patterns.mjs';

const status = z.string().regex(/^[ACDMRTUX]\d{0,3}$/);
const line = z.union([
  z.tuple([status, z.string().min(1)]),
  z.tuple([status, z.string().min(1), z.string().min(1)]),
]);

/** Parses `git diff --name-status -M` output; a rename or copy keeps its old path in `from`. */
export function parseNameStatus(out) {
  return out
    .split('\n')
    .filter(Boolean)
    .map((raw) => {
      const [code, a, b] = line.parse(raw.split('\t'));
      return b === undefined ? { status: code, path: a } : { status: code, path: b, from: a };
    });
}

const KIND = { A: 'added', D: 'deleted', R: 'renamed', C: 'copied', T: 'type changed' };

const allowed = (path) => CODE.test(path) || SUPPRESSIONS.test(path);

/** The first reason `entry` cannot be part of a comment-only change, or null. */
function failure({ status: code, path, from }) {
  const kind = KIND[code[0]] ?? (code === 'M' ? null : `status ${code}`);
  const forbidden = FORBIDDEN.find(({ test }) => test.test(path));
  const reasons = [
    kind === null ? null : `${kind}${from === undefined ? '' : ` from ${from}`}`,
    forbidden === undefined ? null : `${forbidden.why} is never part of a comment sweep`,
    allowed(path) ? null : 'not a .ts/.tsx/.js/.mjs/.cjs or suppressions file',
  ];
  const reason = reasons.find((r) => r !== null);
  return reason === undefined ? null : `${path}: ${reason}`;
}

/** One message per entry that a comment-only change may not hold. */
export const fileFailures = (entries) => entries.map(failure).filter((f) => f !== null);
