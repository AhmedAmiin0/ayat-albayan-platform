import { screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { fakeNow } from '@/test/fake-now';
import { renderWithQuery } from '@/test/query';
import { isDisabled, press } from '../course-test-utils';
import { CourseScreen } from '../CourseScreen';
import { changeApi, changeSundayToMonday, NOW } from './change-test-setup';

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
const sent = (path: string) => mockApiSend.mock.calls.filter((c: unknown[]) => c[1] === path);
const clash = { kind: 'teacher_busy', startsAt: '2026-10-08T15:00:00.000Z', endsAt: '2026-10-08T15:45:00.000Z' };

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

test('a clash: only «اختر موعدًا آخر», no override, nothing saved', async () => {
  mockApiSend.mockResolvedValue({ conflicts: [clash], remaining: 5, endsOn: '2026-10-29' });
  await toReview();
  expect(await screen.findByRole('button', { name: t.booking.changeSlot })).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.booking.override })).toBeNull();
  expect(isDisabled(t.booking.courseChange.submit)).toBe(true);
  await press('button', t.booking.changeSlot);
  expect(await screen.findAllByRole('checkbox', { name: '17:00' })).toBeTruthy();
  expect(sent(CHANGE)).toHaveLength(0);
});

test('a course with nothing left: the check’s refusal line, no save', async () => {
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'course_finished', message: 'x' }));
  await toReview();
  expect(await screen.findByText(t.booking.error.course_finished)).toBeTruthy();
  expect(isDisabled(t.booking.courseChange.submit)).toBe(true);
});

test('a clash since the check: the save’s 409 shows the clash and the way back to the days', async () => {
  mockApiSend.mockImplementation(async (_m: string, path: string) => {
    if (path === `${CHANGE}/check`) return { conflicts: [], remaining: 5, endsOn: '2026-10-29' };
    throw new ApiError(409, { code: 'conflict', message: 'x', conflicts: [clash] });
  });
  await toReview();
  await waitFor(() => expect(isDisabled(t.booking.courseChange.submit)).toBe(false));
  await press('button', t.booking.courseChange.submit);
  expect(await screen.findByRole('button', { name: t.booking.changeSlot })).toBeTruthy();
  expect(screen.queryByText(t.booking.courseChange.done)).toBeNull();
});
