import type { Pull, Run, Self, YieldFacts } from './yield.schemas.ts';
import type { Verdict } from './yield.types.ts';

/** The label lane-automerge reads too (automerge/priority.ts); kept apart so ci needs no import. */
const PRIORITY = 'priority';
/** A merge by lane-automerge dispatches ci on develop instead of pushing. */
const DEVELOP_EVENTS = new Set(['push', 'workflow_dispatch']);

const flagged = (p: Pull): boolean => p.labels.includes(PRIORITY);
const ofDevelop = (r: Run): boolean => r.head_branch === 'develop' && DEVELOP_EVENTS.has(r.event);
/** A run of a flagged PR's branch in this repository: its PR run, or ci dispatched on it. */
const flaggedPull = (r: Run, f: YieldFacts, self: Self): Pull | undefined =>
  f.pulls.find(
    (p) =>
      flagged(p) &&
      p.repo === self.repo &&
      p.head === r.head_branch &&
      r.head_repository === self.repo,
  );

/** Whether this non-priority PR run should keep waiting, and for whom. */
export function verdict(f: YieldFacts, self: Self): Verdict {
  const own = f.pulls.find((p) => p.number === self.pr);
  if (own !== undefined && flagged(own)) return { wait: false, reason: 'this PR is priority now' };
  const others = f.runs.filter((r) => r.id !== self.run);
  const develop = others.some(ofDevelop);
  const ahead = others.map((r) => flaggedPull(r, f, self)).find((p) => p !== undefined);
  const reasons = [develop ? 'develop' : '', ahead ? `#${ahead.number} (${ahead.head})` : ''];
  const named = reasons.filter((r) => r !== '');
  return named.length === 0
    ? { wait: false, reason: 'no priority run ahead' }
    : { wait: true, reason: `waiting for ${named.join(', ')}` };
}
