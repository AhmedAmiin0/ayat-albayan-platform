import { screen, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { maryam } from '@/booking/testing/fixtures';
import { t } from '@/core/lib/i18n/i18n';
import { fakeNow } from '@/test/fake-now';
import { renderWithQuery } from '@/test/query';
import { changeApi, runningCourse, TZ } from '../change/change-test-setup';
import { daysText } from '../lib/course-days';
import { press } from '../testing/course-test-utils';
import { CourseScreen } from './CourseScreen';
import { courseView } from '../testing/fixtures';

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

const current = t.booking.courseChange.currentDays.replace('{days}', daysText(runningCourse.days, TZ, '24'));
/** The filled (primary) buttons on screen: no input edge. */
const primaries = () =>
  screen.getAllByRole('button').filter((b) => StyleSheet.flatten(b.props.style).borderColor === 'transparent');
const serve = (patch: Parameters<typeof courseView>[0]) => mockApiFetch.mockImplementation(changeApi(courseView(patch)).fetch);

beforeEach(() => {
  jest.clearAllMocks();
  fakeNow(new Date('2026-10-01T00:00:00Z'));
});
afterEach(() => jest.useRealTimers());

test('a renewal with the course still running: «تغيير أيام الحلقات» the secondary beside «تابِع بنفس الأيام»', async () => {
  serve({ previous: runningCourse, current: runningCourse });
  await renderWithQuery(<CourseScreen />);
  expect(await screen.findByRole('button', { name: t.booking.courseChange.continueSameDays })).toBeTruthy();
  // The block says which package it is about; its days are named once (in the renewal's line).
  expect(screen.getByText(t.booking.courseChange.running)).toBeTruthy();
  expect(screen.queryByText(current)).toBeNull();
  expect(screen.getByText(new RegExp(daysText(runningCourse.days, TZ, '24')))).toBeTruthy();
  await waitFor(() => expect(primaries().map((b) => b.props.accessibilityState?.disabled)).toEqual([false]));
  expect(primaries()).toHaveLength(1);
  await press('button', t.booking.courseChange.changeDays);
  expect(await screen.findByText(t.booking.courseChange.changeHint)).toBeTruthy(); // the change flow
  expect(screen.queryByRole('button', { name: t.booking.courseChange.continueSameDays })).toBeNull();
});

test('a bookable student with a course booked ahead: «محجوزة تبدأ لاحقًا», its days, the change beside the teacher list', async () => {
  serve({ current: { ...runningCourse, running: false } });
  await renderWithQuery(<CourseScreen />);
  expect(await screen.findByText(maryam.display_name_ar)).toBeTruthy();
  expect(screen.getByText(t.booking.courseChange.upcoming)).toBeTruthy();
  expect(screen.getByText(current)).toBeTruthy();
  expect(screen.getByRole('button', { name: t.booking.courseChange.changeDays })).toBeTruthy();
});

test('a renewal whose current course is another one (booked ahead): its own days are named in its block', async () => {
  serve({ previous: runningCourse, current: { ...runningCourse, subscriptionId: 'other', running: false } });
  await renderWithQuery(<CourseScreen />);
  expect(await screen.findByText(t.booking.courseChange.upcoming)).toBeTruthy();
  expect(screen.getByText(current)).toBeTruthy();
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
