import { z } from 'zod';

const issueSchema = z.object({ path: z.string(), message: z.string() });

/**
 * Every error answer: a `code` clients switch on, `message` for builds that still read it, the
 * issues of a `validation_failed`, and any details a domain error adds (docs/62 part 1 §3.2).
 */
export const apiErrorSchema = z.looseObject({
  code: z.string(),
  message: z.string().optional(),
  issues: z.array(issueSchema).optional(),
});
export type ApiErrorBody = z.infer<typeof apiErrorSchema>;
