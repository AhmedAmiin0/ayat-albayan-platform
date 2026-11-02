import { z } from 'zod';
import type { LessonStatus, StudentStatus, SubscriptionStatus } from '@ab/catalog';
import { OPEN_LESSON_STATUSES, wallParts } from '@ab/schedule';
import type { StopRefund } from './stop-refund.js';

// «إلغاء الاشتراك» from the student's profile (owner 2026-10-30): STOP THE COURSE, KEEP THE MONEY.
// Every future lesson of the subscription's course is cancelled, its weekly rules end on the cancel
// date, the student becomes «توقف» (churned) unless another package still runs, and the package
// «ملغاة» (cancel_kind 'stopped', migration 990) with who / when / why. Payments, held lessons,
// reports, teacher earnings and the assistant's commission are never touched: a stopped package
// stays in every money reader (countsForMoney, migration 991). Pure.

export const COURSE_STOP_REASON_MAX = 300;

/**
 * POST /students/:id/course-stop: idempotent on clientRequestId (rule 8); the reason is required.
 * `refund` (owner 2026-11-02, subscriptions.refund): «إلغاء مع استرداد», at most the preview's
 * refund; absent = «إلغاء فقط».
 */
export const courseStopSchema = z.strictObject({
  subscriptionId: z.uuid(),
  reason: z.string().trim().min(2).max(COURSE_STOP_REASON_MAX),
  clientRequestId: z.uuid(),
  refund: z.strictObject({ amount: z.number().positive().max(10_000_000) }).optional(),
});
export type CourseStopRequest = z.infer<typeof courseStopSchema>;

/**
 * GET /students/:id/course-stop?subscriptionId=: the sheet's lines; absent = the current package.
 */
export const courseStopQuerySchema = z.object({ subscriptionId: z.uuid().optional() });

/** Who stopped the package, when and why (null while it runs). */
export interface CourseStopped {
  at: string;
  by: string | null;
  reason: string | null;
}

export interface CourseStopPreview {
  subscriptionId: string;
  /** Open lessons of the course still to come: all of them are cancelled. */
  futureLessons: number;
  /** Weekly rules of the course that still run: each ends on the cancel date. */
  activeRules: number;
  /** Net paid, kept as it is with «إلغاء فقط». */
  paid: number;
  currency: string;
  /** «إلغاء مع استرداد»'s lines (owner 2026-11-02): paid, attended × price × rate, refund. */
  refund: StopRefund;
  /** Set once the package is cancelled (either kind): the sheet shows it instead of the button. */
  stopped: CourseStopped | null;
}

export interface CourseStopResult {
  subscriptionId: string;
  cancelledLessons: number;
  endedRules: number;
  /** The student's status after the stop (churned, or what it was when already churned). */
  studentStatus: StudentStatus;
  stoppedAt: string;
  /** «إلغاء مع استرداد»: the amount, its card part (Stripe) and its manual part; null = none. */
  refund: CourseStopRefunded | null;
}

export interface CourseStopRefunded {
  amount: number;
  card: number;
  manual: number;
}

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

/**
 * «من تاريخ» of a teacher or time change: the next upcoming open lesson of the course (its local
 * date and instant in the course zone); null when none is booked yet (the dialog then asks for a
 * date).
 */
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
