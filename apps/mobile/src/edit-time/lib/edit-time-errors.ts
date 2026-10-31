import type { ClockCycle } from '@ab/shared';
import { bookFailure, type BookFailure } from '@/booking/shared/booking-errors';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { isOffline } from '@/payments/lib/payment-errors';

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

/**
 * Offline → «مش متأكدين الوقت اتعدّل» (the API answers a repeat of a landed edit with a quiet
 * replay, so trying again is safe); a clash → its lines (booking's wording, «اختار ميعاد تاني»);
 * stale_time, payout_locked, date_in_future, correction_cross_day… → editTime.error; the older
 * codes (date_in_past, invalid_transition…) → lessons.error; anything else → the general error.
 */
export function editTimeFailure(error: unknown, cycle: ClockCycle): EditTimeFailure {
  if (isOffline(error)) return { kind: 'error', text: t.editTime.offline };
  const booked = bookFailure(error, cycle);
  if (booked.kind === 'conflict') return booked;
  const code = failureCode(error);
  return { kind: 'error', text: (code && (own[code] ?? shared[code])) || t.common.error };
}
