import {
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { apiFetch, apiSend, pathKey } from '@ab/mobile-kit';
import { salesTrialDateCalls, trialDateCalls, type BookingMode } from '@ab/client-core';
import { salesKeys } from '@/core/lib/keys';
import { bookingPath, useBookingMode } from '@/booking/shared/booking-mode';
import type { TrialDateBody } from './trial-date-body';

// Trial booking (R-SCH-06/07, R-STU-05, R-ASST-01) under /booking, or /sales/booking for sales.

const client = { apiFetch, apiSend };
const trialCalls = { admin: trialDateCalls(client), sales: salesTrialDateCalls(client) };

const historyKey = (mode: BookingMode, studentId: string) => [
  ...pathKey(bookingPath(mode, '/trial-dates')),
  studentId,
];

/** GET {base}/trial-dates?studentId: every trial time picked for the student, newest pick first. */
export function useTrialHistory(studentId: string, enabled = true) {
  const mode = useBookingMode();
  return useQuery({
    queryKey: historyKey(mode, studentId),
    // A wrong shape is a failed read (with its retry), never a crash of the student file around it.
    queryFn: () => trialCalls[mode].history(studentId),
    enabled: enabled && studentId !== '',
  });
}

/**
 * POST {base}/trial-date/check on the review: the clashes of the picked time ([] = free), asked
 * again whenever the picked time, length or teacher changes (neither the request id nor the typed
 * meeting link is part of the key or the probe: typing the link never re-checks).
 */
export function useTrialDateCheck(body: TrialDateBody | null) {
  const mode = useBookingMode();
  const path = bookingPath(mode, '/trial-date/check');
  const probe = body ? { ...body, meetingLink: undefined } : null;
  return useQuery({
    queryKey: [...pathKey(path), probe ? { ...probe, clientRequestId: undefined } : null],
    queryFn: probe ? () => trialCalls[mode].check(probe) : skipToken,
    gcTime: 0,
  });
}

/** What a new trial date changes: its history, the lessons and calendars, the student and the chats. */
function refreshAfterTrialDate(
  client: QueryClient,
  o: { mode: BookingMode; studentId: string },
): void {
  void client.invalidateQueries({ queryKey: historyKey(o.mode, o.studentId) });
  void client.invalidateQueries({ queryKey: pathKey('/lessons') });
  void client.invalidateQueries({ queryKey: pathKey(`/students/${o.studentId}`) });
  void client.invalidateQueries({ queryKey: pathKey('/threads') });
  if (o.mode === 'sales') void client.invalidateQueries({ queryKey: salesKeys.families });
}

/** One clientRequestId per wizard re-sent on retry, so a lost reply replays the first (rule 8). */
export function useTrialDate(studentId: string) {
  const client = useQueryClient();
  const mode = useBookingMode();
  return useMutation({
    mutationKey: ['booking', 'trial-date', studentId],
    mutationFn: (body: TrialDateBody) => trialCalls[mode].pick(body),
    onSuccess: () => refreshAfterTrialDate(client, { mode, studentId }),
    // trial_changed and the like: the history (and what the next pick moves) is read again.
    onError: () => client.invalidateQueries({ queryKey: historyKey(mode, studentId) }),
  });
}
