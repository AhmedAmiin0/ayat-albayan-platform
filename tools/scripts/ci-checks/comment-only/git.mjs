// The git side: the base commit and the changed paths, both read through zod.
import { execFileSync } from 'node:child_process';
import { z } from 'zod';
import { parseNameStatus } from './files.mjs';

const sha = z
  .string()
  .transform((out) => out.trim())
  .pipe(z.string().regex(/^[0-9a-f]{40,64}$/));

export const gitIn = (cwd) => (...args) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });

/** CI's base checkout when there is one, else where HEAD left develop. */
const BASES = {
  checkout: (_git, dir) => gitIn(dir)('rev-parse', 'HEAD'),
  mergeBase: (git) => git('merge-base', 'origin/develop', 'HEAD'),
};

export const baseCommit = (git, guardBase) =>
  sha.parse(BASES[guardBase === undefined ? 'mergeBase' : 'checkout'](git, guardBase));

export const changes = (git, base) =>
  parseNameStatus(
    git('-c', 'core.quotepath=off', 'diff', '--no-ext-diff', '--name-status', '-M', base, 'HEAD'),
  );

export const readAt = (git, rev, path) => z.string().parse(git('show', `${rev}:${path}`));
