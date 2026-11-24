// The contract is packages/shared/src/schemas/feedback.ts.
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

/** Never sent by a job, only by the admin's request button. */
export const FEEDBACK_TEMPLATE = 'lesson_feedback_request';
