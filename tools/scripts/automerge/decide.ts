import type { Decision } from './automerge.types.ts';
import { widened } from './annotations.ts';
import { titleProblems } from '../ci-checks/lint/commit-header/pr-title.ts';
import { notGreen } from './checks.ts';
import { notEligible } from './eligible.ts';
import type { Facts } from './facts.schemas.ts';
import { alreadyAsked, staleLockBase } from './lockfile.ts';

const skip = (reason: string): Decision => ({ action: 'skip', reason });

/** First rule that answers wins; the order is the order of the merge conditions. */
const RULES: readonly ((f: Facts) => Decision | null)[] = [
  (f) => {
    const reason = notEligible(f);
    return reason === null ? null : skip(reason);
  },
  (f) => {
    const reason = notGreen(f);
    return reason === null ? null : skip(reason);
  },
  (f) => {
    const [problem] = titleProblems(f.pr);
    return problem === undefined ? null : skip(`title: ${problem}`);
  },
  (f) => (widened(f.annotations) ? skip('layer table widened: the owner merges it') : null),
  (f) => (f.pr.mergeable === 'MERGEABLE' ? null : skip(`mergeable is ${f.pr.mergeable}`)),
  (f) => {
    if (!staleLockBase(f.files, f.compare)) return null;
    return alreadyAsked(f.comments, f.pr.headRefOid)
      ? skip('stale lockfile base, already asked')
      : { action: 'comment', reason: 'needs update from develop' };
  },
];

export function decide(facts: Facts): Decision {
  for (const rule of RULES) {
    const decision = rule(facts);
    if (decision !== null) return decision;
  }
  return { action: 'merge', reason: 'every condition holds' };
}
