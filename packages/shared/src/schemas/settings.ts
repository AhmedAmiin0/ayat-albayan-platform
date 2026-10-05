import { z } from 'zod';

// PATCH /settings (moved out of scheduling.ts, which re-exports it).

/** settings.feedback_mode: 'buttons' = lesson_rating after a completed lesson; 'link' = no automatic message. */
export const FEEDBACK_MODES = ['buttons', 'link'] as const;
export type FeedbackMode = (typeof FEEDBACK_MODES)[number];

/** PATCH /settings (admin). late_cancel_hours null = OFF (R-SCH-07, docs/05 q2). Phase 3: docs/11. */
export const settingsUpdateSchema = z.object({
  lateCancelHours: z.int().min(1).max(168).nullable().optional(),
  bookingHorizonWeeks: z.int().min(1).max(12).optional(),
  renewalAlertRemaining: z.int().min(0).max(10).optional(),
  flagFutureLessonsWhenUnpaid: z.boolean().optional(),
  reportTeacherEditHours: z.int().min(0).max(168).optional(),
  reportingCurrency: z.string().regex(/^[A-Z]{3}$/).optional(),
  payoutCountLate: z.boolean().optional(),
  payoutCountNoShow: z.boolean().optional(),
  payoutCountTrials: z.boolean().optional(),
  followUpHours: z.array(z.int().min(1).max(720)).min(1).max(5)
    .refine((h) => h.every((v, i) => i === 0 || v > (h[i - 1] ?? 0)), 'not_ascending').optional(),
  reminderMinutesBefore: z.int().min(5).max(720).optional(),
  reminder24hEnabled: z.boolean().optional(),
  messagingEnabled: z.boolean().optional(),
  autoMessagesEnabled: z.boolean().optional(),
  crmCutoverDone: z.boolean().optional(),
  salesAutoAssign: z.boolean().optional(),
  /** What the rating job sends after a lesson (migration 195): lesson_rating buttons, or nothing (the link stays manual). */
  feedbackMode: z.enum(FEEDBACK_MODES).optional(),
});

export type SettingsUpdate = z.infer<typeof settingsUpdateSchema>;
