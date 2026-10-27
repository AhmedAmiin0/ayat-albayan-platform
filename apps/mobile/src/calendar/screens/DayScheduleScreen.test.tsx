import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { ltr } from '@/core/ui/primitives/Ltr';
import { DayScheduleScreen } from './DayScheduleScreen';
import { OVERVIEW, overviewPath, THIS_WEEK } from '../overview/overview-fixtures';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));

const NEXT_WEEK = overviewPath('2026-10-02T21:00:00.000Z', '2026-10-09T21:00:00.000Z');
const empty = { ...OVERVIEW, lessons: [] };
const serve = () =>
  mockApiFetch.mockImplementation(async (path: string) => {
    if (path === THIS_WEEK) return OVERVIEW;
    if (path.startsWith('/lessons/overview')) return empty;
    throw new ApiError(404);
  });

beforeEach(() => {
  jest.clearAllMocks();
  serve();
  // Thursday 1 Oct 2026, 16:20 in Riyadh.
  jest.useFakeTimers({ now: new Date('2026-10-01T13:20:00Z'), advanceTimers: true });
});
afterEach(() => jest.useRealTimers());

test('«الجدول» today: every teacher, the free one too, with load, windows, gaps and time off', async () => {
  const { container } = await renderWithQuery(<DayScheduleScreen />);
  expect(screen.getByRole('header', { name: t.schedule.nav })).toBeTruthy();
  expect(await screen.findByRole('header', { name: 'أبرار' })).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith(THIS_WEEK);
  expect(screen.queryByRole('button', { name: t.common.back })).toBeNull();
  const names = screen.getAllByRole('header').map((h) => h.props.children);
  expect(names.filter((n) => ['أبرار', 'سارة', 'عمر'].includes(n))).toEqual([
    'أبرار',
    'سارة',
    'عمر',
  ]);
  // أبرار: held 10:00, then 16:00 and 17:00; the cancelled 16:00 is gone. Her 10:45–16:00 gap is
  // over (it is 16:20 Riyadh time): a gap in the past is not offered.
  const rows = screen.getAllByText(/^(جودى خالد|يوسف أحمد|جنى وليد)$/).map((n) => n.props.children);
  expect(rows).toEqual(['جودى خالد', 'يوسف أحمد', 'جنى وليد']);
  expect(screen.queryByText(`متاح ${ltr('10:45 – 16:00')}`)).toBeNull();
  expect(screen.getByText(`متاح ${ltr('10:00 – 18:00')} بتوقيت الرياض`)).toBeTruthy();
  expect(
    screen.getByText(new RegExp(t.booking.teacherLoad.replace('{n}', '3').replace('{max}', '10'))),
  ).toBeTruthy();
  // سارة: off all day, nothing booked. عمر: nothing booked, free till midnight.
  expect(screen.getByText(/^إجازة · .* · سفر$/)).toBeTruthy();
  expect(screen.getAllByText(t.schedule.noLessons)).toHaveLength(2);
  expect(screen.getByText(`متاح ${ltr('20:00 – 24:00')}`)).toBeTruthy();
  // The day pills: Thursday holds 3 lessons.
  expect(screen.getByRole('tab', { name: 'الخميس 1 أكتوبر 3', selected: true })).toBeTruthy();

  await fireEvent.press(screen.getByRole('header', { name: 'سارة' }));
  expect(router.push).toHaveBeenCalledWith('/more/teachers/t2');
  // Each teacher's name stays on top while their day scrolls (Android's default is off).
  const [list] = container.queryAll((n) => Array.isArray(n.props['stickyHeaderIndices']));
  expect(list?.props['stickyHeaderIndices']).toHaveLength(3);
});

test('filters: gender and program narrow the teachers', async () => {
  await renderWithQuery(<DayScheduleScreen />);
  await screen.findByRole('header', { name: 'أبرار' });
  const gender = within(screen.getByLabelText(t.teachers.gender));
  await fireEvent.press(gender.getByRole('tab', { name: t.teachers.genderLabel.male }));
  expect(screen.queryByRole('header', { name: 'أبرار' })).toBeNull();
  expect(screen.getByRole('header', { name: 'عمر' })).toBeTruthy();
  await fireEvent.press(
    within(screen.getByLabelText(t.schedule.programFilter)).getByRole('tab', {
      name: t.enums.program.arabic,
    }),
  );
  expect(screen.getByText(t.booking.noTeachers)).toBeTruthy();
});

test('the week: lessons under their day with the trial tag; ‹ › moves a week, «اليوم» comes back', async () => {
  await renderWithQuery(<DayScheduleScreen />);
  await screen.findByRole('header', { name: 'أبرار' });
  await fireEvent.press(screen.getByRole('radio', { name: t.schedule.viewWeek }));
  expect(screen.getByRole('header', { name: '26 سبتمبر – 2 أكتوبر' })).toBeTruthy();
  expect(screen.getByText('السبت 26 سبتمبر')).toBeTruthy();
  expect(screen.getByText(t.schedule.trialTag)).toBeTruthy();
  expect(screen.queryByText(/^فاضي/)).toBeNull();
  expect(screen.queryByRole('tab', { name: /الخميس 1 أكتوبر/ })).toBeNull();

  await fireEvent.press(screen.getByRole('button', { name: t.schedule.nextWeek }));
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith(NEXT_WEEK));
  expect(await screen.findByRole('header', { name: '3 أكتوبر – 9 أكتوبر' })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.schedule.today }));
  expect(await screen.findByText(t.schedule.trialTag)).toBeTruthy();
});

test('‹ › moves a day; pushed from «المزيد» it has «رجوع»', async () => {
  await renderWithQuery(<DayScheduleScreen back />);
  await screen.findByRole('header', { name: 'أبرار' });
  await fireEvent.press(screen.getByRole('button', { name: t.calendar.prevDay }));
  expect(screen.getByRole('header', { name: 'الأربعاء 30 سبتمبر' })).toBeTruthy();
  expect(screen.getAllByText(t.schedule.noLessons)).toHaveLength(3);
  await fireEvent.press(screen.getByRole('button', { name: t.common.back }));
  expect(router.back).toHaveBeenCalled();
});

test('failed with nothing saved: error and retry', async () => {
  mockApiFetch.mockRejectedValue(new ApiError(500));
  await renderWithQuery(<DayScheduleScreen />);
  const retry = await screen.findByRole('button', { name: t.mobile.retry });
  serve();
  await fireEvent.press(retry);
  expect(await screen.findByRole('header', { name: 'أبرار' })).toBeTruthy();
});
