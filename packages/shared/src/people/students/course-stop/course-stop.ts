import { clientRequestId } from '@ab/core';
import { z } from 'zod';
import type { LessonStatus, SubscriptionStatus } from '@ab/catalog';
import { OPEN_LESSON_STATUSES, wallParts } from '@ab/schedule';
import { stopOweAskSchema, stopRefundAskSchema } from '../stop-choices';

// Stopping a course keeps the money: payments, earnings and commission stay (migrations 990, 991).

export const COURSE_STOP_REASON_MAX = 300;

/** Idempotent on clientRequestId (rule 8); `refund` and `owe` are never both given. */
export const courseStopSchema = z
  .strictObject({
    subscriptionId: z.uuid(),
    reason: z.string().trim().min(2).max(COURSE_STOP_REASON_MAX),
    clientRequestId,
    refund: stopRefundAskSchema.optional(),
    owe: stopOweAskSchema.optional(),
  })
  .refine((b) => !(b.refund && b.owe), { message: 'refund_or_owe', path: ['owe'] });
export type CourseStopRequest = z.infer<typeof courseStopSchema>;

/**
 * GET /students/:id/course-stop?subscriptionId=: the sheet's lines; absent = the current package.
 */
export const courseStopQuerySchema = z.object({ subscriptionId: z.uuid().optional() });

/** 409 already_cancelled: the package is cancelled already (unused or stopped). */
export type CourseStopBlock = 'already_cancelled';

export function courseStopBlock(sub: { status: SubscriptionStatus }): CourseStopBlock | null {
  return sub.status === 'cancelled' ? 'already_cancelled' : null;
}

/** The lessons a stop cancels: open (scheduled / confirmed) and not started at `now`. */
export function stoppedLessons<T extends { status: LessonStatus; starts_at: string }>(
  lessons: readonly T[],
  now: Date,
): T[] {
  const open: readonly LessonStatus[] = OPEN_LESSON_STATUSES;
  return lessons.filter((l) => open.includes(l.status) && Date.parse(l.starts_at) >= now.getTime());
}

/** The next upcoming open lesson of the course in its zone; null when none is booked yet. */
export function changeEffectiveFrom(
  lessons: readonly { status: LessonStatus; starts_at: string }[],
  input: { tz: string; now: Date },
): { startsOn: string; startsAt: string } | null {
  const [next] = stoppedLessons(lessons, input.now)
    .filter((l) => Date.parse(l.starts_at) > input.now.getTime())
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
  if (!next) return null;
  return { startsOn: wallParts(next.starts_at, input.tz).date, startsAt: next.starts_at };
}
