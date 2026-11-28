import { z } from 'zod';

/** `actions/workflows/ci.yml/runs?status=queued|in_progress`, one row per run. */
export const runSchema = z.object({
  id: z.number().int(),
  event: z.string(),
  head_branch: z.string().nullable(),
  head_repository: z.string().nullable(),
});

/** `pulls?state=open`, with the head repository and label names flattened. */
export const pullSchema = z.object({
  number: z.number().int().positive(),
  head: z.string(),
  repo: z.string().nullable(),
  labels: z.array(z.string()),
});

export const yieldFactsSchema = z.object({ runs: z.array(runSchema), pulls: z.array(pullSchema) });

/** Who is asking: this ci run, its PR and the repository, from the job's environment. */
export const selfSchema = z
  .object({
    RUN_ID: z.coerce.number().int(),
    PR: z.coerce.number().int().positive(),
    REPO: z.string(),
  })
  .transform(({ RUN_ID, PR, REPO }) => ({ run: RUN_ID, pr: PR, repo: REPO }));

export type Run = z.infer<typeof runSchema>;
export type Pull = z.infer<typeof pullSchema>;
export type YieldFacts = z.infer<typeof yieldFactsSchema>;
export type Self = z.output<typeof selfSchema>;
