import { counted } from '@ab/shared';
import { screen, waitFor } from '@testing-library/react-native';
import { maryam } from '@/booking/testing/fixtures';
import { dayLine } from '@/booking/shared/picks';
import { t } from '@/core/lib/i18n/i18n';
import { localDay } from '@/payments/format';
import { fakeNow } from '@/test/fake-now';
import { renderWithQuery } from '@/test/query';
import { daysText } from '../lib/course-days';
import { isDisabled, press } from '../testing/course-test-utils';
import { CourseScreen } from '../screens/CourseScreen';
import { STUDENT_ID, SUB_ID } from '../testing/fixtures';
import { changeApi, changeBody, changeSundayToMonday, NOW, runningCourse, SUN_4, THU_1, TZ } from './change-test-setup';

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
const sent = (path: string) => mockApiSend.mock.calls.filter((c: unknown[]) => c[1] === path);
const reads = (prefix: string) => mockApiFetch.mock.calls.map((c: unknown[]) => String(c[0])).filter((p) => p.startsWith(prefix));

beforeEach(() => {
  jest.clearAllMocks();
  fakeNow(NOW);
  mockApiFetch.mockImplementation(changeApi().fetch);
  mockApiSend.mockImplementation(async (_m: string, path: string) =>
    path === `${CHANGE}/check`
      ? { conflicts: [], remaining: 5, endsOn: '2026-10-29' }
      : { subscriptionId: SUB_ID, ruleIds: ['r1', 'r2'], endsOn: '2026-10-29' },
  );
});
afterEach(() => jest.useRealTimers());

test('a running course shows its days and «تغيير أيام الحلقات» instead of the refusal', async () => {
  await renderWithQuery(<CourseScreen />);
  expect(await screen.findByText(t.booking.courseChange.currentDays.replace('{days}', daysText(runningCourse.days, TZ)))).toBeTruthy();
  expect(screen.getByRole('button', { name: t.booking.courseChange.changeDays })).toBeTruthy();
  expect(screen.queryByText(t.booking.courseBlocked.course_exists)).toBeNull();
});

test('the days come prefilled from today, the course’s own lessons not busy; «التالي» is not held on the client', async () => {
  await renderWithQuery(<CourseScreen />);
  await press('button', t.booking.courseChange.changeDays);
  await screen.findAllByRole('checkbox', { name: '17:00' });
  expect(screen.getByText(dayLine(THU_1, TZ))).toBeTruthy();
  expect(screen.getByText(dayLine(SUN_4, TZ))).toBeTruthy();
  // Nothing changed yet: only the series check knows (its 400 no_change), so «التالي» is open.
  expect(isDisabled(t.booking.next)).toBe(false);
  await press('checkbox', '17:00'); // Sunday off: one day short
  expect(isDisabled(t.booking.next)).toBe(true);
  await press('checkbox', '19:00'); // Monday 19:00 instead
  expect(isDisabled(t.booking.next)).toBe(false);
  const [slots] = reads('/sales/booking/slots');
  expect(slots).toContain(`teacherId=${maryam.id}`);
  expect(slots).toContain('durationMin=45');
  expect(slots).toContain(`studentIds=${STUDENT_ID}`);
  expect(slots).toContain(`excludeCourse=${SUB_ID}`);
});

test('the review: the current and new days, what is left and the new last day; «احفظ» posts once', async () => {
  const { router } = jest.requireMock<{ router: { back: jest.Mock } }>('expo-router');
  await renderWithQuery(<CourseScreen />);
  await press('button', t.booking.courseChange.changeDays);
  await changeSundayToMonday();
  expect(await screen.findByText(counted(t.booking.courseChange.remaining, 5))).toBeTruthy();
  const days = (key: 'currentDays' | 'newDays', list: { weekday: number; startTimeLocal: string }[]) =>
    t.booking.courseChange[key].replace('{days}', daysText(list, TZ));
  expect(screen.getByText(days('currentDays', runningCourse.days))).toBeTruthy();
  const monday = [{ weekday: 1, startTimeLocal: '19:00' }, { weekday: 4, startTimeLocal: '18:00' }];
  expect(screen.getByText(days('newDays', monday))).toBeTruthy();
  const tree = JSON.stringify(screen.toJSON());
  expect(tree.indexOf(days('newDays', monday))).toBeLessThan(tree.indexOf(counted(t.booking.courseChange.remaining, 5)));
  const end = t.booking.courseChange.newEnd.replace('{date}', localDay('2026-10-29'));
  expect(screen.getByText(end)).toBeTruthy();
  expect(sent(`${CHANGE}/check`)[0]?.[2]).toMatchObject(changeBody);
  await waitFor(() => expect(isDisabled(t.booking.courseChange.submit)).toBe(false));
  await press('button', t.booking.courseChange.submit);

  expect(await screen.findByText(t.booking.courseChange.done)).toBeTruthy();
  const [post] = sent(CHANGE);
  expect(post?.[0]).toBe('POST');
  expect(post?.[2]).toEqual({ ...changeBody, clientRequestId: expect.stringMatching(/^[0-9a-f-]{36}$/) });
  await press('button', t.salesMoney.done);
  expect(router.back).toHaveBeenCalled();
});

test('«رجوع» from the days goes back to the course screen', async () => {
  await renderWithQuery(<CourseScreen />);
  await press('button', t.booking.courseChange.changeDays);
  await screen.findAllByRole('checkbox', { name: '17:00' });
  await press('button', t.common.back);
  expect(await screen.findByRole('button', { name: t.booking.courseChange.changeDays })).toBeTruthy();
  expect(sent(`${CHANGE}/check`)).toHaveLength(0);
});
