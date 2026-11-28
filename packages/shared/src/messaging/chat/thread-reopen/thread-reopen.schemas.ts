import { z } from 'zod';
import { REOPEN_TEMPLATE_OUTCOMES } from './thread-reopen';

export const reopenTemplateOutcomeSchema = z.enum(REOPEN_TEMPLATE_OUTCOMES);
export type ReopenTemplateOutcome = z.infer<typeof reopenTemplateOutcomeSchema>;

/** POST /threads/:phone/reopen's answer, for app builds that still call it on open. */
export const threadReopenViewSchema = z.object({
  /** Always false: the hold reopens Kapso's record on send. */
  kapso_reopened: z.boolean(),
  template: reopenTemplateOutcomeSchema,
});
export type ThreadReopenView = z.infer<typeof threadReopenViewSchema>;
