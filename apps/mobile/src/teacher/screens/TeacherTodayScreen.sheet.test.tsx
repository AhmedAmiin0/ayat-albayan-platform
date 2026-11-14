import { counted } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { confirmingQueryClient, renderWithQuery } from '@/test/query';
import { answer, evening, held, later } from '@/teacher/today/testing/day-fixtures';
import { TeacherTodayScreen } from './TeacherTodayScreen';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
  apiSend: (m: string, p: string, b?: unknown) => mockApiSend(m, p, b),
}));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (h: string) => mockPush(h), navigate: jest.fn() },
}));
jest.mock('@/core/lib/time/use-now', () => ({ useNow: () => new Date('2026-10-01T14:00:00Z') }));

const w = t.teacherBoard;
const openRow = (names: string) =>
  screen.findByRole('button', { name: t.lessons.sheet.openRow.replace('{names}', names) });

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockImplementation(answer([later, held, evening]));
});

test('row → sheet → «إلغاء الحلقة» POSTs the reason; the notice says it once', async () => {
  const cancelled = { ...evening, status: 'cancelled_by_teacher', cancel_reason: 'سفر' };
  mockApiSend.mockResolvedValue(cancelled);
  await renderWithQuery(<TeacherTodayScreen />, confirmingQueryClient());
  await fireEvent.press(await openRow('سلمى علي'));
  await fireEvent.press(screen.getByRole('button', { name: w.cancel }));
  await fireEvent.changeText(screen.getByLabelText(new RegExp(w.reason)), 'سفر');
  await fireEvent.press(screen.getByRole('button', { name: w.cancelSubmit }));
  await waitFor(() =>
    expect(mockApiSend).toHaveBeenCalledWith('POST', '/teachers/me/lessons/evening/cancel', {
      reason: 'سفر',
    }),
  );
  expect(await screen.findByText(w.cancelledOk)).toBeTruthy();
  expect(screen.getAllByText(w.cancelledOk)).toHaveLength(1);
  expect(screen.queryByTestId('teacher-cancel-form')).toBeNull();
});

test('the hero’s «التفاصيل» opens the sheet; its fixed link lesson has no classroom join', async () => {
  await renderWithQuery(<TeacherTodayScreen />, confirmingQueryClient());
  await fireEvent.press(await screen.findByRole('button', { name: t.today.details }));
  expect(await screen.findByRole('button', { name: w.cancel })).toBeTruthy();
  expect(screen.queryByTestId('join-classroom')).toBeNull();
});

test('the ended lesson: its row lead and ONE sheet button, to «اليوم»’s own route', async () => {
  await renderWithQuery(<TeacherTodayScreen />, confirmingQueryClient());
  const fold = await screen.findByRole('button', { name: counted(t.today.endedFold, 1) });
  await fireEvent.press(fold);
  expect(screen.getAllByRole('button', { name: t.reports.open })).toHaveLength(1);
  await fireEvent.press(await openRow('يوسف أحمد'));
  const [, sheet, ...more] = screen.getAllByRole('button', { name: t.reports.open });
  expect(more).toHaveLength(0);
  if (!sheet) throw new Error('no report button in the sheet');
  await fireEvent.press(sheet);
  expect(mockPush).toHaveBeenCalledWith('/teacher/today/report/held');
});

test('an excused lesson that started: its row leads with the report, shown once', async () => {
  const excused = {
    ...evening,
    status: 'excused' as const,
    starts_at: '2026-10-01T13:30:00.000Z',
    ends_at: '2026-10-01T14:30:00.000Z',
  };
  mockApiFetch.mockImplementation(answer([later, excused], []));
  await renderWithQuery(<TeacherTodayScreen />, confirmingQueryClient());
  await openRow('سلمى علي');
  // No due block on «اليوم» any more (owner 2026-11-14): the row's lead is the one way in.
  expect(screen.getAllByRole('button', { name: t.reports.open })).toHaveLength(1);
  expect(
    screen.queryAllByRole('button', { name: new RegExp(`^${t.reports.open} — سلمى علي`) }),
  ).toHaveLength(0);
});
