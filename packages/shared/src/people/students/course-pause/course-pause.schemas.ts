import { localDate } from '@ab/core';
import { z } from 'zod';

/** The cancel_reason of the lessons a pause cancels (migration 956); data, not a UI string. */
export const COURSE_PAUSE_REASON = 'إيقاف مؤقت';
export const COURSE_PAUSE_REASON_MAX = 300;

/** fromDate defaults to Riyadh today; untilDate null means until resumed. */
export const coursePauseStartSchema = z
  .object({
    fromDate: localDate.optional(),
    untilDate: localDate.nullish(),
    reason: z.string().trim().max(COURSE_PAUSE_REASON_MAX).nullish(),
  })
  .strict();
export type CoursePauseStart = z.infer<typeof coursePauseStartSchema>;

/** Extend or shorten the open pause (null means until resumed). */
export const coursePauseUntilSchema = z.object({ untilDate: localDate.nullable() }).strict();
export type CoursePauseUntil = z.infer<typeof coursePauseUntilSchema>;

/** subscriptionId: a package row's resume; resumes the open pause or a package-only paused row. */
export const coursePauseResumeSchema = z.object({ subscriptionId: z.uuid().optional() }).strict();
export type CoursePauseResume = z.infer<typeof coursePauseResumeSchema>;

/** Until empty means open-ended. */
export const coursePausePreviewQuery = z.object({
  from: localDate.optional(),
  until: localDate.optional(),
});

export const coursePauseProblemSchema = z.enum(['date_in_past', 'invalid_range']);
export type CoursePauseProblem = z.infer<typeof coursePauseProblemSchema>;

export const coursePauseViewSchema = z.object({
  id: z.string(),
  from_date: z.string(),
  /** null means until resumed. */
  until_date: z.string().nullable(),
  reason: z.string().nullable(),
  created_at: z.string(),
  created_by_name: z.string().nullable(),
  resumed_at: z.string().nullable(),
  /** The Riyadh days the package's and the rules' dates moved forward (null while open). */
  extended_days: z.number().nullable(),
});
export type CoursePauseView = z.infer<typeof coursePauseViewSchema>;

/** The open pause (at most one) and the past ones, newest first. */
export const coursePauseStateSchema = z.object({
  open: coursePauseViewSchema.nullable(),
  history: z.array(coursePauseViewSchema),
});
export type CoursePauseState = z.infer<typeof coursePauseStateSchema>;

/** Lessons the pause window takes the student out of (cancelled or left). */
export const coursePausePreviewSchema = z.object({
  from_date: z.string(),
  until_date: z.string().nullable(),
  lessons: z.number(),
  /** The instants of those lessons, earliest first (absent in an old answer). */
  starts: z.array(z.string()).optional(),
  /** Days a resume moves the package forward; null when open-ended (counted at resume). */
  extend_days: z.number().nullable().optional(),
});
export type CoursePausePreview = z.infer<typeof coursePausePreviewSchema>;

/** A start, an until change or a resume; `conflicts`: clashes of the lessons booked back. */
export const coursePauseResultSchema = z.object({
  pause: coursePauseViewSchema,
  cancelled: z.number(),
  left: z.number(),
  reopened: z.number(),
  conflicts: z.number(),
});
export type CoursePauseResult = z.infer<typeof coursePauseResultSchema>;

/** What resuming the course does now. */
export const courseResumePreviewSchema = z.object({
  /** The instants of the lessons booked back (from today on), earliest first. */
  back: z.array(z.string()),
  /** The days the package moves forward (0 = the pause has not started: nothing moves). */
  extendDays: z.number().int(),
});
export type CourseResumePreview = z.infer<typeof courseResumePreviewSchema>;
