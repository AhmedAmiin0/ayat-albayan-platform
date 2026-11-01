import { counted } from '@ab/shared';
import { screen, waitFor } from '@testing-library/react-native';
import { booked, SUN_17 } from '@/booking/testing/fixtures';
import { t } from '@/core/lib/i18n/i18n';
import { localDay } from '@/core/lib/money/format';
import { renderWithQuery } from '@/test/query';
import { isDisabled, fakeCourseApi, press, walkToReview } from '@/sales-course/testing/course-test-utils';
import { CourseScreen } from '@/sales-course/screens/CourseScreen';
import { courseView, SUB_ID } from '@/sales-course/testing/fixtures';

// Owner 2026-10-28: 1 of the 8 lessons was taken before the platform → the course books 7.
const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ studentId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' }),
}));

const subscription = { id: SUB_ID, package: '8' as const, duration: 45 as const, lessons_total: 8, lessons_used_before: 1, starts_on: '2026-10-04' };

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockImplementation(fakeCourseApi(courseView({ subscription })).fetch);
  mockApiSend.mockImplementation(async (_m: string, path: string) =>
    path === '/sales/booking/check' ? { conflicts: [] } : booked(SUN_17),
  );
});

test('the review and the done screen end the course on its 7th lesson (total − before)', async () => {
  await renderWithQuery(<CourseScreen />);
  await walkToReview();
  const ends = counted(t.booking.courseEnds, 7).replace('{date}', localDay('2026-10-25'));
  expect(await screen.findByText(ends)).toBeTruthy();
  expect(screen.queryByText(counted(t.booking.courseEnds, 8).replace('{date}', localDay('2026-10-29')))).toBeNull();
  await waitFor(() => expect(isDisabled(t.booking.submit)).toBe(false));
  await press('button', t.booking.submit);
  expect(await screen.findByText(t.booking.booked)).toBeTruthy();
  expect(screen.getByText(ends)).toBeTruthy();
});
