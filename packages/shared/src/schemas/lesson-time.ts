import { z } from 'zod';
import type { LessonView } from '../lessons/views.js';
import { instant, lessonDuration, overrideSchema } from './scheduling.js';

/**
 * PATCH /lessons/:id/time (R-SCH-11, admin only): the lesson's date, start and length in place.
 * `expectedStartsAt` is the start the admin saw (two admins never overwrite each other); `reason`
 * is required when correcting a held lesson; `notify` (default on) sends the guardian the new
 * time of a future lesson.
 */
export const lessonTimeEditSchema = z.object({
  expectedStartsAt: instant,
  startsAt: instant,
  durationMin: lessonDuration,
  reason: z.string().trim().max(300).optional(),
  notify: z.boolean().optional(),
  override: overrideSchema.optional(),
});

export type LessonTimeEdit = z.infer<typeof lessonTimeEditSchema>;

/** Response: the lesson as the admin sees it plus what the edit set in motion. */
export interface TimeEditResult {
  lesson: LessonView;
  /** Queued guardian confirmations. */
  notified: number;
  /** draft_stale: the lesson's month has a draft payout, press «احسب مستحقات الشهر» again. */
  payout: 'none' | 'draft_stale';
  /** The report PDF is re-rendered (the guardian is not sent it again). */
  pdf_refresh: boolean;
}
