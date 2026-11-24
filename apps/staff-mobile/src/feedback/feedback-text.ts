import { feedbackEligible } from '@ab/shared';
import type { LessonView } from '@ab/schedule';
import { ApiError, t } from '@ab/mobile-kit';
import type { FeedbackListRow } from '@ab/shared';
import type { FeedbackAverage } from './types';

const text = t.mobile.feedback;
const errors: Record<string, string | undefined> = text.error;

/** "4.3 of 5 · 12 answers", or null with no answers yet. One decimal, Western digits. */
export function averageLine(a: FeedbackAverage | null): string | null {
  if (!a || a.avg_rating === null || a.n === 0) return null;
  return text.averageLine.replace('{avg}', a.avg_rating.toFixed(1)).replace('{n}', String(a.n));
}

/** The share that would recommend us, or null when nobody answered the question. */
export function recommendLine(a: FeedbackAverage | null): string | null {
  if (!a || a.recommend_yes_pct === null || a.n === 0) return null;
  return text.recommendLine.replace('{pct}', String(Math.round(a.recommend_yes_pct)));
}

/** The rating and the would-you-recommend answer, or null while the request waits. */
export function answerLine(row: FeedbackListRow): string | null {
  if (row.submitted_at === null || row.rating === null) return null;
  const rating = text.ratingValue.replace('{n}', String(row.rating));
  return row.recommend ? `${rating} · ${text.answer[row.recommend]}` : rating;
}

/** A failed feedback request's line: the API's domain `code` in words, else the generic error. */
export function requestError(error: unknown): string {
  const body = error instanceof ApiError ? error.body : null;
  const code =
    typeof body === 'object' && body !== null ? (body as { code?: unknown }).code : undefined;
  return (typeof code === 'string' ? errors[code] : undefined) ?? t.common.error;
}

/**
 * The students a request may go to: the lesson took place and they did not miss it (the API
 * checks too).
 */
export const askable = (lesson: Pick<LessonView, 'status' | 'students'>): LessonView['students'] =>
  lesson.students.filter((s) => feedbackEligible(lesson.status, s.attendance));
