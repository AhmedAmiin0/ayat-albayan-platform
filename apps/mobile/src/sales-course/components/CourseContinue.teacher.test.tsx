import { counted, type BookedCourse } from '@ab/shared';
import { screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { fakeNow } from '@/test/fake-now';
import { renderWithQuery } from '@/test/query';
import { daysText } from '../lib/course-days';
import { fakeCourseApi, isDisabled, press } from '../testing/course-test-utils';
import { CourseContinue } from './CourseContinue';
import { CourseScreen } from '../screens/CourseScreen';
import { bookedCourse, courseView } from '../testing/fixtures';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
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

const busy = (name: string) => screen.getByRole('button', { name }).props.accessibilityState?.busy === true;

test('the teacher list still loading: «تابِع بنفس الأيام» waits, shown busy, nothing said yet', async () => {
  serve(() => new Promise(() => undefined));
  await renderWithQuery(<CourseScreen />);
  await screen.findByRole('button', { name: t.booking.courseChange.continueSameDays });
  await waitFor(() => expect(teachersRead()).toBe(true));
  expect(isDisabled(t.booking.courseChange.continueSameDays)).toBe(true);
  expect(busy(t.booking.courseChange.continueSameDays)).toBe(true);
  expect(screen.queryByText(t.booking.courseChange.teacherUnavailable)).toBeNull();
  expect(isDisabled(t.booking.courseChange.pickOtherDays)).toBe(false);
});

test('the teacher list failed: the error with a retry, never «unavailable»; the retry brings «تابِع» back', async () => {
  const api = fakeCourseApi(courseView({ previous: bookedCourse() }));
  let fails = true;
  serve(() => (fails ? Promise.reject(new Error('offline')) : api.fetch('/sales/booking/teachers')));
  await renderWithQuery(<CourseScreen />);
  expect(await screen.findByText(t.common.error)).toBeTruthy();
  expect(screen.queryByText(t.booking.courseChange.teacherUnavailable)).toBeNull();
  expect(isDisabled(t.booking.courseChange.continueSameDays)).toBe(true);
  expect(busy(t.booking.courseChange.continueSameDays)).toBe(false);
  expect(isDisabled(t.booking.courseChange.pickOtherDays)).toBe(false);
  fails = false;
  await press('button', t.mobile.retry);
  await waitFor(() => expect(isDisabled(t.booking.courseChange.continueSameDays)).toBe(false));
  expect(screen.queryByText(t.common.error)).toBeNull();
});

const teacher = { bookable: true, pending: false, failed: false, unavailable: false, refetch: jest.fn() };
const adjustHint = async (days: BookedCourse['days'], adjustTo: number) => {
  const previous = bookedCourse({ days, perWeek: days.length });
  const props = { previous, opensOn: '2026-10-11', teacher, adjustTo, onSame: jest.fn(), onOther: jest.fn() };
  await renderWithQuery(<CourseContinue {...props} />);
  return counted(t.booking.courseChange.continueAdjust, adjustTo).replace('{days}', daysText(days, previous.tz));
};

test('1 → 3 days a week: the target count, never «add or remove one day»', async () => {
  const hint = await adjustHint([{ weekday: 0, startTimeLocal: '17:00' }], 3);
  expect(screen.getByText(hint)).toBeTruthy();
  expect(hint).toMatch(/الباقة الجديدة 3 أيام في الأسبوع، فعدّل الأيام السابقة لتصبح 3 أيام$/);
});

test('3 → 1 day a week: one day, in the singular', async () => {
  const days = [0, 2, 4].map((weekday) => ({ weekday, startTimeLocal: '17:00' }));
  const hint = await adjustHint(days, 1);
  expect(screen.getByText(hint)).toBeTruthy();
  expect(hint).toMatch(/الباقة الجديدة يوم واحد في الأسبوع، فعدّل الأيام السابقة لتصبح يومًا واحدًا$/);
  expect(hint).not.toContain('أضف');
});
