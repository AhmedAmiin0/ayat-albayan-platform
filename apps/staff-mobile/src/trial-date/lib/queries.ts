import type { TrialDateResult, TrialHistory } from '@ab/shared';
import type { Conflict } from '@ab/schedule';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend, toQueryString, pathKey } from '@ab/mobile-kit';
import type { BookingMode } from '@ab/client-core';
import { bookingPath, useBookingMode } from '@/booking/shared/booking-mode';
import type { TrialDateBody } from './trial-date-body';

// Trial booking (R-SCH-06/07, R-STU-05, R-ASST-01) under /booking, or /sales/booking for sales.

const historyKey = (mode: BookingMode, studentId: string) => [...pathKey(bookingPath(mode, '/trial-dates')), studentId];

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
 * again whenever the picked time, length or teacher changes (neither the request id nor the typed
 * meeting link is part of the key or the probe: typing the link never re-checks).
 */
export function useTrialDateCheck(body: TrialDateBody | null) {
  const path = bookingPath(useBookingMode(), '/trial-date/check');
  const probe = body ? { ...body, meetingLink: undefined } : null;
  return useQuery({
    queryKey: [...pathKey(path), probe ? { ...probe, clientRequestId: undefined } : null],
    queryFn: () => apiSend<{ conflicts: Conflict[] }>('POST', path, probe),
    enabled: body !== null,
    gcTime: 0,
  });
}

/** What a new trial date changes: its history, the lessons and calendars, the student and the chats. */
function refreshAfterTrialDate(client: QueryClient, o: { mode: BookingMode; studentId: string }): void {
  void client.invalidateQueries({ queryKey: historyKey(o.mode, o.studentId) });
  void client.invalidateQueries({ queryKey: pathKey('/lessons') });
  void client.invalidateQueries({ queryKey: pathKey(`/students/${o.studentId}`) });
  void client.invalidateQueries({ queryKey: ['threads'] });
  if (o.mode === 'sales') void client.invalidateQueries({ queryKey: ['sales', 'money', 'family'] });
}

/** One clientRequestId per wizard re-sent on retry, so a lost reply replays the first (rule 8). */
export function useTrialDate(studentId: string) {
  const client = useQueryClient();
  const mode = useBookingMode();
  return useMutation({
    mutationKey: ['booking', 'trial-date', studentId],
    mutationFn: (body: TrialDateBody) => apiSend<TrialDateResult>('POST', bookingPath(mode, '/trial-date'), body),
    onSuccess: () => refreshAfterTrialDate(client, { mode, studentId }),
    // trial_changed and the like: the history (and what the next pick moves) is read again.
    onError: () => client.invalidateQueries({ queryKey: historyKey(mode, studentId) }),
  });
}
