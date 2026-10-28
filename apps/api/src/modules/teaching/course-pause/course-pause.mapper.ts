import type { CoursePauseView } from '@ab/shared';
import { z } from 'zod';

/** A course_pauses row as read, with who paused it (profiles.full_name). */
export type PauseRow = {
  id: string;
  student_id: string;
  from_date: string;
  until_date: string | null;
  reason: string | null;
  created_at: string;
  resumed_at: string | null;
  extended_days: number | null;
  creator: { full_name: string | null } | null;
};

export const toPauseView = (r: PauseRow): CoursePauseView => ({
  id: r.id,
  from_date: r.from_date,
  until_date: r.until_date,
  reason: r.reason,
  created_at: r.created_at,
  created_by_name: r.creator?.full_name ?? null,
  resumed_at: r.resumed_at,
  extended_days: r.extended_days,
});

const ids = z.array(z.string()).default([]);

/** What course_pause_start / _set_until / _resume answer (migration 951); absent lists are empty. */
export const rpcOutSchema = z.object({
  id: z.string(),
  student_id: z.string(),
  cancelled: ids,
  left: ids,
  reopened: ids,
  rejoined: ids,
  rule_ids: ids,
  resumed: z.boolean().optional(),
  started: z.boolean().optional(),
  days: z.number().int().nullable().optional(),
});
export type RpcOut = z.infer<typeof rpcOutSchema>;

/** The lessons whose charge or attendance changed (LessonEvents: the balance alerts re-read them). */
export const changedLessons = (out: RpcOut): string[] => [...new Set([...out.cancelled, ...out.left, ...out.reopened, ...out.rejoined])];
