import { instant, pageOf } from '@ab/core';
import { z } from 'zod';

/** One row of GET /activity (v_activity_log, R-NFR-08). */
export const activityViewSchema = z.object({
  id: z.string(),
  at: instant,
  actor_id: z.string().nullable(),
  actor_name: z.string().nullable(),
  actor_role: z.string(),
  action: z.string(),
  method: z.string(),
  route: z.string(),
  entity: z.string().nullable(),
  entity_id: z.string().nullable(),
  status: z.int(),
  duration_ms: z.int().nonnegative(),
  meta: z.record(z.string(), z.unknown()),
});
export type ActivityView = z.infer<typeof activityViewSchema>;

export const activityPageSchema = pageOf(activityViewSchema);
export type ActivityPage = z.infer<typeof activityPageSchema>;
