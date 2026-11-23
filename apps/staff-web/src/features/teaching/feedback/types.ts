// The contract is packages/shared/src/schemas/feedback.ts.
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

/** Never sent by a job, only by the admin's request button. */
export const FEEDBACK_TEMPLATE = 'lesson_feedback_request';
