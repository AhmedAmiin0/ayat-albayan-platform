import type { FeedbackRating, FeedbackRecommend, FeedbackRowView, TeacherFeedbackRowView } from '@ab/shared';

// «رأيك يهمّنا» (student feedback): the contract is packages/shared/src/schemas/feedback.ts.
export {
  FEEDBACK_KINDS,
  FEEDBACK_RATINGS as RATINGS,
  FEEDBACK_RECOMMEND,
  type FeedbackFormView,
  type FeedbackKind,
  type FeedbackRecommend,
  type FeedbackRowView,
  type TeacherFeedbackSummary,
  type TeacherFeedbackView,
} from '@ab/shared';

/** The template that carries the link to «رأيك يهمّنا» (never sent by a job: only by «ابعت طلب الرأي»). */
export const FEEDBACK_TEMPLATE = 'lesson_feedback_request';

export type Rating = FeedbackRating;

/** POST /public/feedback/:token body; `kind` and the teacher are the server's, never sent. */
export interface FeedbackSubmitBody {
  rating: Rating;
  recommend: FeedbackRecommend;
  note?: string;
  contactPhone?: string;
}

/** A row of either list: the teacher's own rows have no teacher block and no contact phone. */
export type FeedbackListRow = TeacherFeedbackRowView & {
  teacher?: FeedbackRowView['teacher'];
  contact_phone?: string | null;
};

export interface FeedbackPage {
  items: FeedbackRowView[];
  total: number;
  page: number;
  pageSize: number;
}
