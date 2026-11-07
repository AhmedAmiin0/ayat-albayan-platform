import { screen, waitFor } from '@testing-library/react-native';
import { booked, SUN_17 } from '@/booking/testing/fixtures';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { fakeCourseApi, isDisabled, press, walkToReview } from '@/sales-course/testing/course-test-utils';
import { CourseScreen } from '@/sales-course/screens/CourseScreen';
import { courseView, STUDENT_ID } from '@/sales-course/testing/fixtures';
import { fakeNow } from '@/test/fake-now';

// Hold mode (owner 2026-11-06): unpaid with an open payment link, «احجز» keeps a draft.
const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
const mockParams: { current: Record<string, string> } = { current: {} };
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => mockParams.current,
}));

// The whole walk (teacher, two days, review, save) runs past jest's 5 s default on CI.
jest.setTimeout(30_000);

const BOOKING = booked(SUN_17);

/** «احجز» once the series check enabled it (slow CI runners: a wider wait than pressEnabled's). */
async function submit() {
  await waitFor(() => expect(isDisabled(t.booking.submit)).toBe(false), { timeout: 10_000 });
  await press('button', t.booking.submit);
}
const reply = (draft: unknown) => async (_m: string, path: string) =>
  path === '/sales/booking/check' ? { conflicts: [] } : draft;

// The picked lessons (from Sunday 4 Oct 2026) lie ahead: «now» is Friday 2 Oct.
beforeEach(() => {
  fakeNow(new Date('2026-10-02T06:00:00Z'));
  jest.clearAllMocks();
  mockParams.current = { studentId: STUDENT_ID };
  mockApiFetch.mockImplementation(fakeCourseApi(courseView({ hold: true })).fetch);
});
afterEach(() => jest.useRealTimers());

test('the picks are saved as a draft (PUT), nothing booked; «تم» leaves', async () => {
  mockApiSend.mockImplementation(reply({ state: 'draft', saved_at: '2026-11-06T09:00:00.000Z' }));
  await renderWithQuery(<CourseScreen />);
  expect(await screen.findByText(t.courseDraft.held)).toBeTruthy();
  await walkToReview();
  await submit();
  expect(await screen.findByText(t.courseDraft.saved, {}, { timeout: 10_000 })).toBeTruthy();
  const methods = mockApiSend.mock.calls.map((c: unknown[]) => `${String(c[0])} ${String(c[1])}`);
  expect(methods).toContain('PUT /sales/booking/course/draft');
  expect(methods).not.toContain('POST /sales/booking');
});

test('paid meanwhile: the draft endpoint booked it, the usual booked panel shows', async () => {
  mockApiSend.mockImplementation(reply({ state: 'booked', booking: BOOKING }));
  await renderWithQuery(<CourseScreen />);
  await walkToReview();
  await submit();
  const gone = () => expect(screen.queryByRole('button', { name: t.booking.submit })).toBeNull();
  await waitFor(gone, { timeout: 10_000 });
  expect(mockApiSend).toHaveBeenCalledWith('PUT', '/sales/booking/course/draft', expect.anything());
  expect(screen.queryByText(t.courseDraft.saved)).toBeNull();
});
