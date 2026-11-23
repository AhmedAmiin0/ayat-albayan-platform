import { counted } from '@ab/shared';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { z } from 'zod';
import { t } from '@ab/mobile-kit';
import { confirmingQueryClient, renderWithQuery } from '@/test/query';
import { answer, held } from '@/teacher/today/testing/day-fixtures';
import { TeacherTodayScreen } from '@/teacher/screens/TeacherTodayScreen/TeacherTodayScreen';

const mockApiFetch = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), navigate: jest.fn() } }));
jest.mock('@ab/mobile-kit/lib/time/use-now', () => ({ useNow: () => new Date('2026-10-01T14:00:00Z') }));
// Mocked: a second observer of the bell's polled query breaks fake timers; it has its own tests.
jest.mock('@/teacher/alerts', () => ({
  ...jest.requireActual('@/teacher/alerts'),
  TodayAlerts: () => null,
}));
let mockFocused = true;
jest.mock('@ab/mobile-kit/ui/connecting/use-screen-focus', () => ({ useScreenFocused: () => mockFocused }));

// Two GETs every 30 s, only while today is in front (docs/48).
/** Ended 15 min ago in our classroom: its join window stays open until ends_at + 120 min. */
const ended = { ...held, platform_classroom: true };
const calls = (prefix: string) =>
  mockApiFetch.mock.calls.filter(([p]) => String(p).startsWith(prefix)).length;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ now: new Date('2026-10-01T14:00:00Z') });
  mockApiFetch.mockImplementation(answer([ended]));
});
afterEach(() => jest.useRealTimers());

async function mount(focused: boolean) {
  mockFocused = focused;
  await renderWithQuery(<TeacherTodayScreen />, confirmingQueryClient());
  await waitFor(() => expect(calls('/teachers/me/lessons')).toBe(1));
}

test.each([
  [true, 2],
  [false, 1],
])('focused=%s: the lessons read %s times after 30 s; never the pending list', async (focused, n) => {
  await mount(focused);
  await act(async () => {
    jest.advanceTimersByTime(30_000);
  });
  expect(calls('/teachers/me/lessons')).toBe(n);
  expect(calls('/teachers/me/pending-reports')).toBe(0);
});

test('a background poll never spins the pull-to-refresh spinner', async () => {
  await mount(true);
  await act(async () => {
    jest.advanceTimersByTime(30_000);
  });
  const scroll = screen.getByTestId('teacher-today');
  const pull = z.object({ props: z.object({ refreshing: z.boolean() }) });
  expect(pull.parse(scroll.props.refreshControl).props.refreshing).toBe(false);
});

test('an ended lesson sits in the fold with no join, though its window is open', async () => {
  await mount(true);
  const fold = await screen.findByRole('button', { name: counted(t.today.endedFold, 1) });
  await fireEvent.press(fold);
  const row = t.lessons.sheet.openRow.replace('{names}', 'يوسف أحمد');
  expect(screen.getByRole('button', { name: row })).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.classroom.enter })).toBeNull();
  expect(screen.queryByTestId('teacher-hero-actions')).toBeNull();
});
