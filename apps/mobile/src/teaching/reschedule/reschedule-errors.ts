import type { ClockCycle } from '@ab/shared';
import { bookFailure } from '@/booking/shared/booking-errors';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { isOffline } from '@/payments/lib/payment-errors';

// What a failed POST /lessons/:id/reschedule means (docs/10 §3: clients switch on `code`).

export type RescheduleFailure =
  /** 409 conflict: one line per clash (booking's wording), then «اختار ميعاد تاني». */
  | { kind: 'conflict'; lines: string[] }
  | { kind: 'error'; text: string };

const known: Record<string, string | undefined> = t.lessons.error;

function codeOf(error: unknown): string | undefined {
  if (!(error instanceof ApiError) || typeof error.body !== 'object' || error.body === null) return undefined;
  const code = (error.body as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

/**
 * Offline → «مش متأكدين الميعاد اتغير» (a retry after a landed move is refused, never doubled);
 * a clash → its lines; invalid_transition, no_rule, rule_not_active, date_in_past, no_occurrences…
 * → the lessons.error wording; anything else → the general error.
 */
export function rescheduleFailure(
  error: unknown,
  cycle: ClockCycle,
  tz: string,
): RescheduleFailure {
  if (isOffline(error)) return { kind: 'error', text: t.reschedule.offline };
  const booked = bookFailure(error, cycle, tz);
  if (booked.kind === 'conflict') return booked;
  const code = codeOf(error);
  return { kind: 'error', text: (code && known[code]) || t.common.error };
}

/** A failed move in words on the screen's clock: re-worded when «تنسيق الوقت» or the zone moves. */
export function useRescheduleFailure(move: { isError: boolean; error: unknown }) {
  const cycle = useClockCycle();
  const tz = useViewerTz();
  return move.isError ? rescheduleFailure(move.error, cycle, tz) : null;
}
