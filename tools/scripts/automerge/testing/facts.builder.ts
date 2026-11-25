import type { Facts } from '../facts.schemas.ts';

export const HEAD = 'a'.repeat(40);
export const HEAD_AT = '2026-11-23T00:00:00Z';
export const REVIEWED_AT = '2026-11-23T00:45:00Z';

type Pr = Facts['pr'];
type Run = Facts['checks'][number];
type Event = Facts['events'][number];

export const aRun = (name: string, over: Partial<Run> = {}): Run => ({
  name,
  status: 'completed',
  conclusion: 'success',
  ...over,
});

const aPr = (): Pr => ({
  number: 7,
  title: 'refactor(shared): cut shared from db',
  body: 'Summary\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)',
  isDraft: false,
  isCrossRepository: false,
  baseRefName: 'develop',
  headRefName: 'cut/shared-db',
  headRefOid: HEAD,
  mergeable: 'MERGEABLE',
  labels: [{ name: 'auto-merge' }],
});

/** A PR that merges: lane branch, label, green check and guards, nothing new on develop. */
export function aFacts(): Facts {
  return {
    pr: aPr(),
    checks: [aRun('check'), aRun('guards'), aRun('e2e (1)', { conclusion: 'skipped' })],
    statuses: [],
    annotations: [],
    files: [{ filename: 'packages/shared/src/a.ts' }],
    behind: { known: true, files: [] },
    comments: [],
    events: [],
    suites: [{ created_at: HEAD_AT }],
  };
}

/** `aFacts()` with the PR fields replaced. */
export const withPr = (over: Partial<Pr>): Facts => {
  const facts = aFacts();
  return { ...facts, pr: { ...facts.pr, ...over } };
};

export const labelled = (createdAt: string, label = 'reviewed'): Event[] => [
  { event: 'labeled', label, created_at: createdAt },
];

/** A non-lane PR reviewed after its head was pushed: merges through the reviewed path. */
export function aReviewedFacts(): Facts {
  const facts = aFacts();
  const labels = [{ name: 'auto-merge' }, { name: 'reviewed' }];
  const pr = { ...facts.pr, headRefName: 'fix/wa-lane-hold', labels };
  return { ...facts, pr, events: labelled(REVIEWED_AT) };
}
