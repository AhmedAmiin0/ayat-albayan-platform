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

test('the ended lesson’s sheet: ONE report button, to «اليوم»’s own report route', async () => {
  await renderWithQuery(<TeacherTodayScreen />, confirmingQueryClient());
  const fold = await screen.findByRole('button', { name: counted(t.today.endedFold, 1) });
  await fireEvent.press(fold);
  await fireEvent.press(await openRow('يوسف أحمد'));
  const [report, ...more] = screen.getAllByRole('button', { name: t.reports.open });
  expect(more).toHaveLength(0);
  if (!report) throw new Error('no report button in the sheet');
  await fireEvent.press(report);
  expect(mockPush).toHaveBeenCalledWith('/teacher/today/report/held');
});
