import type { TrialHistory } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { fakeBookingApi } from '@/booking/test-utils';
import { maryam } from '@/booking/fixtures';
import { t } from '@/lib/i18n';

// Test-only helpers for the trial-date screen tests (the jest.mock calls stay in each test file).

/** GET {base}/trial-dates → `history`; the teachers and slots as the booking tests serve them. */
export function fakeTrialApi(history: TrialHistory, base = '/booking') {
  const booking = fakeBookingApi();
  const fetch = (path: string): Promise<unknown> => {
    if (path.startsWith(`${base}/trial-dates`)) return Promise.resolve(history);
    return booking.fetch(path.replace(/^\/sales\/booking/, '/booking'));
  };
  return { api: booking.api, fetch };
}

/** POST …/check → no clash; POST …/trial-date → `result`. */
export function fakeTrialSend(result: unknown, conflicts: unknown[] = []) {
  return (method: string, path: string): Promise<unknown> =>
    path.endsWith('/trial-date/check') ? Promise.resolve({ conflicts }) : Promise.resolve(result);
}

/** Keep the last trial's teacher, then the free 17:00 slot: on the review, once its check answered. */
export async function walkToReview(time = '17:00') {
  await fireEvent.press(await screen.findByRole('button', { name: t.booking.mobile.keepTeacher.replace('{teacher}', maryam.display_name_ar) }));
  await fireEvent.press(await screen.findByRole('button', { name: new RegExp(`^${time}`) }));
  await screen.findByText(t.trialDate.mobile.newTime);
  // The clash check has answered: «احجز» is enabled (or the clash notice shows).
  await waitFor(() => expect(screen.queryByText(t.common.loading)).toBeNull());
}
