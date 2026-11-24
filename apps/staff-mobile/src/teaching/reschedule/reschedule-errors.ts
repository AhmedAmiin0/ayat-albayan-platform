import type { ClockCycle } from '@ab/shared';
import { bookFailure } from '@/booking/shared/booking-errors';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';
import { ApiError, t } from '@ab/mobile-kit';
import { isOffline } from '@/core/lib/money/payment-errors';

// What a failed POST /lessons/:id/reschedule means (docs/10 §3: clients switch on `code`).

export type RescheduleFailure =
  /** One line per clash, in booking's wording. */
  | { kind: 'conflict'; lines: string[] }
  | { kind: 'error'; text: string };

const known: Record<string, string | undefined> = t.lessons.error;

function codeOf(error: unknown): string | undefined {
  if (!(error instanceof ApiError) || typeof error.body !== 'object' || error.body === null) return undefined;
  const code = (error.body as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

/** Offline is unsure: a retry after a landed move is refused, never doubled. */
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

/** Re-worded when the time format or zone changes. */
export function useRescheduleFailure(move: { isError: boolean; error: unknown }) {
  const cycle = useClockCycle();
  const tz = useViewerTz();
  return move.isError ? rescheduleFailure(move.error, cycle, tz) : null;
}
