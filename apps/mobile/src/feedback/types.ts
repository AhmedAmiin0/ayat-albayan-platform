import type {
  FeedbackKind,
  FeedbackRecommend,
  FeedbackRowView,
  TeacherFeedbackRowView,
  TeacherFeedbackSummary,
  TeacherFeedbackView,
} from '@ab/shared';

// «رأيك يهمّنا» (student feedback): the contract is packages/shared/src/schemas/feedback.ts.
export type { FeedbackKind, FeedbackRecommend, FeedbackRowView, TeacherFeedbackSummary, TeacherFeedbackView };

/** A row of either list: a teacher's own rows have no teacher block and no contact number. */
export type FeedbackListRow = TeacherFeedbackRowView & {
  teacher?: FeedbackRowView['teacher'];
  contact_phone?: string | null;
};

/** What the average card reads: a teacher's average, or none before the first answer. */
export interface FeedbackAverage {
  avg_rating: number | null;
  /** Answered responses. */
  n: number;
  recommend_yes_pct: number | null;
}
