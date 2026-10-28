import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { ltr } from '@/core/ui/primitives/Ltr';
import { renderWithQuery } from '@/test/query';
import TodayRoute from '../../app/(tabs)/index';
import { cancelled, done, muscat, pending } from './testing/fixtures';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
// The bell reads its own API (notifications/BellButton.test); here it would take the day's mocked answers.
jest.mock('@/notifications/BellButton', () => ({ BellButton: () => null }));

/** GET /lessons/day calls only (the sheet also reads each student's balance and the settings). */
const dayCalls = () =>
  mockApiFetch.mock.calls.filter(([path]: [string]) => path.startsWith('/lessons/day')).length;
// A summary column's spoken name; an active status column says a tap shows everything again.
const column = (key: 'all' | 'scheduled' | 'completed', n: number, active = false) => ({
  name: (active ? t.today.summaryFilterActive : t.today.summaryFilter)
    .replace('{n}', String(n))
    .replace('{label}', t.today.summary[key]),
});
const row = (names: string) => ({ name: new RegExp(`${names}.*${t.today.openLesson.split('. ')[1] ?? ''}`) });

beforeEach(() => {
  mockApiFetch.mockReset();
  // Thursday 1 Oct 2026, 16:20 in Riyadh: pending (16:00–16:45) runs, muscat (17:00) is ahead.
  jest.useFakeTimers({ now: new Date('2026-10-01T13:20:00Z'), advanceTimers: true });
});
afterEach(() => jest.useRealTimers());

test('the greeting by the Riyadh clock, «اليوم», the date line, and today in Riyadh is what it asks for', async () => {
  mockApiFetch.mockResolvedValue([]);
  await renderWithQuery(<TodayRoute />);
  expect(screen.getByText(t.today.greeting.afternoon)).toBeTruthy(); // 16:20 Riyadh
  expect(screen.getByRole('header', { name: t.today.title })).toBeTruthy();
  expect(screen.getByText('الخميس 1 أكتوبر · بتوقيت الرياض')).toBeTruthy();
  await waitFor(() =>
    expect(mockApiFetch).toHaveBeenCalledWith('/lessons/day?date=2026-10-01&tz=Asia%2FRiyadh'),
  );
});

test('the summary counts the shown day; a column filters the list, a second tap and «الكل» reset it', async () => {
  mockApiFetch.mockResolvedValue([done, pending, muscat, cancelled]);
  await renderWithQuery(<TodayRoute />);
  expect(await screen.findByRole('button', column('all', 3))).toBeTruthy();
  expect(screen.getByRole('button', column('completed', 1))).toBeTruthy();
  expect(screen.getByRole('button', row('جنى وليد'))).toBeTruthy();

  // «تحتاج تأكيد»: only the 16:00 lesson, as a row (no hero under a filter).
  await fireEvent.press(screen.getByRole('button', column('scheduled', 1)));
  expect(screen.getByRole('button', { ...column('scheduled', 1, true), selected: true })).toBeTruthy();
  expect(screen.getByRole('button', row('يوسف أحمد'))).toBeTruthy();
  expect(screen.queryByRole('button', row('جنى وليد'))).toBeNull();
  expect(screen.queryByText(t.today.running)).toBeNull();
  // A second tap: everything again.
  await fireEvent.press(screen.getByRole('button', column('scheduled', 1, true)));
  expect(screen.getByText(t.today.running)).toBeTruthy();

  // «انتهت» opens the fold; «الكل» resets.
  await fireEvent.press(screen.getByRole('button', column('completed', 1)));
  expect(screen.getByText('جودى خالد')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'انتهت حلقة واحدة اليوم', expanded: true })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', column('scheduled', 1)));
  await fireEvent.press(screen.getByRole('button', { name: t.today.all }));
  expect(screen.getByRole('button', { ...column('all', 3), selected: true })).toBeTruthy();
  expect(dayCalls()).toBe(1);
});

test('the hero is the lesson under way; the rest are quiet rows with no buttons of their own', async () => {
  mockApiFetch.mockResolvedValue([muscat, cancelled, pending, done]);
  await renderWithQuery(<TodayRoute />);
  expect(await screen.findByText(t.today.running)).toBeTruthy();
  expect(screen.getByText('16:00')).toBeTruthy();
  expect(screen.getByText(`مع أ. أبرار · ${t.enums.duration['45']}`)).toBeTruthy();
  expect(screen.getByText(`أ. أبرار · ${t.enums.duration['60']}`)).toBeTruthy();
  expect(screen.getByRole('button', row('جنى وليد'))).toBeTruthy();
  // No inline actions left on the list: confirm/cancel/move live in the sheet.
  expect(screen.queryByRole('button', { name: t.today.cancel })).toBeNull();
  expect(screen.queryByRole('button', { name: t.lessons.rescheduleSubmit })).toBeNull();
});

test('a row opens «تفاصيل الحلقة» with the student codes; ended lessons fold and unfold', async () => {
  mockApiFetch.mockResolvedValue([done, pending, muscat]);
  await renderWithQuery(<TodayRoute />);
  const fold = await screen.findByRole('button', { name: 'انتهت حلقة واحدة اليوم' });
  expect(screen.queryByText('جودى خالد')).toBeNull();
  await fireEvent.press(fold);
  expect(screen.getByText('جودى خالد')).toBeTruthy();

  await fireEvent.press(screen.getByRole('button', row('جنى وليد')));
  expect(await screen.findByRole('header', { name: 'جنى وليد' })).toBeTruthy();
  expect(screen.getByText(ltr('AB-0185'))).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.common.close }));
  expect(screen.queryByRole('header', { name: 'جنى وليد' })).toBeNull();
});

test('a quiet day: «انتهت حلقات اليوم», tomorrow’s first lesson, and «جدول الغد»', async () => {
  jest.setSystemTime(new Date('2026-10-01T16:00:00Z'));
  const tomorrow = { ...pending, id: 'tm', starts_at: '2026-10-02T05:00:00.000Z', ends_at: '2026-10-02T05:45:00.000Z' };
  mockApiFetch.mockImplementation(async (path: string) =>
    path.includes('2026-10-02') ? [tomorrow, { ...tomorrow, id: 'tm2' }] : [done, pending],
  );
  await renderWithQuery(<TodayRoute />);
  expect(await screen.findByRole('header', { name: t.today.quietTitle })).toBeTruthy();
  expect(await screen.findByText('غدًا حلقتان، أولها الساعة 08:00.')).toBeTruthy();
  expect(screen.getByRole('button', { name: t.today.tomorrowSchedule })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'انتهت حلقتان اليوم' })).toBeTruthy();
});

test('no lessons today: the Today empty state; an empty column says so', async () => {
  mockApiFetch.mockResolvedValue([done, muscat]);
  await renderWithQuery(<TodayRoute />);
  await fireEvent.press(await screen.findByRole('button', column('scheduled', 0)));
  expect(within(screen.getByTestId('screen-body')).getByRole('header', { name: t.today.emptyFilter })).toBeTruthy();

  mockApiFetch.mockResolvedValue([]);
  await renderWithQuery(<TodayRoute />);
  expect(await screen.findByRole('header', { name: t.today.empty })).toBeTruthy();
});

test('failed with nothing saved: error and retry', async () => {
  mockApiFetch.mockRejectedValueOnce(new ApiError(500)).mockResolvedValue([pending]);
  await renderWithQuery(<TodayRoute />);
  expect(await screen.findByRole('alert')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.mobile.retry }));
  expect(await screen.findByText('يوسف أحمد')).toBeTruthy();
});
