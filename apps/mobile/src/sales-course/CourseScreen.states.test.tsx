import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { booked, maryam, SUN_17 } from '@/booking/fixtures';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { localDay } from '@/payments/format';
import { renderWithQuery } from '@/test/query';
import { fakeCourseApi, isDisabled, press, walkToReview } from './course-test-utils';
import { CourseScreen } from './CourseScreen';
import { courseView, STUDENT_ID, SUB_ID } from './fixtures';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
const mockParams: { current: Record<string, string> } = { current: {} };
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => mockParams.current,
}));

const reads = (prefix: string) => mockApiFetch.mock.calls.map((c: unknown[]) => String(c[0])).filter((p) => p.startsWith(prefix));

beforeEach(() => {
  jest.clearAllMocks();
  mockParams.current = { studentId: STUDENT_ID };
});

test('after «احجز» the refetched course (now hers: course_exists) keeps the booked panel', async () => {
  const api = fakeCourseApi();
  mockApiFetch.mockImplementation(api.fetch);
  mockApiSend.mockImplementation(async (_m: string, path: string) => {
    if (path === '/sales/booking/check') return { conflicts: [] };
    api.api.view = courseView({ blocked: 'course_exists' });
    return booked(SUN_17);
  });
  await renderWithQuery(<CourseScreen />);
  await walkToReview();
  await waitFor(() => expect(isDisabled(t.booking.submit)).toBe(false));
  await press('button', t.booking.submit);
  expect(await screen.findByText(t.booking.booked)).toBeTruthy();
  await waitFor(() => expect(reads('/sales/booking/course')).toHaveLength(2));
  expect(screen.getByText(t.booking.booked)).toBeTruthy();
  expect(screen.queryByText(t.booking.courseBlocked.course_exists)).toBeNull();
});

test('a subscription that starts ahead: its first day in the header and the slots from then', async () => {
  const sub = { id: SUB_ID, package: '8' as const, duration: 45 as const, lessons_total: 8, starts_on: '2099-01-04' };
  mockApiFetch.mockImplementation(fakeCourseApi(courseView({ subscription: sub })).fetch);
  await renderWithQuery(<CourseScreen />);
  expect(await screen.findByText(t.booking.subscriptionStarts.replace('{date}', localDay('2099-01-04')))).toBeTruthy();
  await fireEvent.press(await screen.findByText(maryam.display_name_ar));
  await screen.findAllByRole('checkbox', { name: '17:00' });
  // Midnight of 4 Jan 2099 in Riyadh (+03).
  expect(reads('/sales/booking/slots')[0]).toContain(`from=${encodeURIComponent('2099-01-03T21:00:00.000Z')}`);
});

test('a failed course read after «احفظ الاشتراك»: its code’s line, a retry, and still the transfer', async () => {
  mockParams.current = { studentId: STUDENT_ID, phone: '+966501112223', subscriptionId: 'sub-1' };
  mockApiFetch.mockRejectedValue(new ApiError(403, { code: 'not_your_lead', message: 'x' }));
  await renderWithQuery(<CourseScreen />);
  expect(await screen.findByText(t.booking.error.not_your_lead)).toBeTruthy();
  expect(screen.getByRole('button', { name: t.mobile.retry })).toBeTruthy();
  expect(screen.getByRole('button', { name: t.salesMoney.stepTransfer })).toBeTruthy();
});

test('a read that failed without a code says the common line', async () => {
  mockApiFetch.mockRejectedValue(new ApiError(500, { code: 'internal', message: 'x' }));
  await renderWithQuery(<CourseScreen />);
  expect(await screen.findByText(t.common.error)).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.salesMoney.stepTransfer })).toBeNull();
});
