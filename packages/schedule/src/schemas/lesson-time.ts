import { z } from 'zod';
import { lessonViewSchema } from '../lessons/lesson-view';
import { instant } from '@ab/core';
import { lessonDuration, overrideSchema } from './scheduling';

/**
 * PATCH /lessons/:id/time (R-SCH-11, admin only): the lesson's date, start and length in place.
 * `expectedStartsAt` (and `expectedEndsAt`, optional for older clients) is the time the admin saw,
 * so two admins never overwrite each other, a length-only edit included; `reason`
 * is required when correcting a held lesson; `notify` (default on) sends the guardian the new
 * time of a future lesson.
 */
export const lessonTimeEditSchema = z.object({
  expectedStartsAt: instant,
  expectedEndsAt: instant.optional(),
  startsAt: instant,
  durationMin: lessonDuration,
  reason: z.string().trim().max(300).optional(),
  notify: z.boolean().optional(),
  override: overrideSchema.optional(),
});

export type LessonTimeEdit = z.infer<typeof lessonTimeEditSchema>;

export const TIME_EDIT_PAYOUTS = ['none', 'draft_stale'] as const;

/** Response: the lesson as the admin sees it plus what the edit set in motion. */
export const timeEditResultSchema = z.object({
  lesson: lessonViewSchema,
  /** Queued guardian confirmations. */
  notified: z.int().nonnegative(),
  /** draft_stale: the lesson's month has a draft payout that must be recalculated. */
  payout: z.enum(TIME_EDIT_PAYOUTS),
  /** The report PDF is re-rendered (the guardian is not sent it again). */
  pdf_refresh: z.boolean(),
});
export type TimeEditResult = z.infer<typeof timeEditResultSchema>;
