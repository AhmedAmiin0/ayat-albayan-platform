import { counted, pickProgress } from '@ab/shared';
import { screen, waitFor } from '@testing-library/react-native';
import { noAvailability } from '@/booking/testing/fixtures';
import { dayLine } from '@/booking/shared/picks';
import { t } from '@/core/lib/i18n/i18n';
import { localDay } from '@/payments/format';
import { fakeNow } from '@/test/fake-now';
import { renderWithQuery } from '@/test/query';
import { daysText } from './course-days';
import { fakeCourseApi, isDisabled, pressEnabled } from './course-test-utils';
import { CourseScreen } from './CourseScreen';
import { bookedCourse, courseView } from './fixtures';

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

const TZ = 'Asia/Riyadh';
const sent = (path: string) => mockApiSend.mock.calls.filter((c: unknown[]) => c[1] === path);
const serve = (patch: Parameters<typeof courseView>[0]) => mockApiFetch.mockImplementation(fakeCourseApi(courseView(patch)).fetch);

beforeEach(() => {
  jest.clearAllMocks();
  fakeNow(new Date('2026-10-01T00:00:00Z')); // Thursday 1 Oct, 03:00 Riyadh
  mockApiSend.mockResolvedValue({ conflicts: [] });
});
afterEach(() => jest.useRealTimers());

test('a previous course and a start weeks in the past: the days land in the coming week, from today', async () => {
  const sub = { id: 's', package: '8' as const, duration: 45 as const, lessons_total: 8, starts_on: '2026-09-01' };
  serve({ subscription: sub, previous: bookedCourse({ endsOn: '2026-08-20' }) });
  await renderWithQuery(<CourseScreen />);
  const hint = t.booking.courseChange.continueHint
    .replace('{days}', daysText(bookedCourse().days, TZ))
    .replace('{date}', localDay('2026-10-01'));
  expect(await screen.findByText(hint)).toBeTruthy();
  await pressEnabled(t.booking.courseChange.continueSameDays);
  expect(await screen.findByText(dayLine('2026-10-01T15:00:00.000Z', TZ))).toBeTruthy(); // today 18:00
  expect(screen.getByText(dayLine('2026-10-04T14:00:00.000Z', TZ))).toBeTruthy(); // Sunday 17:00
  expect(sent('/sales/booking/check')[0]?.[2]).toMatchObject({
    startsOn: '2026-10-01',
    startTimeLocal: '18:00',
    dayTimes: [{ weekday: 0, startTimeLocal: '17:00' }],
  });
});

test('a plan of other days a week: said so, no «تابِع»; «عدّل الأيام السابقة» opens the days, prefilled, to add one', async () => {
  serve({ perWeek: 3, previous: bookedCourse() });
  await renderWithQuery(<CourseScreen />);
  const adjust = counted(t.booking.courseChange.continueAdjust, 3).replace('{days}', daysText(bookedCourse().days, TZ));
  expect(await screen.findByText(adjust)).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.booking.courseChange.continueSameDays })).toBeNull();
  await pressEnabled(t.booking.courseChange.adjustDays);
  await screen.findAllByRole('checkbox', { name: '17:00' });
  expect(screen.getByText(dayLine('2026-10-11T14:00:00.000Z', TZ))).toBeTruthy();
  expect(screen.getByText(dayLine('2026-10-15T15:00:00.000Z', TZ))).toBeTruthy();
  expect(screen.getByText(pickProgress(t.booking, 2, 3) ?? '')).toBeTruthy();
  expect(isDisabled(t.booking.next)).toBe(true);
  expect(sent('/sales/booking/check')).toHaveLength(0);
});

test.each([
  ['no longer listed', 'ffffffff-ffff-4fff-8fff-ffffffffffff'],
  ['without free time', noAvailability.id],
])('the previous teacher %s: said so, «تابِع» disabled, «اختر أيامًا أخرى» still there', async (_why, teacherId) => {
  serve({ previous: bookedCourse({ teacherId }) });
  await renderWithQuery(<CourseScreen />);
  expect(await screen.findByText(t.booking.courseChange.teacherUnavailable)).toBeTruthy();
  expect(isDisabled(t.booking.courseChange.continueSameDays)).toBe(true);
  expect(isDisabled(t.booking.courseChange.pickOtherDays)).toBe(false);
});

test('a bookable previous teacher: no unavailable line', async () => {
  serve({ previous: bookedCourse() });
  await renderWithQuery(<CourseScreen />);
  await screen.findByRole('button', { name: t.booking.courseChange.continueSameDays });
  await waitFor(() => expect(mockApiFetch.mock.calls.some((c: unknown[]) => String(c[0]).startsWith('/sales/booking/teachers'))).toBe(true));
  expect(screen.queryByText(t.booking.courseChange.teacherUnavailable)).toBeNull();
  expect(isDisabled(t.booking.courseChange.continueSameDays)).toBe(false);
});
