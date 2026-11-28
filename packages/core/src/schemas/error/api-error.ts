import { z } from 'zod';

const limitSchema = z.union([z.number(), z.bigint().transform(Number)]);
const valueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.bigint().transform(String),
]);

/**
 * One validation issue: the path and message every client reads, plus zod's issue code and the
 * limits that code carries, so a client words a server issue like one it caught itself (docs/67).
 * Anything else zod adds, the input above all, is dropped.
 */
export const apiIssueSchema = z.object({
  path: z.string(),
  message: z.string(),
  code: z.string().optional(),
  minimum: limitSchema.optional(),
  maximum: limitSchema.optional(),
  inclusive: z.boolean().optional(),
  origin: z.string().optional(),
  format: z.string().optional(),
  expected: z.string().optional(),
  values: z.array(valueSchema).optional(),
  keys: z.array(z.string()).optional(),
});
export type ApiIssue = z.infer<typeof apiIssueSchema>;

/**
 * Every error answer: a `code` clients switch on, `message` for builds that still read it, the
 * issues of a `validation_failed`, and any details a domain error adds (docs/62 part 1 §3.2).
 */
export const apiErrorSchema = z.looseObject({
  code: z.string(),
  message: z.string().optional(),
  issues: z.array(apiIssueSchema).optional(),
});
export type ApiErrorBody = z.infer<typeof apiErrorSchema>;
