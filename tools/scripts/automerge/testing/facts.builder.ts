import type { Facts } from '../facts.schemas.ts';

export const HEAD = 'a'.repeat(40);
export const DEVELOP = 'd'.repeat(40);

type Pr = Facts['pr'];
type Run = Facts['checks'][number];

export const aRun = (name: string, over: Partial<Run> = {}): Run => ({
  name,
  status: 'completed',
  conclusion: 'success',
  ...over,
});

const aPr = (): Pr => ({
  number: 7,
  title: 'Cut shared from db',
  body: 'Summary\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)',
  isDraft: false,
  isCrossRepository: false,
  baseRefName: 'develop',
  headRefName: 'cut/shared-db',
  headRefOid: HEAD,
  mergeable: 'MERGEABLE',
  labels: [{ name: 'auto-merge' }],
});

/** A PR that merges: lane branch, label, green check and guards, fresh base. */
export function aFacts(): Facts {
  return {
    pr: aPr(),
    checks: [aRun('check'), aRun('guards'), aRun('e2e (1)', { conclusion: 'skipped' })],
    statuses: [],
    annotations: [],
    files: [{ filename: 'packages/shared/src/a.ts' }],
    compare: { base_commit: { sha: DEVELOP }, merge_base_commit: { sha: DEVELOP } },
    comments: [],
  };
}

/** `aFacts()` with the PR fields replaced. */
export const withPr = (over: Partial<Pr>): Facts => {
  const facts = aFacts();
  return { ...facts, pr: { ...facts.pr, ...over } };
};
