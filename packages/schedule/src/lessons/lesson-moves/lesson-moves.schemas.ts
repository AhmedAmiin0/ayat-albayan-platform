import { z } from 'zod';
import { lessonViewListSchema } from '../lesson-view';

/** POST /schedule-rules/:id/cancel: the ended rule and the lessons it cancelled. */
export const ruleCancelResultSchema = z.object({
  rule_id: z.uuid(),
  cancelled: lessonViewListSchema,
});
export type RuleCancelResult = z.infer<typeof ruleCancelResultSchema>;
