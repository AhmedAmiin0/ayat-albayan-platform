import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { lesson } from '@/today/testing/fixtures';
import { TeacherLessonSheet } from './TeacherLessonSheet';

const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: () => new Promise(() => undefined),
  apiSend: (m: string, p: string, b?: unknown) => mockApiSend(m, p, b),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
let mockNow = new Date('2026-10-01T12:00:00Z');
jest.mock('@/core/lib/time/use-now', () => ({ useNow: () => mockNow }));

const w = t.teacherBoard;
const onClose = jest.fn();
const onNotice = jest.fn();
const onReport = jest.fn();
const open = (l: ReturnType<typeof lesson>) =>
  renderWithQuery(
    <TeacherLessonSheet lesson={l} onClose={onClose} onNotice={onNotice} onReport={onReport} />,
  );

beforeEach(() => {
  jest.clearAllMocks();
  mockNow = new Date('2026-10-01T12:00:00Z');
});

test('room mode: the classroom join; a non-platform lesson with its own link: none (owner Q3)', async () => {
  const { rerender } = await open(lesson({ id: 'a', platform_classroom: true }));
  expect(screen.getByTestId('join-classroom')).toBeTruthy();
  const own = lesson({
    id: 'b',
    platform_classroom: false,
    meeting_link: 'https://meet.google.com/x',
  });
  await rerender(
    <TeacherLessonSheet lesson={own} onClose={onClose} onNotice={onNotice} onReport={onReport} />,
  );
  expect(screen.queryByTestId('join-classroom')).toBeNull();
  expect(screen.getByRole('button', { name: w.confirm })).toBeTruthy();
});

test('after the start: exactly ONE report button, and it goes through onReport', async () => {
  mockNow = new Date('2026-10-01T13:50:00Z');
  await open(lesson({ id: 'l' }));
  const [report, ...more] = screen.getAllByRole('button', { name: t.reports.open });
  expect(more).toHaveLength(0);
  if (!report) throw new Error('no report button');
  await fireEvent.press(report);
  expect(onReport).toHaveBeenCalledWith('l');
});

test('a landed cancel closes the sheet once and hands the screen its notice', async () => {
  mockApiSend.mockResolvedValue(lesson({ id: 'c', status: 'cancelled_by_teacher' }));
  await open(lesson({ id: 'c' }));
  await fireEvent.press(screen.getByRole('button', { name: w.cancel }));
  await fireEvent.changeText(screen.getByLabelText(new RegExp(w.reason)), 'مرض');
  await fireEvent.press(screen.getByRole('button', { name: w.cancelSubmit }));
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  expect(onNotice).toHaveBeenCalledWith(w.cancelledOk);
});
