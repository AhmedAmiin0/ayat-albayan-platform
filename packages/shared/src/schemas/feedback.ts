import { z } from 'zod';
import { FEEDBACK_KINDS, FEEDBACK_RECOMMEND } from '@ab/catalog';
import { LESSON_RATINGS } from '../messaging/lesson/rating';
import { listSortShape, pageQuery, phoneE164 } from '@ab/core';
import type { Attendance, LessonStatus } from '@ab/catalog';

// Feedback (docs/13-forms-spec.md form 3): the server fills teacher and kind from the signed link.

/** Blank → undefined, so an empty optional field is simply absent. */
const blankIsAbsent = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

/** POST /public/feedback/:token. Required (*): rating, recommend. Note and phone are optional. */
export const feedbackSubmitSchema = z.object({
  rating: z.int().min(1).max(5),
  recommend: z.enum(FEEDBACK_RECOMMEND),
  note: z.preprocess(blankIsAbsent, z.string().trim().max(2000).optional()),
  /** Any typed phone → E.164; the page sends the prefilled number back. */
  contactPhone: z.preprocess(blankIsAbsent, phoneE164.optional()),
});
export type FeedbackSubmit = z.output<typeof feedbackSubmitSchema>;

/** Only when the lesson took place and this student did not miss it; API and clients share it. */
export function feedbackEligible(status: LessonStatus, attendance: Attendance | null): boolean {
  return (
    (status === 'completed' || status === 'late') &&
    attendance !== 'absent' &&
    attendance !== 'excused'
  );
}

/** POST /lessons/:lessonId/feedback-request (admin). `resend` replaces an expired link. */
export const feedbackRequestSchema = z.object({
  studentId: z.uuid(),
  resend: z.boolean().optional(),
});
export type FeedbackRequest = z.output<typeof feedbackRequestSchema>;

/** GET /feedback (and /teachers/me/feedback) sort keys (R-NFR-08); none = newest request first. */
export const FEEDBACK_SORT_KEYS = [
  'teacher',
  'kind',
  'quick_rating',
  'rating',
  'recommend',
  'note',
] as const;
export type FeedbackSortKey = (typeof FEEDBACK_SORT_KEYS)[number];

/** GET /feedback filters (paged like every list); `student` and `note` are «contains» text. */
export const feedbackQuerySchema = z.object({
  teacher: z.uuid().optional(),
  /** One lesson's rows, so the sent state survives a reload. */
  lesson: z.uuid().optional(),
  kind: z.enum(FEEDBACK_KINDS).optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  recommend: z.enum(FEEDBACK_RECOMMEND).optional(),
  quick_rating: z.enum(LESSON_RATINGS).optional(),
  student: z.string().trim().min(1).max(100).optional(),
  note: z.string().trim().min(1).max(100).optional(),
  ...listSortShape(FEEDBACK_SORT_KEYS),
});
export type FeedbackQuery = z.output<typeof feedbackQuerySchema>;

const feedbackPagedQuerySchema = feedbackQuerySchema.extend(pageQuery({ size: 25 }));

/** Keeps the value; any filter issue stops the parse before the paging is read. */
function filterFirst(value: z.input<typeof feedbackPagedQuerySchema>, ctx: z.RefinementCtx) {
  for (const { path, message } of feedbackQuerySchema.safeParse(value).error?.issues ?? [])
    ctx.addIssue({ code: 'custom', path, message });
  return value;
}

/**
 * GET /feedback and /teachers/me/feedback: the filter is checked before the paging, so a bad
 * filter is the only issue reported when both are bad.
 */
export const feedbackListQuerySchema = z.preprocess(filterFirst, feedbackPagedQuerySchema);
export type FeedbackListQuery = z.output<typeof feedbackListQuerySchema>;
export type FeedbackListQueryInput = z.input<typeof feedbackListQuerySchema>;
