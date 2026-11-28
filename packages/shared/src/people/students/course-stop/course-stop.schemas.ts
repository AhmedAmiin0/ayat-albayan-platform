import { STUDENT_STATUSES } from '@ab/catalog';
import { z } from 'zod';
import { stopOweSchema } from '../stop-choices';
import { stopRefundSchema } from '../stop-refund';

/** Who stopped the package, when and why (null while it runs). */
export const courseStoppedSchema = z.object({
  at: z.string(),
  by: z.string().nullable(),
  reason: z.string().nullable(),
});
export type CourseStopped = z.infer<typeof courseStoppedSchema>;

export const courseStopPreviewSchema = z.object({
  subscriptionId: z.string(),
  /** Open lessons of the course still to come: all of them are cancelled. */
  futureLessons: z.number(),
  /** Their instants, earliest first (absent in an old answer). */
  futureStarts: z.array(z.string()).optional(),
  /** Weekly rules of the course that still run: each ends on the cancel date. */
  activeRules: z.number(),
  /** Net paid, kept as it is when cancelling without refund. */
  paid: z.number(),
  currency: z.string(),
  /** Refund lines; null without subscriptions.refund. */
  refund: stopRefundSchema.nullable(),
  /**
   * The person may refund but the refund could not be computed now (Stripe down for a card
   * payment): the sheet says so instead of hiding the choice silently.
   */
  refundUnavailable: z.boolean(),
  /** Without refund: attended x rate (capped at the price), and the price. */
  owe: stopOweSchema,
  /** Set once the package is cancelled (either kind): the sheet shows it instead of the button. */
  stopped: courseStoppedSchema.nullable(),
});
export type CourseStopPreview = z.infer<typeof courseStopPreviewSchema>;

/** The refund amount, its card (Stripe) and manual parts. */
export const courseStopRefundedSchema = z.object({
  amount: z.number(),
  card: z.number(),
  manual: z.number(),
});
export type CourseStopRefunded = z.infer<typeof courseStopRefundedSchema>;

export const courseStopResultSchema = z.object({
  subscriptionId: z.string(),
  cancelledLessons: z.number(),
  endedRules: z.number(),
  /** The student's status after the stop (churned, or what it was when already churned). */
  studentStatus: z.enum(STUDENT_STATUSES),
  stoppedAt: z.string(),
  /** Null means no refund. */
  refund: courseStopRefundedSchema.nullable(),
});
export type CourseStopResult = z.infer<typeof courseStopResultSchema>;
