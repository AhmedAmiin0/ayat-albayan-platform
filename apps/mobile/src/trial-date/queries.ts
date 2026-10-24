import type { Conflict, TrialDateResult, TrialHistory } from '@ab/shared';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend, toQueryString } from '@/lib/api';
import { pathKey } from '@/lib/query-keys';
import { bookingPath, useBookingMode, type BookingMode } from '@/booking/booking-mode';
import type { TrialDateBody } from './trial-date-body';

// «موعد تجريبي جديد» (R-SCH-06/07, R-STU-05, R-ASST-01): the history, the clash check and the
// booking, under /booking (admin) or /sales/booking (a salesperson, her own students only).

export const historyKey = (mode: BookingMode, studentId: string) => [...pathKey(bookingPath(mode, '/trial-dates')), studentId];

/** GET {base}/trial-dates?studentId: every trial time picked for the student, newest pick first. */
export function useTrialHistory(studentId: string, enabled = true) {
  const mode = useBookingMode();
  const path = bookingPath(mode, '/trial-dates');
  return useQuery({
    queryKey: historyKey(mode, studentId),
    queryFn: async () => {
      const history = await apiFetch<TrialHistory | null>(`${path}${toQueryString({ studentId })}`);
      // A wrong shape is a failed read (with its retry), never a crash of the student file around it.
      if (!Array.isArray(history?.items)) throw new Error('trial_history_shape');
      return history;
    },
    enabled: enabled && studentId !== '',
  });
}

/**
 * POST {base}/trial-date/check on the review: the clashes of the picked time ([] = free), asked
 * again whenever the picked time or teacher changes (the request id is not part of the key).
 */
export function useTrialDateCheck(body: TrialDateBody | null) {
  const path = bookingPath(useBookingMode(), '/trial-date/check');
  return useQuery({
    queryKey: [...pathKey(path), body ? { ...body, clientRequestId: undefined } : null],
    queryFn: () => apiSend<{ conflicts: Conflict[] }>('POST', path, body),
    enabled: body !== null,
    gcTime: 0,
  });
}

/** What a new trial date changes: its history, the lessons and calendars, the student and the chats. */
export function refreshAfterTrialDate(client: QueryClient, o: { mode: BookingMode; studentId: string }): void {
  void client.invalidateQueries({ queryKey: historyKey(o.mode, o.studentId) });
  void client.invalidateQueries({ queryKey: pathKey('/lessons') });
  void client.invalidateQueries({ queryKey: pathKey(`/students/${o.studentId}`) });
  void client.invalidateQueries({ queryKey: ['threads'] });
  if (o.mode === 'sales') void client.invalidateQueries({ queryKey: ['sales', 'money', 'family'] });
}

/**
 * «احجز الموعد الجديد»: POST {base}/trial-date with the wizard's one clientRequestId, re-sent on
 * every retry, so a lost reply replays to the first booking (rule 8).
 */
export function useTrialDate(studentId: string) {
  const client = useQueryClient();
  const mode = useBookingMode();
  return useMutation({
    mutationKey: ['booking', 'trial-date', studentId],
    mutationFn: (body: TrialDateBody) => apiSend<TrialDateResult>('POST', bookingPath(mode, '/trial-date'), body),
    onSuccess: () => refreshAfterTrialDate(client, { mode, studentId }),
  });
}
