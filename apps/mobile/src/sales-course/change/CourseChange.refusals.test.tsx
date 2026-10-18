import { screen, waitFor } from '@testing-library/react-native';
import { slot } from '@/booking/fixtures';
import { dayLine } from '@/booking/picks';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { fakeNow } from '@/test/fake-now';
import { renderWithQuery } from '@/test/query';
import { isDisabled, press } from '../course-test-utils';
import { CourseScreen } from '../CourseScreen';
import { courseView } from '../fixtures';
import { changeApi, changeSundayToMonday, NOW, runningCourse, THU_1, TZ, windowed } from './change-test-setup';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
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
  const ahead = { ...runningCourse, startsOn: '2026-10-11', endsOn: '2026-11-05', running: false };
  const api = changeApi(courseView({ blocked: 'course_exists', current: ahead }));
  // Its own week's slots: Sunday 11 Oct 17:00, Monday 12 Oct 19:00, Thursday 15 Oct 18:00 (Riyadh).
  api.api.slots.push(slot('2026-10-11T14:00:00.000Z'), slot('2026-10-12T16:00:00.000Z'), slot('2026-10-15T15:00:00.000Z'));
  mockApiFetch.mockImplementation(windowed(api.fetch));
  mockApiSend.mockResolvedValue({ conflicts: [], remaining: 8, endsOn: '2026-11-05' });
  await renderWithQuery(<CourseScreen />);
  expect(await screen.findByText(t.booking.courseChange.upcoming)).toBeTruthy();
  await press('button', t.booking.courseChange.changeDays);
  expect(await screen.findByText(dayLine('2026-10-11T14:00:00.000Z', TZ))).toBeTruthy(); // Sunday 11 Oct 17:00
  expect(screen.getByText(dayLine('2026-10-15T15:00:00.000Z', TZ))).toBeTruthy(); // Thursday 15 Oct 18:00
  const [read] = mockApiFetch.mock.calls.map((c: unknown[]) => String(c[0])).filter((p) => p.startsWith('/sales/booking/slots'));
  expect(new URLSearchParams(read?.split('?')[1]).get('from')).toBe('2026-10-10T21:00:00.000Z'); // 11 Oct 00:00 Riyadh
  await changeSundayToMonday(); // on the grid: Sunday 17:00 off, Monday 12 Oct 19:00 on
  const [check] = mockApiSend.mock.calls.filter((c: unknown[]) => c[1] === `${CHANGE}/check`);
  expect((check?.[2] as { startsOn: string }).startsOn >= ahead.startsOn).toBe(true);
});

test('a pending change (its new days start later, the old ones still run): running, changed again from today', async () => {
  const pending = { ...runningCourse, startsOn: '2026-10-11', running: true };
  mockApiFetch.mockImplementation(changeApi(courseView({ blocked: 'course_exists', current: pending })).fetch);
  await renderWithQuery(<CourseScreen />);
  expect(await screen.findByText(t.booking.courseChange.running)).toBeTruthy();
  await press('button', t.booking.courseChange.changeDays);
  expect(await screen.findByText(dayLine(THU_1, TZ))).toBeTruthy(); // today 18:00, not 15 Oct
});
