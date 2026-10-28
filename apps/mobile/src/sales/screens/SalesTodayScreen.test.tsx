import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { fakeNow } from '@/test/fake-now';
import { renderWithQuery } from '@/test/query';
import SalesTodayRoute from '../../../app/sales/today';
import { scheduleLesson } from '../testing/fixtures';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({ ...jest.requireActual('@/core/lib/http/api'), apiFetch: (mockPath: string) => mockApiFetch(mockPath) }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), navigate: jest.fn() }, useLocalSearchParams: () => ({}) }));
// The bell reads its own API (notifications/BellButton.test).
jest.mock('@/notifications/BellButton', () => ({ BellButton: () => null }));

// The salesperson's «اليوم» (owner 2026-10-27): the day of her «جدول الحلقات», in the calm design.
// Monday 12 Oct 2026, 18:10 Riyadh: يوسف (18:00) runs, سلمى (19:00) waits for confirmation.
const running = scheduleLesson();
const later = scheduleLesson({
  id: 'l2',
  starts_at: '2026-10-12T16:00:00.000Z',
  ends_at: '2026-10-12T16:30:00.000Z',
  status: 'scheduled',
  students: [{ id: 'st3', code: 'AB-0200', name: 'سلمى' }],
});
const held = scheduleLesson({ id: 'l0', status: 'completed', starts_at: '2026-10-12T06:00:00.000Z', ends_at: '2026-10-12T06:30:00.000Z', students: [{ id: 'st4', code: 'AB-0201', name: 'جودى' }] });

const answer = (lessons: object[], tomorrow: object[] = []) =>
  mockApiFetch.mockImplementation(async (path: string) =>
    path.includes('2026-10-13') ? { date: '2026-10-13', lessons: tomorrow } : { date: '2026-10-12', lessons },
  );
const paths = () => mockApiFetch.mock.calls.map(([path]: [string]) => path);

beforeEach(() => {
  mockApiFetch.mockReset();
  jest.clearAllMocks();
  fakeNow(new Date('2026-10-12T15:10:00.000Z'));
});
afterEach(() => jest.useRealTimers());

test('the calm header and the academy day of «جدول الحلقات»: the sales API only, never /lessons/day', async () => {
  answer([held, running, later]);
  await renderWithQuery(<SalesTodayRoute />);
  expect(await screen.findByText(t.today.running)).toBeTruthy();
  // No «اليوم» title (the tab says it): the greeting is the header line.
  expect(screen.getByRole('header', { name: new RegExp(`^${t.today.greeting.evening}`) })).toBeTruthy();
  expect(screen.queryByText(t.today.title)).toBeNull();
  expect(screen.getByText('الاثنين 12 أكتوبر · بتوقيت الرياض')).toBeTruthy();
  expect(paths()).toContain('/sales/schedule?date=2026-10-12');
  expect(paths().some((p) => p.startsWith('/lessons'))).toBe(false);
  // The hero is the running lesson, the rest a quiet row, the held one folded away.
  expect(screen.getByText('يوسف أحمد')).toBeTruthy();
  expect(screen.getByText('سلمى')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'انتهت حلقة واحدة اليوم' })).toBeTruthy();
});

test('«تحتاج تأكيد» stays a filter: it shows the waiting lessons, it confirms nothing', async () => {
  answer([held, running, later]);
  await renderWithQuery(<SalesTodayRoute />);
  await screen.findByText(t.today.running);
  const column = t.today.summaryFilter.replace('{n}', '1').replace('{label}', t.today.summary.scheduled);
  await fireEvent.press(screen.getByRole('button', { name: column }));
  expect(screen.queryByText('يوسف أحمد')).toBeNull();
  expect(screen.getByText('سلمى')).toBeTruthy();
  expect(paths().some((p) => p.startsWith('/lessons'))).toBe(false);
});

test('a quiet day: tomorrow from the sales schedule, and «جدول الغد» opens her schedule tab on it', async () => {
  fakeNow(new Date('2026-10-12T18:00:00.000Z'));
  answer([held, running], [{ ...later, starts_at: '2026-10-13T05:00:00.000Z', ends_at: '2026-10-13T05:30:00.000Z' }]);
  await renderWithQuery(<SalesTodayRoute />);
  expect(await screen.findByRole('header', { name: t.today.quietTitle })).toBeTruthy();
  expect(await screen.findByText('غدًا حلقة واحدة، أولها الساعة 08:00.')).toBeTruthy();
  expect(paths()).toContain('/sales/schedule?date=2026-10-13');
  await fireEvent.press(screen.getByRole('button', { name: t.today.tomorrowSchedule }));
  expect(router.navigate).toHaveBeenCalledWith({ pathname: '/sales/schedule', params: { date: '2026-10-13' } });
});

test('no lessons today: the Today empty state', async () => {
  answer([]);
  await renderWithQuery(<SalesTodayRoute />);
  expect(await screen.findByRole('header', { name: t.today.empty })).toBeTruthy();
});
