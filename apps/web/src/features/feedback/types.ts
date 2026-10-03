// «رأيك يهمّنا» (student feedback) contract as the web reads it.
// ponytail: stand-ins for what forms/api puts in packages/shared (FEEDBACK_KINDS, FEEDBACK_RECOMMEND,
// FeedbackFormView, FeedbackRowView, TeacherFeedbackView). Swap these for the shared exports on merge.

/** The template that carries the link to «رأيك يهمّنا» (never sent by a job: only by «ابعت طلب الرأي»). */
export const FEEDBACK_TEMPLATE = 'lesson_feedback_request';

export const FEEDBACK_KINDS = ['trial', 'subscription'] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

export const FEEDBACK_RECOMMEND = ['yes', 'maybe', 'no'] as const;
export type FeedbackRecommend = (typeof FEEDBACK_RECOMMEND)[number];

export const RATINGS = [1, 2, 3, 4, 5] as const;
export type Rating = (typeof RATINGS)[number];

/** GET /public/feedback/:token (camelCase, the one response that is not snake_case). */
export interface FeedbackFormView {
  teacherName: string;
  kind: FeedbackKind;
  contactPhone: string | null;
  alreadySubmitted: boolean;
}

/** POST /public/feedback/:token body; `kind` and the teacher are the server's, never sent. */
export interface FeedbackSubmitBody {
  rating: Rating;
  recommend: FeedbackRecommend;
  note?: string;
  contactPhone?: string;
}

/** One lesson_feedback row (pending until `submitted_at`). The teacher's own list has no phone. */
export interface FeedbackRowView {
  id: string;
  lesson_id: string;
  student: { id: string; name: string; code: string | null };
  teacher: { id: string; display_name_ar: string; display_name_en?: string | null };
  kind: FeedbackKind;
  rating: number | null;
  recommend: FeedbackRecommend | null;
  note: string | null;
  contact_phone?: string | null;
  requested_at: string;
  submitted_at: string | null;
}

export interface FeedbackPage {
  items: FeedbackRowView[];
  total: number;
  page: number;
  pageSize: number;
}

/** Per teacher over submitted rows (v_teacher_feedback_avg). */
export interface TeacherAverageView {
  teacher_id: string;
  display_name_ar: string;
  display_name_en?: string | null;
  avg_rating: number;
  n: number;
  recommend_yes_pct: number;
}

/** GET /teachers/me/feedback: my rows and my own average (null while there is none). */
export interface TeacherFeedbackView {
  items: FeedbackRowView[];
  average: { avg_rating: number; n: number; recommend_yes_pct: number } | null;
}

export interface FeedbackFilters {
  teacherId?: string | undefined;
  kind?: FeedbackKind | undefined;
  rating?: number | undefined;
  page: number;
}
