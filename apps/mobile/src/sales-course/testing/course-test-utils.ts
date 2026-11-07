import type { SalesCourseView, SlotView } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { pickLesson } from '@/booking/testing/lesson-times';
import { maryam, noAvailability, slot, slotsAnswer, SUN_17, THU_18 } from '@/booking/testing/fixtures';
import { t } from '@/core/lib/i18n/i18n';
import { courseView } from './fixtures';

// Test-only helpers for the course wizard tests (the jest.mock calls stay in each test file).

/** A GET answerer for the mocked apiFetch: the course view, her teachers and their free slots. */
export function fakeCourseApi(view: SalesCourseView = courseView()) {
  const api: { view: SalesCourseView; slots: SlotView[] } = {
    view,
    slots: [slot(SUN_17), slot(THU_18)],
  };
  const fetch = (path: string): Promise<unknown> => {
    if (path.startsWith('/sales/booking/course')) return Promise.resolve(api.view);
    if (path.startsWith('/sales/booking/teachers')) return Promise.resolve([maryam, noAvailability]);
    if (path.startsWith('/sales/booking/slots')) {
      return Promise.resolve(slotsAnswer(api.slots));
    }
    return Promise.reject(new Error(`unexpected GET ${path}`));
  };
  return { api, fetch };
}

export const press = async (role: 'button' | 'checkbox', name: string | RegExp) =>
  fireEvent.press(await screen.findByRole(role, { name }));

export const isDisabled = (name: string) =>
  screen.getByRole('button', { name }).props.accessibilityState?.disabled === true;

/** Press a button once it is enabled (e.g. «تابِع» waits for the previous teacher to be confirmed). */
export async function pressEnabled(name: string) {
  await screen.findByRole('button', { name });
  await waitFor(() => expect(isDisabled(name)).toBe(false));
  await press('button', name);
}

export { pickLesson };

/** The teacher, then the Sunday 17:00 and Thursday 18:00 picks, then «التالي» → the review. */
export async function walkToReview() {
  await fireEvent.press(await screen.findByText(maryam.display_name_ar));
  await pickLesson(0, { date: '2026-10-04', time: '17:00' }); // SUN_17, Riyadh
  await pickLesson(1, { date: '2026-10-08', time: '18:00' }); // THU_18
  await press('button', t.booking.next);
  await screen.findByRole('button', { name: t.booking.submit });
}
