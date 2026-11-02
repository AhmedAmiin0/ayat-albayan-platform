import type { Enums } from '@ab/db';

// «رأيك يهمّنا» enums (migration 166). Each mirrors a DB enum; `satisfies` breaks the build if one drifts.
export const FEEDBACK_KINDS = ['trial', 'subscription'] as const satisfies readonly Enums<'feedback_kind'>[];
export const FEEDBACK_RECOMMEND = [
  'yes',
  'maybe',
  'no',
] as const satisfies readonly Enums<'feedback_recommend'>[];
/** «تقييمك للحلقة»: 1 (غير راضٍ) to 5 (راضٍ تمامًا). */
export const FEEDBACK_RATINGS = [1, 2, 3, 4, 5] as const;

export type FeedbackKind = Enums<'feedback_kind'>;
export type FeedbackRecommend = Enums<'feedback_recommend'>;
export type FeedbackRating = (typeof FEEDBACK_RATINGS)[number];
