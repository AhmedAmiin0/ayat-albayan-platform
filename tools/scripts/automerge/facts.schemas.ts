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

export const fileSchema = z.object({ filename: z.string() });

/** `compare/develop...<head>`: base_commit is the develop head. */
export const compareSchema = z.object({
  base_commit: z.object({ sha }),
  merge_base_commit: z.object({ sha }),
});

export const commentSchema = z.object({ body: z.string() });

export const factsSchema = z.object({
  pr: prSchema,
  checks: z.array(checkRunSchema),
  statuses: z.array(statusSchema),
  annotations: z.array(annotationSchema),
  files: z.array(fileSchema),
  compare: compareSchema,
  comments: z.array(commentSchema),
});

export type Facts = z.infer<typeof factsSchema>;
export type Pr = z.infer<typeof prSchema>;
export type CheckRun = z.infer<typeof checkRunSchema>;
export type CommitStatus = z.infer<typeof statusSchema>;
export type Annotation = z.infer<typeof annotationSchema>;
export type ChangedFile = z.infer<typeof fileSchema>;
export type Compare = z.infer<typeof compareSchema>;
export type Comment = z.infer<typeof commentSchema>;

/** The combined commit status (`commits/<sha>/status`); its own `state` is pending with none. */
export const combinedStatusSchema = z.object({ statuses: z.array(statusSchema) });
