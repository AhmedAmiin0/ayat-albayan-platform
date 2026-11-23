// CLI and environment: the head branch (`--branch` locally, GITHUB_HEAD_REF on a PR) and the
// base checkout CI prepares (GUARD_BASE).
import { z } from 'zod';
import { BRANCH } from './patterns.mjs';

const flags = z.union([z.tuple([]), z.tuple([z.literal('--branch'), z.string().min(1)])]);

const env = z.object({
  GITHUB_HEAD_REF: z.string().optional(),
  GUARD_BASE: z
    .string()
    .optional()
    .transform((dir) => (dir === '' ? undefined : dir)),
});

export function parseArgs(argv, environment) {
  const [, flagged] = flags.parse(argv.filter((arg) => arg !== '--'));
  const { GITHUB_HEAD_REF, GUARD_BASE } = env.parse(environment);
  return { branch: flagged ?? GITHUB_HEAD_REF ?? '', guardBase: GUARD_BASE };
}

export const isCommentBranch = (branch) => BRANCH.test(branch);
