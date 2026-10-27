import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { booked, maryam } from '@/booking/testing/fixtures';
import { dayLine } from '@/booking/shared/picks';
import { t } from '@/core/lib/i18n/i18n';
import { localDay } from '@/payments/format';
import { fakeNow } from '@/test/fake-now';
import { renderWithQuery } from '@/test/query';
import { daysText, weekdayName } from '../lib/course-days';
import { fakeCourseApi, isDisabled, press, pressEnabled } from '../testing/course-test-utils';
import { CourseScreen } from '../screens/CourseScreen';
import { bookedCourse, courseView, PREV_SUB_ID, STUDENT_ID } from '../testing/fixtures';

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
// The previous course ends Saturday 10 Oct: the renewal opens Sunday 11 Oct, on the same days.
const SUN_11 = '2026-10-11T14:00:00.000Z';
const THU_15 = '2026-10-15T15:00:00.000Z';
const previous = bookedCourse({ endsOn: '2026-10-10' });
const sent = (path: string) => mockApiSend.mock.calls.filter((c: unknown[]) => c[1] === path);
const reads = (prefix: string) => mockApiFetch.mock.calls.map((c: unknown[]) => String(c[0])).filter((p) => p.startsWith(prefix));

beforeEach(() => {
  jest.clearAllMocks();
  fakeNow(new Date('2026-10-01T00:00:00Z'));
  mockApiFetch.mockImplementation(fakeCourseApi(courseView({ previous })).fetch);
  mockApiSend.mockImplementation(async (_m: string, path: string) =>
    path === '/sales/booking/check' ? { conflicts: [] } : booked(SUN_11),
  );
});
afterEach(() => jest.useRealTimers());

test('a renewal offers the previous days from the day after its last lesson', async () => {
  await renderWithQuery(<CourseScreen />);
  const hint = t.booking.courseChange.continueHint
    .replace('{days}', daysText(previous.days, TZ, '24'))
    .replace('{date}', localDay('2026-10-11'));
  expect(await screen.findByText(hint)).toBeTruthy();
  expect(screen.getByRole('button', { name: t.booking.courseChange.pickOtherDays })).toBeTruthy();
  expect(screen.queryByText(maryam.display_name_ar)).toBeNull(); // no teacher list yet
});

test('«تابِع بنفس الأيام»: the same teacher and days, prefilled, checked and booked on the new subscription', async () => {
  await renderWithQuery(<CourseScreen />);
  await pressEnabled(t.booking.courseChange.continueSameDays);
  expect(await screen.findByText(dayLine(SUN_11, TZ, '24'))).toBeTruthy();
  expect(screen.getByText(dayLine(THU_15, TZ, '24'))).toBeTruthy();
  expect(await screen.findByText(maryam.display_name_ar)).toBeTruthy(); // the summary's teacher, once loaded
  expect(await screen.findByText(t.booking.seriesFree)).toBeTruthy();
  const body = {
    kind: 'package',
    studentIds: [STUDENT_ID],
    teacherId: maryam.id,
    byday: [0, 4],
    startTimeLocal: '17:00',
    startsOn: '2026-10-11',
    startsAt: SUN_11,
    dayTimes: [{ weekday: 4, startTimeLocal: '18:00' }],
    tz: TZ,
    durationMin: 45,
    package: '8',
  };
  expect(sent('/sales/booking/check')[0]?.[2]).toMatchObject(body);
  expect(JSON.stringify(sent('/sales/booking/check')[0]?.[2])).not.toContain(PREV_SUB_ID);
  expect(reads('/sales/booking/slots')).toHaveLength(0); // straight to the review
  await waitFor(() => expect(isDisabled(t.booking.submit)).toBe(false));
  await press('button', t.booking.submit);
  expect(await screen.findByText(t.booking.booked)).toBeTruthy();
  expect(sent('/sales/booking')[0]?.[2]).toMatchObject({ ...body, clientRequestId: expect.stringMatching(/^[0-9a-f-]{36}$/) });
});

test('a prefilled day taken since: its day is named, «اختر موعدًا آخر» keeps the picks', async () => {
  mockApiSend.mockImplementation(async () => ({
    conflicts: [{ kind: 'teacher_busy', startsAt: THU_15, endsAt: '2026-10-15T15:45:00.000Z' }],
  }));
  await renderWithQuery(<CourseScreen />);
  await pressEnabled(t.booking.courseChange.continueSameDays);
  const taken = t.booking.courseChange.continueTaken.replace('{day}', weekdayName(4));
  expect(await screen.findByText(taken)).toBeTruthy();
  expect(isDisabled(t.booking.submit)).toBe(true);
  await press('button', t.booking.changeSlot);
  await screen.findAllByRole('checkbox', { name: '17:00' });
  expect(screen.getByText(dayLine(SUN_11, TZ, '24'))).toBeTruthy(); // the picks stay
  expect(screen.getByText(dayLine(THU_15, TZ, '24'))).toBeTruthy();
  const [slots] = reads('/sales/booking/slots');
  expect(slots).toContain(`teacherId=${maryam.id}`);
  expect(slots).toContain(`from=${encodeURIComponent('2026-10-10T21:00:00.000Z')}`); // midnight 11 Oct, Riyadh
  expect(sent('/sales/booking')).toHaveLength(0);
});

test('«اختر أيامًا أخرى»: the teacher step, then the days from the day after the previous course', async () => {
  await renderWithQuery(<CourseScreen />);
  await press('button', t.booking.courseChange.pickOtherDays);
  await fireEvent.press(await screen.findByText(maryam.display_name_ar));
  await screen.findAllByRole('checkbox', { name: '17:00' });
  expect(reads('/sales/booking/slots')[0]).toContain(`from=${encodeURIComponent('2026-10-10T21:00:00.000Z')}`);
  await press('button', t.common.back);
  await press('button', t.common.back);
  expect(await screen.findByRole('button', { name: t.booking.courseChange.continueSameDays })).toBeTruthy();
});
