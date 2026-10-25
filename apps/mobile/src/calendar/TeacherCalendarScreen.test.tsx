import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import type { AvailabilityRow, Teacher } from '@/more/types';
import { fakeNow } from '@/test/fake-now';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { cancelled, done, lesson, muscat, pending } from '@/today/fixtures';
import { ltr } from '@/core/ui/primitives/Ltr';
import { TeacherCalendarScreen } from './TeacherCalendarScreen';

// The first render in this file pays the cold transform of the whole calendar tree, which exceeded the
// 30 s default on the CI runner (develop's own runs too); the later tests take well under a second.
jest.setTimeout(120_000);

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ id: 't1' }),
}));

const TEACHER: Teacher = { id: 't1', display_name_ar: 'أبرار', phone_e164: null, status: 'active', tz: 'Africa/Cairo' };
const GRID: AvailabilityRow[] = [{ id: 'a', weekday: 4, start_time: '16:00', end_time: '18:00', tz: 'Africa/Cairo' }];
/** Saturday 26 Sep 13:00 Riyadh, the week's first day. */
const saturday = lesson({ id: 'sat', starts_at: '2026-09-26T10:00:00.000Z', ends_at: '2026-09-26T10:30:00.000Z' });
const week = (from: string, to: string) =>
  `/lessons?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&teacherId=t1`;
const THIS_WEEK = week('2026-09-25T21:00:00.000Z', '2026-10-02T21:00:00.000Z');
const NEXT_WEEK = week('2026-10-02T21:00:00.000Z', '2026-10-09T21:00:00.000Z');
const lessonCalls = () => mockApiFetch.mock.calls.filter(([p]: [string]) => p.startsWith('/lessons')).length;

/** The teacher, its grid, and these weeks (any other week is empty); an Error fails every week. */
function serve(lessons: Record<string, unknown> | Error) {
  mockApiFetch.mockImplementation(async (path: string) => {
    if (lessons instanceof Error && path.startsWith('/lessons')) throw lessons;
    if (path === '/teachers/t1') return TEACHER;
    if (path === '/teachers/t1/availability') return GRID;
    if (!(lessons instanceof Error) && path in lessons) return lessons[path];
    if (path.startsWith('/lessons')) return [];
    throw new ApiError(404);
  });
}

beforeEach(() => {
  mockApiFetch.mockReset();
  // Thursday 1 Oct 2026, 16:20 in Riyadh.
  fakeNow(new Date('2026-10-01T13:20:00Z'));
});
afterEach(() => jest.useRealTimers());

test('the teacher’s Riyadh week, السبت → الجمعة: lessons by day in time order, today marked', async () => {
  serve({ [THIS_WEEK]: [muscat, cancelled, pending, saturday, done] });
  await renderWithQuery(<TeacherCalendarScreen />);
  expect(await screen.findByRole('header', { name: 'أبرار' })).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith(THIS_WEEK);
  expect(screen.getByRole('header', { name: '26 سبتمبر – 2 أكتوبر' })).toBeTruthy();
  expect(screen.getByRole('header', { name: 'السبت 26 سبتمبر' })).toBeTruthy();
  expect(screen.getByRole('header', { name: 'الجمعة 2 أكتوبر' })).toBeTruthy();
  expect(screen.getByText(t.schedule.today)).toBeTruthy();
  // Thursday: 10:00 held, 16:00 waiting, 17:00 confirmed; the cancelled 16:00 is hidden.
  const times = screen.getAllByText(/^\d{2}:\d{2}$/).map((n) => n.props.children);
  expect(times).toEqual(['13:00', '10:00', '16:00', '17:00']);
  expect(screen.getByText('جنى وليد')).toBeTruthy();
  expect(screen.getAllByText(t.enums.lessonStatus.scheduled)).toHaveLength(2);
  expect(screen.getByText(t.enums.lessonStatus.completed)).toBeTruthy();
  expect(screen.getByText(t.enums.duration['30'])).toBeTruthy();
  // Thursday's availability, in the zone the grid was saved in; five days have no lessons.
  expect(screen.getByText(`متاح ${ltr('16:00 – 18:00')} بتوقيت القاهرة`)).toBeTruthy();
  expect(screen.getAllByText(t.schedule.noLessons)).toHaveLength(5);
});

test('‹ › moves a week, an empty week says so, «اليوم» comes back', async () => {
  serve({ [THIS_WEEK]: [pending] });
  await renderWithQuery(<TeacherCalendarScreen />);
  await screen.findByText('يوسف أحمد');
  expect(screen.queryByRole('button', { name: t.schedule.today })).toBeNull();

  await fireEvent.press(screen.getByRole('button', { name: t.schedule.nextWeek }));
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith(NEXT_WEEK));
  expect(await screen.findByText(t.schedule.emptyTeacher)).toBeTruthy();
  expect(screen.getByRole('header', { name: '3 أكتوبر – 9 أكتوبر' })).toBeTruthy();
  expect(screen.getAllByText(t.schedule.noLessons)).toHaveLength(7);

  await fireEvent.press(screen.getByRole('button', { name: t.schedule.today }));
  expect(await screen.findByText('يوسف أحمد')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.schedule.prevWeek }));
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith(week('2026-09-18T21:00:00.000Z', '2026-09-25T21:00:00.000Z')));
});

test('a week still loading says so instead of a blank list', async () => {
  serve({ [THIS_WEEK]: [pending] });
  await renderWithQuery(<TeacherCalendarScreen />);
  await screen.findByText('يوسف أحمد');
  mockApiFetch.mockImplementation(() => new Promise(() => undefined));
  await fireEvent.press(screen.getByRole('button', { name: t.schedule.nextWeek }));
  expect(await screen.findByText(t.common.loading)).toBeTruthy();
});

test('a lesson’s «غيّر الموعد» is in view on its row (no hidden tap) and opens the sheet; a held lesson has none', async () => {
  serve({ [THIS_WEEK]: [done, pending] });
  await renderWithQuery(<TeacherCalendarScreen />);
  const move = await screen.findByRole('button', { name: `${t.lessons.rescheduleSubmit} — يوسف أحمد` });
  // One action: the held lesson (جودى) cannot move.
  expect(screen.getAllByRole('button', { name: new RegExp(t.lessons.rescheduleSubmit) })).toHaveLength(1);
  await fireEvent.press(move);
  expect(await screen.findByRole('header', { name: t.lessons.rescheduleTitle })).toBeTruthy();
});

test('offline with a saved week: it stays, and the subtitle says how old it is', async () => {
  mockApiFetch.mockRejectedValue(new ApiError(503));
  const client = createTestQueryClient();
  const params = { from: '2026-09-25T21:00:00.000Z', to: '2026-10-02T21:00:00.000Z', teacherId: 't1' };
  client.setQueryData(['lessons', 'list', params], [pending]);
  await renderWithQuery(<TeacherCalendarScreen />, client);
  expect(screen.getByText('يوسف أحمد')).toBeTruthy();
  expect(await screen.findByText(new RegExp(t.mobile.lastUpdated.replace(' {time}', '')))).toBeTruthy();
});

test('failed with nothing saved: error and retry; pull to refresh asks again', async () => {
  serve(new ApiError(500));
  const { container } = await renderWithQuery(<TeacherCalendarScreen />);
  const retry = await screen.findByRole('button', { name: t.mobile.retry });
  serve({ [THIS_WEEK]: [pending] });
  await fireEvent.press(retry);
  expect(await screen.findByText('يوسف أحمد')).toBeTruthy();
  const [list] = container.queryAll((node) => typeof node.props['onRefresh'] === 'function');
  if (!list) throw new Error('no pull-to-refresh on the agenda');
  const before = lessonCalls();
  await fireEvent(list, 'refresh');
  await waitFor(() => expect(lessonCalls()).toBe(before + 1));
});
