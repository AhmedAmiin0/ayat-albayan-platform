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
