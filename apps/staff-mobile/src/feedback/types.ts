import type { FeedbackRowView, TeacherFeedbackSummary } from '@ab/shared';
import type { FeedbackKind, FeedbackRecommend } from '@ab/catalog';

// Student feedback: the contract is packages/shared/src/schemas/feedback.ts.
export type {
  FeedbackKind,
  FeedbackRecommend,
  FeedbackRowView,
  TeacherFeedbackSummary,
};

/** What the average card reads: a teacher's average, or none before the first answer. */
export interface FeedbackAverage {
  avg_rating: number | null;
  /** Answered responses. */
  n: number;
  recommend_yes_pct: number | null;
}
