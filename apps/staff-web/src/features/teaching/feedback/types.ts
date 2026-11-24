// «رأيك يهمّنا» (student feedback): the contract is packages/shared/src/schemas/feedback.ts.
export {
  type FeedbackFormView,
  type FeedbackRowView,
  type TeacherFeedbackSummary,
  type TeacherFeedbackView,
} from '@ab/shared';
export {
  FEEDBACK_KINDS,
  FEEDBACK_RATINGS as RATINGS,
  FEEDBACK_RECOMMEND,
  type FeedbackKind,
  type FeedbackRecommend,
} from '@ab/catalog';

/** The template that carries the link to «رأيك يهمّنا» (never sent by a job: only by «ابعت طلب الرأي»). */
export const FEEDBACK_TEMPLATE = 'lesson_feedback_request';
