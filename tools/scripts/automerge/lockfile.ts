import type { Behind, ChangedFile, Comment } from './facts.schemas.ts';

/** What pnpm resolves from: a change to any of them can change the lockfile. */
const LOCK_INPUTS = new Set([
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  '.npmrc',
  '.pnpmfile.cjs',
]);
const marker = (head: string): string => `<!-- lane-automerge:stale ${head} -->`;

const isLockInput = (path: string): boolean =>
  path.startsWith('patches/') || LOCK_INPUTS.has(path.slice(path.lastIndexOf('/') + 1));

export const touchesLock = (files: readonly ChangedFile[]): boolean =>
  files.some((f) => isLockInput(f.filename));

/**
 * Two lockfile changes never merge without knowing each other: a lockfile PR is stale once
 * develop, since the PR's merge base, changed a lockfile input too, or cannot say what changed.
 */
export const staleLockBase = (files: readonly ChangedFile[], behind: Behind): boolean =>
  touchesLock(files) && (!behind.known || touchesLock(behind.files));

export const staleComment = (head: string): string =>
  `needs update from develop\n\n${marker(head)}`;

export const alreadyAsked = (comments: readonly Comment[], head: string): boolean =>
  comments.some((c) => c.body.includes(marker(head)));
