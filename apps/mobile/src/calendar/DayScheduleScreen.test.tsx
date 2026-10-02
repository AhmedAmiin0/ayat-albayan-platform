import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { lesson, muscat, pending, yusuf } from '@/today/fixtures';
import ScheduleRoute from '../../app/(tabs)/more/teachers/schedule';

const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));

const day = (date: string) => `/lessons/day?date=${date}&tz=Asia%2FRiyadh`;
const sara = { id: 't2', display_name_ar: 'سارة', tz: 'Asia/Riyadh' };
const saraLesson = lesson({
  id: 'l-sara',
  teacher: sara,
  starts_at: '2026-10-01T06:00:00.000Z',
  ends_at: '2026-10-01T07:00:00.000Z',
  students: [{ ...yusuf, id: 's9', code: 'AB-0190', name: 'مريم علي' }],
});

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockReset().mockResolvedValue([]);
  // Thursday 1 Oct 2026, 16:20 in Riyadh.
  jest.useFakeTimers({ now: new Date('2026-10-01T13:20:00Z'), advanceTimers: true });
});
afterEach(() => jest.useRealTimers());

test('«الجدول»: every teacher’s lessons today, grouped by teacher, each in time order', async () => {
  mockApiFetch.mockImplementation(async (path: string) => (path === day('2026-10-01') ? [muscat, saraLesson, pending] : []));
  await renderWithQuery(<ScheduleRoute />);
  expect(screen.getByRole('header', { name: t.schedule.nav })).toBeTruthy();
  expect(screen.getByRole('header', { name: 'الخميس 1 أكتوبر' })).toBeTruthy();
  expect(await screen.findByRole('header', { name: 'أبرار' })).toBeTruthy();
  const names = screen.getAllByRole('header').map((h) => h.props.children);
  expect(names.indexOf('أبرار')).toBeLessThan(names.indexOf('سارة'));
  const rows = screen.getAllByText(/^(يوسف أحمد|جنى وليد|مريم علي)$/).map((n) => n.props.children);
  expect(rows).toEqual(['يوسف أحمد', 'جنى وليد', 'مريم علي']);

  await fireEvent.press(screen.getByRole('header', { name: 'سارة' }));
  expect(router.push).toHaveBeenCalledWith('/more/teachers/calendar/t2');
});

test('‹ › moves a day; an empty day says so; «النهارده» comes back', async () => {
  mockApiFetch.mockImplementation(async (path: string) => (path === day('2026-10-01') ? [pending] : []));
  await renderWithQuery(<ScheduleRoute />);
  await screen.findByText('يوسف أحمد');
  await fireEvent.press(screen.getByRole('button', { name: t.calendar.prevDay }));
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith(day('2026-09-30')));
  expect(await screen.findByRole('header', { name: t.calendar.emptyDay })).toBeTruthy();
  expect(screen.getByRole('header', { name: 'الأربعاء 30 سبتمبر' })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.schedule.today }));
  expect(await screen.findByText('يوسف أحمد')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.calendar.nextDay }));
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith(day('2026-10-02')));
});

test('a lesson’s «غيّر الميعاد» opens the reschedule sheet over the day', async () => {
  mockApiFetch.mockImplementation(async (path: string) => (path === day('2026-10-01') ? [pending] : { slots: [] }));
  await renderWithQuery(<ScheduleRoute />);
  await fireEvent.press(await screen.findByRole('button', { name: `${t.lessons.rescheduleSubmit} — يوسف أحمد` }));
  expect(await screen.findByRole('header', { name: t.lessons.rescheduleTitle })).toBeTruthy();
  expect(await screen.findByText(t.reschedule.noSlots)).toBeTruthy();
});
