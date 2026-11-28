import { coursePauseViewSchema, type CoursePauseResult, type CoursePauseView } from '@ab/shared';
import { riyadhToday } from '@ab/time';
import { z } from 'zod';
import { asResponse } from '@/common/http/returns';

/** A course_pauses row as read, with who paused it (profiles.full_name). */
export interface PauseRow {
  id: string;
  student_id: string;
  from_date: string;
  until_date: string | null;
  reason: string | null;
  created_at: string;
  resumed_at: string | null;
  extended_days: number | null;
  creator: { full_name: string | null } | null;
}

/** A write's answer: built from the row it just wrote, not checked (the write already ran). */
export const pauseViewOf = (r: PauseRow): CoursePauseView => ({
  id: r.id,
  from_date: r.from_date,
  until_date: r.until_date,
  reason: r.reason,
  created_at: r.created_at,
  created_by_name: r.creator?.full_name ?? null,
  resumed_at: r.resumed_at,
  extended_days: r.extended_days,
});

export const toPauseView = (r: PauseRow): CoursePauseView =>
  asResponse(coursePauseViewSchema, pauseViewOf(r));

const ids = z.array(z.string()).default([]);

/**
 * What course_pause_start / _set_until / _resume answer (migration 956); absent lists are empty.
 */
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

/**
 * The lessons whose charge or attendance changed (LessonEvents: the balance alerts re-read them).
 */
export const changedLessons = (out: RpcOut): string[] => [
  ...new Set([...out.cancelled, ...out.left, ...out.reopened, ...out.rejoined]),
];

/** An old package-only pause lifted: no pause row, nothing cancelled or moved. */
export const legacyResult = (subscriptionId: string): CoursePauseResult => {
  const today = riyadhToday();
  const now = new Date().toISOString();
  const pause = {
    id: subscriptionId,
    from_date: today,
    until_date: null,
    reason: null,
    created_at: now,
    created_by_name: null,
    resumed_at: now,
    extended_days: 0,
  };
  return { pause, cancelled: 0, left: 0, reopened: 0, conflicts: 0 };
};
