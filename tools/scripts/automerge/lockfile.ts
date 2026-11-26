import type { Behind, ChangedFile, Comment } from './facts.schemas.ts';

/** What pnpm resolves from: a change to any of them can change the lockfile. */
const LOCK_INPUTS = new Set([
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  '.npmrc',
  '.pnpmfile.cjs',
  '.pnpmfile.mjs',
]);
const marker = (head: string): string => `<!-- lane-automerge:stale ${head} -->`;

const isLockInput = (path: string): boolean =>
  path.startsWith('patches/') || LOCK_INPUTS.has(path.slice(path.lastIndexOf('/') + 1));

/** A rename carries the old path too: moving an input away still changes it. */
export const touchesLock = (files: readonly ChangedFile[]): boolean =>
  files.some((f) => [f.filename, f.previous_filename ?? ''].some(isLockInput));

/**
 * Two lockfile changes never merge without knowing each other: a lockfile PR is stale once
 * develop, since the PR's merge base, changed a lockfile input too.
 */
export const staleLockBase = (files: readonly ChangedFile[], behind: Behind): boolean =>
  touchesLock(files) && touchesLock(behind.files);

/** What develop changed could not be read: a lockfile PR waits for a run that can read it. */
export const unknownLockBase = (files: readonly ChangedFile[], behind: Behind): boolean =>
  touchesLock(files) && !behind.known;

export const staleComment = (head: string): string =>
  `needs update from develop\n\n${marker(head)}`;

export const alreadyAsked = (comments: readonly Comment[], head: string): boolean =>
  comments.some((c) => c.body.includes(marker(head)));
