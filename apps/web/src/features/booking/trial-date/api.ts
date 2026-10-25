import type { Conflict, TrialDateResult, TrialHistory } from '@ab/shared';
import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { LESSONS_KEY } from '@/features/schedule/api';
import { STUDENTS_KEY } from '@/features/students/api';
import { apiFetch, apiSend } from '@/lib/http/api';
import type { BookingBody } from '../contract';
import { bookingBase, type BookingMode } from '../mode';

// «موعد تجريبي جديد» routes (owner 2026-10-25, R-SCH-06, R-ASST-01) under the booking base of each
// mode: /booking (admin) or /sales/booking (the assistant, her students only).

/** Under LESSONS_KEY: every lesson write (a booking, a move, a cancel) refreshes the history too. */
export const TRIAL_DATES_KEY = [...LESSONS_KEY, 'trial-dates'] as const;

/** GET {base}/trial-dates?studentId — every trial time picked for the student, newest pick first. */
export const trialHistoryQuery = (studentId: string, mode: BookingMode = 'admin') =>
  queryOptions({
    queryKey: [...TRIAL_DATES_KEY, mode, studentId],
    queryFn: () => apiFetch<TrialHistory>(`${bookingBase(mode)}/trial-dates?studentId=${encodeURIComponent(studentId)}`),
  });

/**
 * POST {base}/trial-date/check — the new date's clashes, the moved trial left out server-side. The
 * same body as the booking check; keyed without its idempotency key and meeting link.
 */
export const trialDateCheckQuery = (body: BookingBody, mode: BookingMode = 'admin') => {
  const key: Partial<BookingBody> = { ...body };
  delete key.clientRequestId;
  delete key.meetingLink;
  return queryOptions({
    queryKey: ['booking', mode, 'trial-date-check', JSON.stringify(key)],
    queryFn: () => apiSend<{ conflicts: Conflict[] }>('POST', `${bookingBase(mode)}/trial-date/check`, body),
    retry: false,
  });
};

/**
 * POST {base}/trial-date — 201 the new trial (and the one it moved). 409 conflict (the admin may
 * resend with `override`), 409 trial_date_subscribed, 400 trial_date_invalid / date_in_past. The
 * body's clientRequestId makes a retry book once.
 */
export const createTrialDate = (body: BookingBody, mode: BookingMode = 'admin') =>
  apiSend<TrialDateResult>('POST', `${bookingBase(mode)}/trial-date`, body);

/** After a new trial date: lessons (the history and calendars are under it), students, chats and sales views. */
export async function refreshAfterTrialDate(queryClient: QueryClient): Promise<void> {
  await Promise.all(
    [LESSONS_KEY, STUDENTS_KEY, ['threads'], ['sales']].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
  );
}
