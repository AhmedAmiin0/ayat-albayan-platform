import { z } from 'zod';
import {
  FEEDBACK_KINDS,
  type MessageStatus,
  FEEDBACK_RECOMMEND,
  type FeedbackKind,
  type FeedbackRating,
  type FeedbackRecommend,
} from '../enums/index.js';
import type { LessonRating } from '../messaging/rating.js';
import { phoneE164 } from './common.js';
import type { Attendance, LessonStatus } from '../enums/index.js';

// «رأيك يهمّنا» (docs/13-forms-spec.md form 3). camelCase commands, snake_case responses like the
// rest of the API. The server fills teacher and kind from the signed link; the client never sends them.

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

/**
 * Whether «ابعت طلب الرأي» may go to this student: the lesson took place (completed, or the student
 * came late) and this student did not miss it (a sibling's lesson in a group does not count for an
 * absent or excused one). The API enforces it; web and mobile hide the button with the same rule.
 */
export function feedbackEligible(status: LessonStatus, attendance: Attendance | null): boolean {
  return (status === 'completed' || status === 'late') && attendance !== 'absent' && attendance !== 'excused';
}

/** POST /lessons/:lessonId/feedback-request (admin). `resend` replaces an expired link. */
export const feedbackRequestSchema = z.object({
  studentId: z.uuid(),
  resend: z.boolean().optional(),
});
export type FeedbackRequest = z.output<typeof feedbackRequestSchema>;

/** GET /feedback filters (paged like every list). */
export const feedbackQuerySchema = z.object({
  teacher: z.uuid().optional(),
  /** One lesson's rows: the «اتبعت» state of its send button survives a reload. */
  lesson: z.uuid().optional(),
  kind: z.enum(FEEDBACK_KINDS).optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
});
export type FeedbackQuery = z.output<typeof feedbackQuerySchema>;

/** GET /public/feedback/:token — nothing beyond the teacher, the kind and the prefilled phone. */
export interface FeedbackFormView {
  teacherName: string;
  kind: FeedbackKind;
  contactPhone: string;
  alreadySubmitted: boolean;
}

/** One feedback row for the admin list. */
export interface FeedbackRowView {
  id: string;
  lesson_id: string;
  student: { id: string; code: string; name: string };
  teacher: { id: string; name: string };
  kind: FeedbackKind;
  requested_at: string;
  expires_at: string;
  /** null while the family has not answered. */
  rating: FeedbackRating | null;
  recommend: FeedbackRecommend | null;
  note: string | null;
  submitted_at: string | null;
  /** The guardian's WhatsApp button answer (lesson_rating, migration 195); null until they tap. Absent in an old cache. */
  quick_rating?: LessonRating | null;
  quick_rated_at?: string | null;
  /** Admin only: the family's contact number; never in a teacher's view. */
  contact_phone: string | null;
}

/** A teacher's own rows: the student's name stays, contact phone and guardian are omitted. */
export type TeacherFeedbackRowView = Omit<FeedbackRowView, 'contact_phone' | 'teacher'>;

export interface FeedbackAverage {
  avg_rating: number;
  n: number;
  recommend_yes_pct: number;
}

/** GET /feedback/summary: per teacher. */
export interface TeacherFeedbackSummary extends FeedbackAverage {
  teacher: { id: string; name: string };
}

/** GET /teachers/me/feedback: own rows plus the teacher's own average (null before the first answer). */
export interface TeacherFeedbackView {
  items: TeacherFeedbackRowView[];
  total: number;
  page: number;
  pageSize: number;
  average: FeedbackAverage | null;
}

/** POST /lessons/:lessonId/feedback-request: `replayed` = already requested, nothing new was sent. */
export interface FeedbackRequestResult {
  requested_at: string;
  expires_at: string;
  replayed: boolean;
  /** The queued row's status: queued while sending is gated off, failed carries nothing to resend but a new link. */
  message_status: MessageStatus;
}
