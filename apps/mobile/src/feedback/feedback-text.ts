import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import type { FeedbackAverage, FeedbackListRow } from './types';

const text = t.mobile.feedback;
const errors: Record<string, string | undefined> = text.error;

/** «4.3 من 5 · 12 رأي», or null with no answers yet. One decimal, Western digits. */
export function averageLine(a: FeedbackAverage | null): string | null {
  if (!a || a.avg_rating === null || a.n === 0) return null;
  return text.averageLine.replace('{avg}', a.avg_rating.toFixed(1)).replace('{n}', String(a.n));
}

/** «80% بيرشّحونا», or null when nobody answered the question. */
export function recommendLine(a: FeedbackAverage | null): string | null {
  if (!a || a.recommend_yes_pct === null || a.n === 0) return null;
  return text.recommendLine.replace('{pct}', String(Math.round(a.recommend_yes_pct)));
}

/**
 * The lines under a row's title: lesson type, then rating / «نعم ربما لا» when answered, then its
 * note; «لسه ما ردّش» for a pending request.
 */
export function rowLines(row: FeedbackListRow): string[] {
  if (row.submitted_at === null || row.rating === null) {
    return [text.kind[row.kind], text.pending];
  }
  const answer = row.recommend ? `${text.recommend} ${text.answer[row.recommend]}` : null;
  return [
    text.kind[row.kind],
    `${text.rating}: ${text.ratingValue.replace('{n}', String(row.rating))}`,
    ...(answer ? [answer] : []),
    ...(row.note ? [row.note] : []),
  ];
}

/** The line for a failed «ابعت طلب الرأي»: the API's domain `code` in words, else the generic error. */
export function requestError(error: unknown): string {
  const body = error instanceof ApiError ? error.body : null;
  const code =
    typeof body === 'object' && body !== null ? (body as { code?: unknown }).code : undefined;
  return (typeof code === 'string' ? errors[code] : undefined) ?? t.common.error;
}

/** A completed or late lesson is the only one a request can follow (the API checks too). */
export const canRequestFeedback = (status: string): boolean =>
  status === 'completed' || status === 'late';
