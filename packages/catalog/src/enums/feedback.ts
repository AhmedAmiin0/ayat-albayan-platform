// Feedback enums (migration 166); each mirrors a DB enum.
export const FEEDBACK_KINDS = ['trial', 'subscription'] as const;
export const FEEDBACK_RECOMMEND = [
  'yes',
  'maybe',
  'no',
] as const;
/** Lesson rating from 1 (not satisfied) to 5 (fully satisfied). */
export const FEEDBACK_RATINGS = [1, 2, 3, 4, 5] as const;

export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];
export type FeedbackRecommend = (typeof FEEDBACK_RECOMMEND)[number];
export type FeedbackRating = (typeof FEEDBACK_RATINGS)[number];
