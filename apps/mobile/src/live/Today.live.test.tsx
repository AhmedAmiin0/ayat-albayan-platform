import { screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { TeacherTodayScreen } from '@/teacher/screens/TeacherTodayScreen';
import { fakeNow } from '@/test/fake-now';
import { renderWithQuery } from '@/test/query';
import { lesson } from '@/today/testing/fixtures';
import TodayRoute from '../../app/(tabs)/index';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

// 1 Oct 2026, 16:10 Riyadh / Cairo: a 16:00 lesson is running, a 16:20 one is about to start.
const running = lesson({ id: 'run', status: 'confirmed' });
const next = lesson({ id: 'next', starts_at: '2026-10-01T13:20:00.000Z', ends_at: '2026-10-01T14:05:00.000Z' });
const me = { id: 't1', display_name_ar: 'أبرار', tz: 'Africa/Cairo', students: [] };

beforeEach(() => {
  jest.clearAllMocks();
  fakeNow(new Date('2026-10-01T13:10:00Z'));
  mockApiFetch.mockImplementation(async (p: string) => {
    if (p === '/teachers/me') return me;
    if (p === '/teachers/me/pending-reports') return [];
    return [running, next];
  });
});
afterEach(() => jest.useRealTimers());

test('admin Today (docs/29): no «جلسات مباشرة» box; the hero carries the running lesson and «ادخل الحلقة»', async () => {
  await renderWithQuery(<TodayRoute />);
  expect(await screen.findByText(t.today.running)).toBeTruthy();
  expect(screen.queryByRole('header', { name: t.live.title })).toBeNull();
  // Confirmed already: the hero's primary is the classroom.
  expect(screen.getByRole('button', { name: t.classroom.enter })).toBeTruthy();
});

test('teacher Today: the same section, own lessons, no teacher line', async () => {
  await renderWithQuery(<TeacherTodayScreen />);
  expect(await screen.findByRole('header', { name: t.live.title })).toBeTruthy();
  expect(screen.queryByText(t.live.teacher.replace('{name}', 'أبرار'))).toBeNull();
  expect(screen.getByText(t.live.startsAt.replace('{time}', '16:20'))).toBeTruthy();
  expect(screen.getAllByRole('button', { name: t.classroom.enter }).length).toBeGreaterThanOrEqual(2);
});
