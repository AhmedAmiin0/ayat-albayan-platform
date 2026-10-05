import { FEEDBACK_KINDS, FEEDBACK_RATINGS, FEEDBACK_RECOMMEND, LESSON_RATINGS } from '@ab/shared';
import type { FilterOption } from '@/components/DataTable';
import { t } from '@/lib/i18n';

// The select filters of the feedback table (values are the GET /feedback params).

export const kindOptions = (): FilterOption[] => FEEDBACK_KINDS.map((k) => ({ value: k, label: t.enums.feedbackKind[k] }));

export const ratingOptions = (): FilterOption[] =>
  FEEDBACK_RATINGS.map((n) => ({ value: String(n), label: t.feedback.outOf.replace('{n}', String(n)) }));

export const quickRatingOptions = (): FilterOption[] => LESSON_RATINGS.map((r) => ({ value: r, label: t.feedback.quickRating[r] }));

export const recommendOptions = (): FilterOption[] =>
  FEEDBACK_RECOMMEND.map((r) => ({ value: r, label: t.enums.feedbackRecommend[r] }));
