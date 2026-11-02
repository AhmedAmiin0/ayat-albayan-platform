import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { booked, maryam, SUN_17 } from '@/booking/testing/fixtures';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { pathKey } from '@/core/lib/query/query-keys';
import { localDay } from '@/core/lib/money/format';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { fakeCourseApi, isDisabled, press, walkToReview } from '@/sales-course/testing/course-test-utils';
import { CourseScreen } from './CourseScreen';
import { courseView, STUDENT_ID, SUB_ID } from '@/sales-course/testing/fixtures';

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

test('a stale cached bookable view does not latch: the fresh course_exists shows the blocked line', async () => {
  const client = createTestQueryClient();
  client.setQueryData([...pathKey('/sales/booking/course'), { studentId: STUDENT_ID }], courseView());
  mockApiFetch.mockImplementation(fakeCourseApi(courseView({ blocked: 'course_exists' })).fetch);
  await renderWithQuery(<CourseScreen />, client);
  expect(await screen.findByText(t.booking.courseBlocked.course_exists)).toBeTruthy();
});

test.each([
  [403, 'not_your_student'],
  [404, 'student_not_found'],
] as const)('a refused course read (%i %s): its line, no retry, and still the transfer', async (status, code) => {
  mockParams.current = { studentId: STUDENT_ID, phone: '+966501112223', subscriptionId: 'sub-1' };
  mockApiFetch.mockRejectedValue(new ApiError(status, { code, message: 'x' }));
  await renderWithQuery(<CourseScreen />);
  expect(await screen.findByText(t.booking.error[code])).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.mobile.retry })).toBeNull();
  expect(screen.getByRole('button', { name: t.salesMoney.stepTransfer })).toBeTruthy();
});

test('a read that failed without a code says the common line, with a retry', async () => {
  mockApiFetch.mockRejectedValue(new ApiError(500, { code: 'internal', message: 'x' }));
  await renderWithQuery(<CourseScreen />);
  expect(await screen.findByText(t.common.error)).toBeTruthy();
  expect(screen.getByRole('button', { name: t.mobile.retry })).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.salesMoney.stepTransfer })).toBeNull();
});
