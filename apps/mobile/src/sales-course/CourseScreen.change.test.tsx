import { screen } from '@testing-library/react-native';
import { maryam } from '@/booking/fixtures';
import { t } from '@/lib/i18n';
import { fakeNow } from '@/test/fake-now';
import { renderWithQuery } from '@/test/query';
import { changeApi, runningCourse, TZ } from './change/change-test-setup';
import { daysText } from './course-days';
import { press } from './course-test-utils';
import { CourseScreen } from './CourseScreen';
import { courseView } from './fixtures';

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

const current = t.booking.courseChange.currentDays.replace('{days}', daysText(runningCourse.days, TZ));
const serve = (patch: Parameters<typeof courseView>[0]) => mockApiFetch.mockImplementation(changeApi(courseView(patch)).fetch);

beforeEach(() => {
  jest.clearAllMocks();
  fakeNow(new Date('2026-10-01T00:00:00Z'));
});
afterEach(() => jest.useRealTimers());

test('a renewal with the course still running: «تغيير أيام الحلقات» beside «تابِع بنفس الأيام»', async () => {
  serve({ previous: runningCourse, current: runningCourse });
  await renderWithQuery(<CourseScreen />);
  expect(await screen.findByRole('button', { name: t.booking.courseChange.continueSameDays })).toBeTruthy();
  expect(screen.getByText(current)).toBeTruthy();
  await press('button', t.booking.courseChange.changeDays);
  expect(await screen.findByText(t.booking.courseChange.changeHint)).toBeTruthy(); // the change flow
  expect(screen.queryByRole('button', { name: t.booking.courseChange.continueSameDays })).toBeNull();
});

test('a bookable student with a course booked: the change beside the teacher list', async () => {
  serve({ current: runningCourse });
  await renderWithQuery(<CourseScreen />);
  expect(await screen.findByText(maryam.display_name_ar)).toBeTruthy();
  expect(screen.getByRole('button', { name: t.booking.courseChange.changeDays })).toBeTruthy();
});

test('another refusal with a course: the refusal line and the change both', async () => {
  serve({ subscription: null, perWeek: null, blocked: 'subscription_required', current: runningCourse });
  await renderWithQuery(<CourseScreen />);
  expect(await screen.findByText(t.booking.courseBlocked.subscription_required)).toBeTruthy();
  expect(screen.getByRole('button', { name: t.booking.courseChange.changeDays })).toBeTruthy();
});

test('no course: no change offered', async () => {
  serve({});
  await renderWithQuery(<CourseScreen />);
  await screen.findByText(maryam.display_name_ar);
  expect(screen.queryByRole('button', { name: t.booking.courseChange.changeDays })).toBeNull();
});
