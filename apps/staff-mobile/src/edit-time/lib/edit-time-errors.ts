import type { ClockCycle } from '@ab/time';
import { bookFailure, type BookFailure } from '@/booking/shared/booking-errors';
import { ApiError, t } from '@ab/mobile-kit';
import { isOffline } from '@/core/lib/money/payment-errors';

// What a failed PATCH /lessons/:id/time means (docs/10 §3: clients switch on `code`).

type EditTimeFailure = Extract<BookFailure, { kind: 'conflict' | 'error' }>;

const own: Record<string, string | undefined> = t.editTime.error;
const shared: Record<string, string | undefined> = t.lessons.error;

/** The API's `code`, when the body has one. */
export function failureCode(error: unknown): string | undefined {
  if (!(error instanceof ApiError) || typeof error.body !== 'object' || error.body === null) return undefined;
  const code = (error.body as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

/** The lesson is not what the sheet was opened on: the lists must refetch before another try. */
export const isStale = (error: unknown): boolean =>
  ['stale_time', 'time_edit_not_allowed'].includes(failureCode(error) ?? '');

/** Offline is safe to retry: the API replays an edit that already landed. */
export function editTimeFailure(error: unknown, cycle: ClockCycle, tz: string): EditTimeFailure {
  if (isOffline(error)) return { kind: 'error', text: t.editTime.offline };
  const booked = bookFailure(error, cycle, tz);
  if (booked.kind === 'conflict') return booked;
  const code = failureCode(error);
  return { kind: 'error', text: (code && (own[code] ?? shared[code])) || t.common.error };
}
