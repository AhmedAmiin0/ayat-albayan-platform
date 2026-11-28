import { z } from 'zod';

const sha = z.string().regex(/^[0-9a-f]{40}$/);

/** `gh pr view --json` with the fields the merge rules read. */
export const prSchema = z.object({
  number: z.number().int().positive(),
  title: z.string(),
  body: z.string(),
  isDraft: z.boolean(),
  isCrossRepository: z.boolean(),
  baseRefName: z.string(),
  headRefName: z.string(),
  headRefOid: sha,
  mergeable: z.string(),
  labels: z.array(z.object({ name: z.string() })),
});

export const checkRunSchema = z.object({
  name: z.string(),
  status: z.string(),
  conclusion: z.string().nullable(),
});

export const statusSchema = z.object({
  context: z.string(),
  state: z.enum(['error', 'failure', 'pending', 'success']),
});

export const annotationSchema = z.object({
  title: z.string().nullable(),
  message: z.string().nullable(),
});

/** A rename carries the old path too: moving a gated file away still changes it. */
export const fileSchema = z.object({
  filename: z.string(),
  previous_filename: z.string().nullish(),
});

/**
 * What develop gained since the PR's merge base, as `git diff --name-only` of the two trees.
 * `known` is false when the workflow could not read it.
 */
export const behindSchema = z.object({ known: z.boolean(), files: z.array(fileSchema) });

export const commentSchema = z.object({ body: z.string() });

/** `issues/<n>/events`, only `labeled` and `head_ref_force_pushed`; GitHub's clock, not git's. */
export const eventSchema = z.object({
  event: z.string(),
  label: z.string().nullable(),
  created_at: z.iso.datetime(),
});

/** `commits/<head>/check-suites`: created when the head was pushed (a re-run adds none). */
export const suiteSchema = z.object({ created_at: z.iso.datetime() });

export const factsSchema = z.object({
  pr: prSchema,
  checks: z.array(checkRunSchema),
  statuses: z.array(statusSchema),
  annotations: z.array(annotationSchema),
  files: z.array(fileSchema),
  behind: behindSchema,
  comments: z.array(commentSchema),
  events: z.array(eventSchema),
  suites: z.array(suiteSchema),
});

export type Facts = z.infer<typeof factsSchema>;
export type Pr = z.infer<typeof prSchema>;
export type CheckRun = z.infer<typeof checkRunSchema>;
export type CommitStatus = z.infer<typeof statusSchema>;
export type Annotation = z.infer<typeof annotationSchema>;
export type ChangedFile = z.infer<typeof fileSchema>;
export type Behind = z.infer<typeof behindSchema>;
export type Comment = z.infer<typeof commentSchema>;
export type IssueEvent = z.infer<typeof eventSchema>;
export type Suite = z.infer<typeof suiteSchema>;

/** The combined commit status (`commits/<sha>/status`); its own `state` is pending with none. */
export const combinedStatusSchema = z.object({ statuses: z.array(statusSchema) });

/** `gh pr list --json number,labels`: the open PRs that may merge themselves. */
export const listedSchema = z.array(prSchema.pick({ number: true, labels: true }));
export type Listed = z.infer<typeof listedSchema>;
