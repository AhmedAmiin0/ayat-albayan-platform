import { z } from 'zod';
import type { LessonStatus, StudentStatus, SubscriptionStatus } from '@ab/catalog';
import { OPEN_LESSON_STATUSES, wallParts } from '@ab/schedule';
import type { StopRefund } from './stop-refund/index.js';
import { stopOweAskSchema, stopRefundAskSchema, type StopOwe } from './stop-choices/index.js';

// Stopping a course keeps the money: payments, earnings and commission stay (migrations 990, 991).

export const COURSE_STOP_REASON_MAX = 300;

/** Idempotent on clientRequestId (rule 8); `refund` and `owe` are never both given. */
export const courseStopSchema = z
  .strictObject({
    subscriptionId: z.uuid(),
    reason: z.string().trim().min(2).max(COURSE_STOP_REASON_MAX),
    clientRequestId: z.uuid(),
    refund: stopRefundAskSchema.optional(),
    owe: stopOweAskSchema.optional(),
  })
  .refine((b) => !(b.refund && b.owe), { message: 'refund_or_owe', path: ['owe'] });
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
  /** Their instants, earliest first (absent in an old answer). */
  futureStarts?: string[];
  /** Weekly rules of the course that still run: each ends on the cancel date. */
  activeRules: number;
  /** Net paid, kept as it is when cancelling without refund. */
  paid: number;
  currency: string;
  /** Refund lines: paid, attended x price x rate, refund; null without subscriptions.refund. */
  refund: StopRefund | null;
  /**
   * The person may refund but the refund could not be computed now (Stripe down for a card
   * payment): the sheet says so instead of hiding the choice silently.
   */
  refundUnavailable: boolean;
  /** Without refund: attended x rate (capped at the price), and the price. */
  owe: StopOwe;
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
  /** The refund amount, its card (Stripe) and manual parts; null means none. */
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
