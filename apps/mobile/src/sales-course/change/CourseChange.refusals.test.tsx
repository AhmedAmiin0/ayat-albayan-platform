import '@/test/warm-rn';
import { screen, waitFor } from '@testing-library/react-native';
import { slot } from '@/booking/testing/fixtures';
import { dayStartUtc } from '@/booking/shared/slots';
import { dayLine } from '@/booking/shared/picks';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { fakeNow } from '@/test/fake-now';
import { renderWithQuery } from '@/test/query';
import { isDisabled, press } from '../testing/course-test-utils';
import { CourseScreen } from '../screens/CourseScreen';
import { courseView } from '../testing/fixtures';
import { changeApi, changeSundayToMonday, NOW, runningCourse, TZ, windowed } from './change-test-setup';

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

const CHANGE = '/sales/booking/course/change';

beforeEach(() => {
  jest.clearAllMocks();
  fakeNow(NOW);
  mockApiFetch.mockImplementation(changeApi().fetch);
});
afterEach(() => jest.useRealTimers());

async function toReview() {
  await renderWithQuery(<CourseScreen />);
  await press('button', t.booking.courseChange.changeDays);
  await changeSundayToMonday();
}

test.each(['no_change', 'starts_at_mismatch', 'starts_before_course', 'course_changed'])(
  'the check refused with %s: its own line, no retry, no save',
  async (code) => {
    mockApiSend.mockRejectedValue(new ApiError(code === 'course_changed' ? 409 : 400, { code, message: 'x' }));
    await toReview();
    const errors: Record<string, string> = t.booking.error;
    expect(await screen.findByText(errors[code] ?? '')).toBeTruthy();
    expect(screen.queryByText(t.mobile.retry)).toBeNull();
    expect(isDisabled(t.booking.courseChange.submit)).toBe(true);
  },
);

test('the save refused with course_changed: its own line, nothing done', async () => {
  mockApiSend.mockImplementation(async (_m: string, path: string) => {
    if (path === `${CHANGE}/check`) return { conflicts: [], remaining: 5, endsOn: '2026-10-29' };
    throw new ApiError(409, { code: 'course_changed', message: 'x' });
  });
  await toReview();
  await waitFor(() => expect(isDisabled(t.booking.courseChange.submit)).toBe(false));
  await press('button', t.booking.courseChange.submit);
  expect(await screen.findByText(t.booking.error.course_changed)).toBeTruthy();
  expect(screen.queryByText(t.booking.courseChange.done)).toBeNull();
});

test('a course booked ahead (a renewal) is changed from its own first week: the slots are read from it', async () => {
  const ahead = { ...runningCourse, startsOn: '2026-10-11', opensOn: '2026-10-11', endsOn: '2026-11-05', running: false };
  const api = changeApi(courseView({ blocked: 'course_exists', current: ahead }));
  // Its own week's slots: Sunday 11 Oct 17:00, Monday 12 Oct 19:00, Thursday 15 Oct 18:00 (Riyadh).
  api.api.slots.push(slot('2026-10-11T14:00:00.000Z'), slot('2026-10-12T16:00:00.000Z'), slot('2026-10-15T15:00:00.000Z'));
  mockApiFetch.mockImplementation(windowed(api.fetch));
  mockApiSend.mockResolvedValue({ conflicts: [], remaining: 8, endsOn: '2026-11-05' });
  await renderWithQuery(<CourseScreen />);
  expect(await screen.findByText(t.booking.courseChange.upcoming)).toBeTruthy();
  await press('button', t.booking.courseChange.changeDays);
  expect(await screen.findByText(dayLine('2026-10-11T14:00:00.000Z', TZ, '24'))).toBeTruthy(); // Sunday 11 Oct 17:00
  // The picks are seeded once the slots answer, a render after the day lines: wait for the check itself.
  expect(await screen.findByRole('checkbox', { name: '17:00', checked: true })).toBeTruthy();
  expect(screen.getByText(dayLine('2026-10-15T15:00:00.000Z', TZ, '24'))).toBeTruthy(); // Thursday 15 Oct 18:00
  const [read] = mockApiFetch.mock.calls.map((c: unknown[]) => String(c[0])).filter((p) => p.startsWith('/sales/booking/slots'));
  expect(new URLSearchParams(read?.split('?')[1]).get('from')).toBe('2026-10-10T21:00:00.000Z'); // 11 Oct 00:00 Riyadh
  await changeSundayToMonday(); // on the grid: Sunday 17:00 off, Monday 12 Oct 19:00 on
  const [check] = mockApiSend.mock.calls.filter((c: unknown[]) => c[1] === `${CHANGE}/check`);
  expect((check?.[2] as { startsOn: string }).startsOn >= ahead.startsOn).toBe(true);
});

const slotsFrom = () => {
  const [read] = mockApiFetch.mock.calls.map((c: unknown[]) => String(c[0])).filter((p) => p.startsWith('/sales/booking/slots'));
  return new URLSearchParams(read?.split('?')[1]).get('from');
};

test('booked ahead with a pending change: slots and picks from the new set\'s start, checked, unchanged = no_change', async () => {
  // A renewal from Sun 11 Oct on Sun+Thu, Sunday swapped for Monday 19:00 from Mon 12 Oct before it starts: Sun 11 stays.
  const days = [{ weekday: 1, startTimeLocal: '19:00' }, { weekday: 4, startTimeLocal: '18:00' }];
  const ahead = { ...runningCourse, days, startsOn: '2026-10-12', opensOn: '2026-10-11', endsOn: '2026-11-05', running: false };
  const api = changeApi(courseView({ blocked: 'course_exists', current: ahead }));
  api.api.slots.push(slot('2026-10-11T14:00:00.000Z'), slot('2026-10-12T16:00:00.000Z'), slot('2026-10-15T15:00:00.000Z'));
  mockApiFetch.mockImplementation(windowed(api.fetch));
  mockApiSend.mockRejectedValue(new ApiError(400, { code: 'no_change', message: 'x' }));
  await renderWithQuery(<CourseScreen />);
  await press('button', t.booking.courseChange.changeDays);
  expect(await screen.findByRole('checkbox', { name: '19:00', checked: true })).toBeTruthy(); // Monday 12 Oct
  expect(screen.getByRole('checkbox', { name: '18:00', checked: true })).toBeTruthy(); // Thursday 15 Oct
  expect(screen.queryByRole('checkbox', { name: '17:00' })).toBeNull(); // the old Sunday 11 Oct: web only
  expect(slotsFrom()).toBe(dayStartUtc(ahead.startsOn, TZ).toISOString());
  await press('button', t.booking.next);
  expect(await screen.findByText(t.booking.error.no_change)).toBeTruthy();
  const [check] = mockApiSend.mock.calls.filter((c: unknown[]) => c[1] === `${CHANGE}/check`);
  expect(check?.[2]).toMatchObject({ startsOn: '2026-10-12', byday: [1, 4], startTimeLocal: '19:00' });
});

test('a pending change (its new days start later, the old ones still run): running, slots and picks from the new set, checked', async () => {
  const pending = { ...runningCourse, startsOn: '2026-10-11', running: true };
  const api = changeApi(courseView({ blocked: 'course_exists', current: pending }));
  api.api.slots.push(slot('2026-10-11T14:00:00.000Z'), slot('2026-10-15T15:00:00.000Z'));
  mockApiFetch.mockImplementation(windowed(api.fetch));
  mockApiSend.mockRejectedValue(new ApiError(400, { code: 'no_change', message: 'x' }));
  await renderWithQuery(<CourseScreen />);
  expect(await screen.findByText(t.booking.courseChange.running)).toBeTruthy();
  await press('button', t.booking.courseChange.changeDays);
  expect(await screen.findByRole('checkbox', { name: '17:00', checked: true })).toBeTruthy(); // Sunday 11 Oct
  expect(screen.getByRole('checkbox', { name: '18:00', checked: true })).toBeTruthy(); // Thursday 15 Oct
  expect(slotsFrom()).toBe(dayStartUtc(pending.startsOn, TZ).toISOString()); // not today
  await press('button', t.booking.next);
  expect(await screen.findByText(t.booking.error.no_change)).toBeTruthy();
  const [check] = mockApiSend.mock.calls.filter((c: unknown[]) => c[1] === `${CHANGE}/check`);
  // Sunday 11 Oct 17:00 first, not today 18:00 (an old-rule lesson).
  expect(check?.[2]).toMatchObject({ startsOn: '2026-10-11', startsAt: '2026-10-11T14:00:00.000Z' });
});
