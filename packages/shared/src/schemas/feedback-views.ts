import { z } from 'zod';
import {
  FEEDBACK_KINDS,
  FEEDBACK_RATINGS,
  FEEDBACK_RECOMMEND,
  messageStatusSchema,
} from '@ab/catalog';
import { pageOf } from '@ab/core';
import { LESSON_RATINGS } from '../messaging/lesson/rating';

const personSchema = z.object({ id: z.string(), name: z.string() });

/** GET /public/feedback/:token: nothing beyond the teacher, the kind and the prefilled phone. */
export const feedbackFormViewSchema = z.object({
  teacherName: z.string(),
  kind: z.enum(FEEDBACK_KINDS),
  contactPhone: z.string(),
  alreadySubmitted: z.boolean(),
});
export type FeedbackFormView = z.infer<typeof feedbackFormViewSchema>;

/** A teacher's own row: the student's name stays, contact phone and teacher block never exist. */
export const teacherFeedbackRowViewSchema = z.object({
  id: z.string(),
  lesson_id: z.string(),
  student: z.object({ id: z.string(), code: z.string(), name: z.string() }),
  kind: z.enum(FEEDBACK_KINDS),
  requested_at: z.string(),
  expires_at: z.string(),
  /** null while the family has not answered. */
  rating: z.literal(FEEDBACK_RATINGS).nullable(),
  recommend: z.enum(FEEDBACK_RECOMMEND).nullable(),
  note: z.string().nullable(),
  submitted_at: z.string().nullable(),
  /** The guardian's WhatsApp button answer (migration 195); absent in an old cache. */
  quick_rating: z.enum(LESSON_RATINGS).nullable().optional(),
  quick_rated_at: z.string().nullable().optional(),
});
export type TeacherFeedbackRowView = z.infer<typeof teacherFeedbackRowViewSchema>;

/** One row of the admin list; the family's contact number is admin only. */
export const feedbackRowViewSchema = teacherFeedbackRowViewSchema.extend({
  teacher: personSchema,
  contact_phone: z.string().nullable(),
});
export type FeedbackRowView = z.infer<typeof feedbackRowViewSchema>;

/** A row of either list: the teacher's own rows have no teacher block and no contact phone. */
export const feedbackListRowSchema = teacherFeedbackRowViewSchema.extend({
  teacher: personSchema.optional(),
  contact_phone: z.string().nullable().optional(),
});
export type FeedbackListRow = z.infer<typeof feedbackListRowSchema>;

export const feedbackAverageSchema = z.object({
  avg_rating: z.number(),
  n: z.number(),
  recommend_yes_pct: z.number(),
});
export type FeedbackAverage = z.infer<typeof feedbackAverageSchema>;

/** GET /feedback/summary: one line per teacher. */
export const teacherFeedbackSummarySchema = feedbackAverageSchema.extend({ teacher: personSchema });
export type TeacherFeedbackSummary = z.infer<typeof teacherFeedbackSummarySchema>;

/** GET /teachers/me/feedback: own rows plus the own average (null before the first answer). */
export const teacherFeedbackViewSchema = pageOf(teacherFeedbackRowViewSchema).extend({
  average: feedbackAverageSchema.nullable(),
});
export type TeacherFeedbackView = z.infer<typeof teacherFeedbackViewSchema>;

/** POST /lessons/:id/feedback-request: `replayed` = already requested, nothing new was sent. */
export const feedbackRequestResultSchema = z.object({
  requested_at: z.string(),
  expires_at: z.string(),
  replayed: z.boolean(),
  /** Queued while sending is gated off; failed carries nothing to resend but a new link. */
  message_status: messageStatusSchema,
});
export type FeedbackRequestResult = z.infer<typeof feedbackRequestResultSchema>;
