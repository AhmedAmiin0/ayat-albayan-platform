import type { ChangedFile, Facts, IssueEvent } from './facts.schemas.ts';

/** Set after a review of the head; a later push needs a new review. */
export const REVIEWED = 'reviewed';

/** Deploys, migrations, the package layer table and these merge rules: the owner merges them. */
export const OWNER_ONLY: readonly string[] = [
  '.github/workflows/deploy-staging.yml',
  '.github/workflows/db-migrate.yml',
  '.github/workflows/lane-automerge.yml',
  'refactor/guards/packages.json',
  'tools/scripts/automerge/',
  'tools/scripts/ci-checks/lane-automerge.test.mjs',
];
const OWNER_BRANCHES: readonly string[] = ['ci/lane-automerge'];

const paths = (f: ChangedFile): string[] => [f.filename, f.previous_filename ?? ''];
const gated = (path: string): boolean => OWNER_ONLY.some((p) => path !== '' && path.startsWith(p));
const touchesGated = (f: Facts): boolean => f.files.some((file) => paths(file).some(gated));

/** NaN when there is no time, so every comparison with it is false. */
const latest = (ms: readonly number[]): number => (ms.length === 0 ? Number.NaN : Math.max(...ms));
const earliest = (ms: readonly number[]): number =>
  ms.length === 0 ? Number.NaN : Math.min(...ms);
const newest = (events: readonly IssueEvent[], match: (e: IssueEvent) => boolean): number =>
  latest(events.filter(match).map((e) => Date.parse(e.created_at)));
const reviewedAt = (f: Facts): number =>
  newest(f.events, (e) => e.event === 'labeled' && e.label === REVIEWED);
const forcedAt = (f: Facts): number =>
  newest(f.events, (e) => e.event === 'head_ref_force_pushed');
/** The first suite on the head: when GitHub saw it pushed. */
const headAt = (f: Facts): number => earliest(f.suites.map((s) => Date.parse(s.created_at)));

interface Gate {
  fails: (f: Facts) => boolean;
  reason: string;
}

const OWNER_GATES: readonly Gate[] = [
  { fails: (f) => OWNER_BRANCHES.includes(f.pr.headRefName), reason: 'the owner merges it' },
  { fails: touchesGated, reason: 'changes a file the owner merges' },
];

const GATES: readonly Gate[] = [
  { fails: (f) => !f.pr.labels.some((l) => l.name === REVIEWED), reason: 'not reviewed' },
  ...OWNER_GATES,
  { fails: (f) => !(reviewedAt(f) > headAt(f)), reason: 'head is newer than the review' },
  { fails: (f) => forcedAt(f) >= reviewedAt(f), reason: 'force-pushed after the review' },
];

/** Why a non-lane PR may not merge on its review, or null when it may. */
export function notReviewed(f: Facts): string | null {
  return GATES.find((g) => g.fails(f))?.reason ?? null;
}

/** Why only the owner may merge this PR, whatever its labels say, or null. */
export function ownerMerges(f: Facts): string | null {
  return OWNER_GATES.find((g) => g.fails(f))?.reason ?? null;
}
