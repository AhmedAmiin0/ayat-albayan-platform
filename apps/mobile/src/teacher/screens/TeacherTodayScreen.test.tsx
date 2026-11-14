import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { confirmingQueryClient, renderWithQuery } from '@/test/query';
import { answer, evening, held, later, NOW, saturday } from '@/teacher/today/testing/day-fixtures';
import { counted } from '@ab/shared';
import { shortDate } from '@/today';
import { TeacherTodayScreen } from './TeacherTodayScreen';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
  apiSend: (m: string, p: string, b?: unknown) => mockApiSend(m, p, b),
}));
const mockPush = jest.fn();
const mockNavigate = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (h: string) => mockPush(h), navigate: (h: string) => mockNavigate(h) },
}));
jest.mock('@/core/lib/time/use-now', () => ({ useNow: () => new Date('2026-10-01T14:00:00Z') }));

const DAY = 86_400_000;
const lessonGets = () =>
  mockApiFetch.mock.calls
    .map(([p]) => String(p))
    .filter((p) => p.startsWith('/teachers/me/lessons'));

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockImplementation(answer([later, held, evening, saturday]));
});

test('the short date, no zone line, the hero and one row; no due block (2026-11-14)', async () => {
  await renderWithQuery(<TeacherTodayScreen />, confirmingQueryClient());
  const hero = within(await screen.findByTestId('teacher-hero-actions'));
  expect(screen.getByText(shortDate(NOW))).toBeTruthy();
  expect(screen.queryByText(/الأوقات بتوقيتك/)).toBeNull();
  // The hero: «سأحضر» filled, her own link as the one peer, «التفاصيل».
  expect(hero.getByRole('button', { name: t.teacherBoard.confirm })).toBeTruthy();
  expect(hero.getByRole('button', { name: t.teacherDash.join })).toBeTruthy();
  expect(screen.queryByTestId('due-reports')).toBeNull();
  expect(mockApiFetch).not.toHaveBeenCalledWith('/teachers/me/pending-reports');
  expect(within(screen.getByTestId('today-rest')).getByText('سلمى علي')).toBeTruthy();
  // No «جلسات مباشرة», no per-row «إلغاء الحلقة» (it lives in the sheet), not tomorrow's lesson.
  expect(screen.queryByText('جلسات مباشرة')).toBeNull();
  expect(screen.queryByRole('button', { name: t.teacherBoard.cancel })).toBeNull();
  expect(screen.queryByText('ريم سالم')).toBeNull();
});

test('ONE lessons GET, on the 15-day aheadWindow from the padded day start', async () => {
  await renderWithQuery(<TeacherTodayScreen />, confirmingQueryClient());
  await screen.findByTestId('teacher-hero-actions');
  const [url, ...more] = lessonGets();
  expect(more).toHaveLength(0);
  const query = new URLSearchParams((url ?? '').split('?')[1]);
  const from = Date.parse(query.get('from') ?? '');
  expect(Date.parse(query.get('to') ?? '') - from).toBe(15 * DAY);
  expect(new Date(from).toISOString()).toMatch(/T10:00:00\.000Z$/);
});

test('an ended row keeps its report lead; it opens the form in «اليوم»’s own stack', async () => {
  await renderWithQuery(<TeacherTodayScreen />, confirmingQueryClient());
  await fireEvent.press(await screen.findByRole('button', { name: counted(t.today.endedFold, 1) }));
  await fireEvent.press(screen.getByRole('button', { name: t.reports.open }));
  expect(mockPush).toHaveBeenCalledWith('/teacher/today/report/held');
});

test('«سأحضر» on the hero is optimistic: «حضورك مؤكَّد» before the answer', async () => {
  mockApiSend.mockReturnValue(new Promise(() => undefined));
  await renderWithQuery(<TeacherTodayScreen />, confirmingQueryClient());
  const hero = within(await screen.findByTestId('teacher-hero-actions'));
  await fireEvent.press(hero.getByRole('button', { name: t.teacherBoard.confirm }));
  expect(await screen.findByText(t.teacherBoard.confirmedChip)).toBeTruthy();
  expect(mockApiSend).toHaveBeenCalledWith(
    'POST',
    '/teachers/me/lessons/later/confirm-attendance',
    undefined,
  );
});

test('no lessons today: «لا توجد حلقات اليوم», the next one, and «افتح جدولي»', async () => {
  mockApiFetch.mockImplementation(answer([saturday], []));
  await renderWithQuery(<TeacherTodayScreen />, confirmingQueryClient());
  const end = within(await screen.findByTestId('teacher-day-end'));
  expect(end.getByText(t.teacherDash.noLessonsToday)).toBeTruthy();
  expect(end.getByText(/ريم سالم/)).toBeTruthy();
  await fireEvent.press(end.getByRole('button', { name: t.teacherToday.openSchedule }));
  expect(mockNavigate).toHaveBeenCalledWith('/teacher/schedule');
});

test('every lesson ended and nothing ahead: «انتهت حلقات اليوم» and «لا توجد حلقات…»', async () => {
  mockApiFetch.mockImplementation(answer([held]));
  await renderWithQuery(<TeacherTodayScreen />, confirmingQueryClient());
  const end = within(await screen.findByTestId('teacher-day-end'));
  expect(end.getByText(t.today.quietTitle)).toBeTruthy();
  expect(end.getByText(t.teacherToday.noneSoon)).toBeTruthy();
});

test('the lessons read failed with nothing saved: the error with a retry', async () => {
  mockApiFetch.mockImplementation(async (p: string) => {
    if (p.startsWith('/teachers/me/lessons')) throw new Error('down');
    return [];
  });
  await renderWithQuery(<TeacherTodayScreen />, confirmingQueryClient());
  expect(await screen.findByText(t.teacherDash.loadError)).toBeTruthy();
  expect(screen.queryByTestId('teacher-day-end')).toBeNull();
  const before = lessonGets().length;
  await fireEvent.press(screen.getByRole('button', { name: t.mobile.retry }));
  await waitFor(() => expect(lessonGets().length).toBeGreaterThan(before));
});
