import { salesTrialDateCalls, trialDateCalls, type BookingMode } from '@ab/client-core';
import type { BookingRequest } from '@ab/shared';
import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { lessonKeys, LESSONS_KEY } from '@/features/teaching/schedule';
import { STUDENTS_KEY } from '@/features/people/students/api';
import { apiFetch, apiSend } from '@ab/web-kit';
import { bookingKeys } from '@/features/teaching/booking/booking.keys';

// Admin or sales routes (R-SCH-06, R-ASST-01); sales covers her students only.

const client = { apiFetch, apiSend };
const trialCalls = { admin: trialDateCalls(client), sales: salesTrialDateCalls(client) };

/** Under LESSONS_KEY: every lesson write (booking, move, cancel) refreshes the history too. */
export const TRIAL_DATES_KEY = lessonKeys.trialDates;

/** GET {base}/trial-dates?studentId: every trial time picked for the student, newest first. */
export const trialHistoryQuery = (studentId: string, mode: BookingMode = 'admin') =>
  queryOptions({
    queryKey: lessonKeys.trialHistory(mode, studentId),
    queryFn: () => trialCalls[mode].history(studentId),
  });

/**
 * POST {base}/trial-date/check — the new date's clashes, the moved trial left out server-side. The
 * same body as the booking check; keyed without its idempotency key and meeting link.
 */
export const trialDateCheckQuery = (body: BookingRequest, mode: BookingMode = 'admin') => {
  // The link is never sent: it is validated on the booking itself.
  const probe = { ...body, meetingLink: undefined };
  const key = { ...probe, clientRequestId: undefined };
  return queryOptions({
    queryKey: bookingKeys.trialDateCheck(mode, JSON.stringify(key)),
    queryFn: () => trialCalls[mode].check(probe),
    retry: false,
  });
};

/**
 * POST {base}/trial-date — 201 the new trial (and the one it moved). 409 conflict (the admin may
 * resend with `override`), 409 trial_date_subscribed, 400 trial_date_invalid / date_in_past. The
 * body's clientRequestId makes a retry book once.
 */
export const createTrialDate = (body: BookingRequest, mode: BookingMode = 'admin') =>
  trialCalls[mode].pick(body);

/** After a new trial date: lessons (history and calendars), students, chats and sales views. */
export async function refreshAfterTrialDate(queryClient: QueryClient): Promise<void> {
  await Promise.all(
    [LESSONS_KEY, STUDENTS_KEY, ['threads'], ['sales']].map((queryKey) =>
      queryClient.invalidateQueries({ queryKey }),
    ),
  );
}
