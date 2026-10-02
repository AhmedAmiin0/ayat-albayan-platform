import { counted, type PendingReportView } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { jana, lesson, yusuf } from '@/today/fixtures';
import { TeacherTodayScreen } from './TeacherTodayScreen';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (p: string) => mockApiFetch(p),
  apiSend: (m: string, p: string, b?: unknown) => mockApiSend(m, p, b),
}));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (h: string) => mockPush(h) } }));
// 1 Oct 2026, 17:00 in Cairo (UTC+3 summer time).
jest.mock('@/today/use-day-lessons', () => ({ useNow: () => new Date('2026-10-01T14:00:00Z') }));

const me = { id: 't-abrar', display_name_ar: 'أبرار', tz: 'Africa/Cairo', students: [] };
const teacherEvents = { allowed_events: ['confirm' as const] };
/** 16:00 Cairo, started, its report still to write. */
const held = lesson({ id: 'held', starts_at: '2026-10-01T13:00:00.000Z', ...teacherEvents });
/** 20:00 Cairo, ahead, waiting for confirmation, with a link; the student is in Muscat (21:00). */
const later = lesson({
  id: 'later',
  starts_at: '2026-10-01T17:00:00.000Z',
  ends_at: '2026-10-01T17:45:00.000Z',
  meeting_link: 'https://meet.google.com/abc',
  students: [jana],
  ...teacherEvents,
});
/** Tomorrow in Cairo: not today. */
const tomorrow = lesson({ id: 'tmr', starts_at: '2026-10-02T09:00:00.000Z', students: [{ ...yusuf, name: 'سلمى' }] });
const pending: PendingReportView[] = [
  { lesson_id: 'held', starts_at: held.starts_at, status: 'scheduled', student: { id: 's1', code: 'AB-0182', name: 'يوسف أحمد' }, report_id: null },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockImplementation(async (p: string) => {
    if (p === '/teachers/me') return me;
    if (p === '/teachers/me/pending-reports') return pending;
    return [later, held, tomorrow];
  });
});

test('my lessons today on my clock: the report for the started one, join + confirm for the next', async () => {
  await renderWithQuery(<TeacherTodayScreen />);
  expect(await screen.findByText(counted(t.reports.pendingCount, 1))).toBeTruthy();
  expect(screen.getByText('يوسف أحمد')).toBeTruthy();
  expect(screen.getByText(new RegExp(`^20:00 · ${t.enums.duration['45']} · ${t.teacherDash.studentTime.replace('{time}', '21:00')}`))).toBeTruthy();
  expect(screen.queryByText('سلمى')).toBeNull();
  expect(screen.getAllByRole('button', { name: t.reports.open })).toHaveLength(1);
  expect(screen.getByRole('button', { name: t.teacherDash.join })).toBeTruthy();
  // No cancel or move for a teacher.
  expect(screen.queryByText(t.today.cancel)).toBeNull();
  expect(screen.queryByText(t.lessons.rescheduleSubmit)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: t.reports.open }));
  expect(mockPush).toHaveBeenCalledWith('/teacher/today/report/held');
  await fireEvent.press(screen.getByRole('button', { name: t.reports.pending }));
  expect(mockPush).toHaveBeenCalledWith('/teacher/reports');
});

test('«تأكيد» shows confirmed at once and sends POST /lessons/:id/confirm', async () => {
  mockApiSend.mockResolvedValue({});
  await renderWithQuery(<TeacherTodayScreen />);
  // Both lessons wait for confirmation; the second card is the 20:00 one.
  const [, laterConfirm] = await screen.findAllByRole('button', { name: t.today.confirm });
  if (!laterConfirm) throw new Error('no «تأكيد» on the 20:00 lesson');
  await fireEvent.press(laterConfirm);
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('POST', '/lessons/later/confirm', undefined));
  expect(mockApiFetch).toHaveBeenCalledWith(
    '/teachers/me/lessons?from=2026-09-30T10%3A00%3A00.000Z&to=2026-10-02T12%3A00%3A00.000Z',
  );
});

test('a day without lessons says so', async () => {
  mockApiFetch.mockImplementation(async (p: string) => (p === '/teachers/me' ? me : []));
  await renderWithQuery(<TeacherTodayScreen />);
  expect(await screen.findByText(t.teacherDash.noLessonsToday)).toBeTruthy();
  expect(screen.queryByText(t.reports.pending)).toBeNull();
});
