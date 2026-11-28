import type { Facts, Pr } from './facts.schemas.ts';
import { ownerMerges } from './reviewed.ts';

/** Runs CI and merges ahead of other PRs; a green one merges itself (docs/09 «Priority»). */
export const PRIORITY = 'priority';

export const isPriority = (pr: Pick<Pr, 'labels'>): boolean =>
  pr.labels.some((l) => l.name === PRIORITY);

/** Why the flag alone does not let this PR merge, or null when it does. */
export const notPriority = (f: Facts): string | null =>
  isPriority(f.pr) ? ownerMerges(f) : 'not priority';

/** A flagged PR is brought level with develop before it merges; other PRs never are. */
export const needsUpdate = (f: Facts): boolean =>
  isPriority(f.pr) && f.behind.known && f.behind.files.length > 0;
