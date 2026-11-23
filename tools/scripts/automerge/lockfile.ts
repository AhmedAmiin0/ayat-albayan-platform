import type { ChangedFile, Comment, Compare } from './facts.schemas.ts';

const LOCK = /(^|\/)(package\.json|pnpm-lock\.yaml)$/;
const marker = (head: string): string => `<!-- lane-automerge:stale ${head} -->`;

export const touchesLock = (files: readonly ChangedFile[]): boolean =>
  files.some((f) => LOCK.test(f.filename));

/** Two lockfile PRs never merge on stale bases: such a PR must sit on the develop head. */
export const staleLockBase = (files: readonly ChangedFile[], compare: Compare): boolean =>
  touchesLock(files) && compare.merge_base_commit.sha !== compare.base_commit.sha;

export const staleComment = (head: string): string =>
  `needs update from develop\n\n${marker(head)}`;

export const alreadyAsked = (comments: readonly Comment[], head: string): boolean =>
  comments.some((c) => c.body.includes(marker(head)));
