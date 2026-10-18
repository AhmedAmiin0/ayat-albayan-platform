import { screen, waitFor } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { fakeNow } from '@/test/fake-now';
import { renderWithQuery } from '@/test/query';
import { fakeCourseApi, isDisabled } from './course-test-utils';
import { CourseScreen } from './CourseScreen';
import { bookedCourse, courseView } from './fixtures';

const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: jest.fn(),
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ studentId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' }),
}));

/** The course view as usual; the teacher list answers `teachers` instead. */
function serve(teachers: () => Promise<unknown>) {
  const api = fakeCourseApi(courseView({ previous: bookedCourse() }));
  mockApiFetch.mockImplementation((path: string) => (path.startsWith('/sales/booking/teachers') ? teachers() : api.fetch(path)));
}
const teachersRead = () => mockApiFetch.mock.calls.some((c: unknown[]) => String(c[0]).startsWith('/sales/booking/teachers'));

beforeEach(() => {
  jest.clearAllMocks();
  fakeNow(new Date('2026-10-01T00:00:00Z'));
});
afterEach(() => jest.useRealTimers());

test('the teacher list still loading: «تابِع بنفس الأيام» waits (disabled), nothing said yet', async () => {
  serve(() => new Promise(() => undefined));
  await renderWithQuery(<CourseScreen />);
  await screen.findByRole('button', { name: t.booking.courseChange.continueSameDays });
  await waitFor(() => expect(teachersRead()).toBe(true));
  expect(isDisabled(t.booking.courseChange.continueSameDays)).toBe(true);
  expect(screen.queryByText(t.booking.courseChange.teacherUnavailable)).toBeNull();
  expect(isDisabled(t.booking.courseChange.pickOtherDays)).toBe(false);
});

test('the teacher list failed: counted as unavailable, said so, «تابِع» disabled', async () => {
  serve(() => Promise.reject(new Error('offline')));
  await renderWithQuery(<CourseScreen />);
  expect(await screen.findByText(t.booking.courseChange.teacherUnavailable)).toBeTruthy();
  expect(isDisabled(t.booking.courseChange.continueSameDays)).toBe(true);
  expect(isDisabled(t.booking.courseChange.pickOtherDays)).toBe(false);
});
