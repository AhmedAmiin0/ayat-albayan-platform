import { screen, within } from '@testing-library/react-native';
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
const next = lesson({
  id: 'next',
  starts_at: '2026-10-01T13:20:00.000Z',
  ends_at: '2026-10-01T14:05:00.000Z',
});
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
  expect(screen.queryByText('جلسات مباشرة')).toBeNull();
  // Confirmed already: the hero's primary is the classroom.
  expect(screen.getByRole('button', { name: t.classroom.enter })).toBeTruthy();
});

test('teacher Today (docs/48): no «جلسات مباشرة»; one «ادخل الحلقة» per lesson', async () => {
  await renderWithQuery(<TeacherTodayScreen />);
  expect(await screen.findByText(t.today.running)).toBeTruthy();
  expect(screen.queryByText('جلسات مباشرة')).toBeNull();
  const enter = { name: t.classroom.enter };
  // The running lesson's join is the hero's ONE filled lead.
  const hero = within(screen.getByTestId('teacher-hero-actions'));
  expect(hero.getAllByRole('button', enter)).toHaveLength(1);
  // The 16:20 row leads with its own live join; JoinAround's second button is never drawn.
  expect(within(screen.getByTestId('today-rest')).getAllByRole('button', enter)).toHaveLength(1);
  expect(screen.getAllByRole('button', enter)).toHaveLength(2);
});
