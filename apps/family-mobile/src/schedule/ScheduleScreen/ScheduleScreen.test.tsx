import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { freshQueryClient, renderWithQuery } from '@ab/mobile-kit/testing';
import { lesson, student } from '@/portal/portal.fixtures';
import { ScheduleScreen } from './ScheduleScreen';

const mockAnswers: Record<string, unknown> = {};
const mockFetch = jest.fn(async (path: string) => {
  const answer = mockAnswers[path.split('?')[0] ?? ''];
  if (answer instanceof Error) throw answer;
  return answer;
});
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (path: string) => mockFetch(path),
}));

const S = t.portal.app.schedule;
const kid = student({ id: 's1', contact_is_self: true });
const LESSONS = '/portal/students/s1/lessons';
const asStudent = (lessons: unknown) => {
  mockAnswers['/portal/me'] = { kind: 'student', students: [kid], renew_url: null };
  mockAnswers[LESSONS] = lessons;
};
const show = () => renderWithQuery(<ScheduleScreen />, freshQueryClient());
const lessonsAsked = () => mockFetch.mock.calls.filter(([path]) => path.startsWith(LESSONS));

beforeEach(() => jest.clearAllMocks());

test("a student's own week: «my schedule», this week, and its lessons by day", async () => {
  asStudent({ lessons: [lesson(new Date(), 0, { id: 'a' })] });
  await show();
  expect(await screen.findByText(S.mine)).toBeTruthy();
  expect(screen.getByText(S.thisWeek)).toBeTruthy();
  expect(await screen.findByRole('header', { name: /اليوم/ })).toBeTruthy();
  expect(screen.queryByText(S.empty)).toBeNull();
});

test('a week with no lessons shows the empty note; next moves to next week', async () => {
  asStudent({ lessons: [] });
  await show();
  expect(await screen.findByText(S.empty)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: S.next }));
  expect(await screen.findByText(S.nextWeek)).toBeTruthy();
});

test('a failed read offers a retry, which reads the lessons again', async () => {
  asStudent(new Error('down'));
  await show();
  const retry = await screen.findByRole('button', { name: t.mobile.retry });
  const before = lessonsAsked().length;
  await fireEvent.press(retry);
  expect(lessonsAsked().length).toBeGreaterThan(before);
});

test("a guardian's only child: the plain schedule title, not «my schedule»", async () => {
  mockAnswers['/portal/me'] = {
    kind: 'guardian',
    students: [student({ id: 's1' })],
    renew_url: null,
  };
  mockAnswers[LESSONS] = { lessons: [] };
  await show();
  expect(await screen.findByText(S.empty)).toBeTruthy();
  expect(screen.getByText(S.title)).toBeTruthy();
  expect(screen.queryByText(S.mine)).toBeNull();
});
