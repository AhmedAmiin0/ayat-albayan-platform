import { LESSON_STATUSES, type LessonStatus } from '@ab/catalog';
import { instant } from '@ab/core';
import { isOpenLesson } from '@ab/schedule';
import { z } from 'zod';

// The family's own lesson actions; whitelists, never a staff id or an internal reason.

/** Open and not started; the API guard and the apps read the same rule. */
export const isFamilyActionable = (
  l: { status: LessonStatus; starts_at: string },
  now: Date,
): boolean => isOpenLesson(l.status) && Date.parse(l.starts_at) > now.getTime();

/** The family's latest request on a lesson: waiting, or declined with the academy's note. */
export const portalLessonRequestSchema = z.object({
  id: z.string(),
  status: z.enum(['pending', 'rejected']),
  proposed_starts_at: z.string(),
  note: z.string().nullable(),
  decision_note: z.string().nullable(),
  decided_at: z.string().nullable(),
});
export type PortalLessonRequest = z.infer<typeof portalLessonRequestSchema>;

/**
 * What the lesson card offers and says. `counts`: an open lesson cancelled now would count from
 * the package (the preview); an excused one did (its outcome). No reason leaves (docs/31).
 */
export const portalLessonFamilySchema = z.object({
  counts: z.boolean(),
  /** More than one student: the lesson is the academy's to move or cancel (409 group_lesson). */
  group: z.boolean(),
  request: portalLessonRequestSchema.nullable(),
});
export type PortalLessonFamily = z.infer<typeof portalLessonFamilySchema>;

export const portalCancelSchema = z.object({ reason: z.string().trim().max(500).optional() });
export type PortalCancel = z.infer<typeof portalCancelSchema>;

/** POST …/lessons/:lessonId/request: a free start of the family slots, a note for the academy. */
export const portalRequestSchema = z.object({
  startsAt: instant,
  note: z.string().trim().max(500).optional(),
});
export type PortalRequest = z.infer<typeof portalRequestSchema>;

/** Every action's answer: the lesson's status now and whether it counts from the package. */
export const portalActionResultSchema = z.object({
  lesson_id: z.string(),
  status: z.enum(LESSON_STATUSES),
  counts: z.boolean(),
});
export type PortalActionResult = z.infer<typeof portalActionResultSchema>;

/** GET …/lessons/:lessonId/slots?from&to (≤ 14 days, as GET /booking/slots). */
export const portalSlotsQuerySchema = z
  .object({ from: instant, to: instant })
  .refine((q) => Date.parse(q.from) < Date.parse(q.to), { message: 'from_before_to', path: ['to'] });
export type PortalSlotsQuery = z.infer<typeof portalSlotsQuerySchema>;

/** Free starts only (no clash reasons), read on the student's clock `tz`. */
export const portalSlotsSchema = z.object({
  tz: z.string(),
  step_min: z.number(),
  slots: z.array(z.object({ starts_at: z.string(), ends_at: z.string() })),
});
export type PortalSlots = z.infer<typeof portalSlotsSchema>;
