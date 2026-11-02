import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { SalesScheduleLesson } from '@ab/shared';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { TreeBaseProvider } from '@/core/nav/tree-base';
import { fakeNow } from '@/test/fake-now';
import { renderWithQuery } from '@/test/query';
import { scheduleLesson, teacher } from '@/sales/sales/testing/fixtures';
import { SalesScheduleScreen } from '@/sales/sales/screens/SalesScheduleScreen';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...args: unknown[]) => mockApiSend(...args),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() }, useLocalSearchParams: () => ({}) }));

// The academy default (owner 2026-11-02): no confirmation required. «Now» 1 Oct 16:20 Riyadh.
const NOW = new Date('2026-10-01T13:20:00Z');
const student = (name: string) => [{ id: `s-${name}`, code: 'AB-0300', name, mine: true }];
const LATER = scheduleLesson({
  id: 'l2', starts_at: '2026-10-01T15:00:00.000Z', ends_at: '2026-10-01T15:45:00.000Z', status: 'scheduled',
  students: student('سلمى'),
});
const ENDED = { ...LATER, id: 'l0', starts_at: '2026-10-01T12:00:00.000Z', ends_at: '2026-10-01T12:45:00.000Z', students: student('ريم') };
const HELD = { ...ENDED, id: 'l9', status: 'completed' as const, students: student('هند') };

const serve = (lessons: SalesScheduleLesson[]) =>
  mockApiFetch.mockImplementation(async (path: string) =>
    path === '/sales/teachers' ? [teacher()] : { date: '2026-10-01', lessons });

beforeEach(() => {
  serve([LATER, ENDED, HELD]);
  mockApiSend.mockReset();
  fakeNow(NOW);
});
afterEach(() => jest.useRealTimers());

const open = async (who: string) => {
  await renderWithQuery(<TreeBaseProvider value="/sales"><SalesScheduleScreen /></TreeBaseProvider>);
  await fireEvent.press(await screen.findByRole('button', { name: t.lessons.sheet.openRow.replace('{names}', who) }));
  await screen.findByRole('header', { name: who });
};
const a = t.sales.lessonActions;
const c = t.lessons.correct;
const radio = (name: string) => screen.getByRole('radio', { name });

test('a scheduled lesson reads «مجدولة», never «يحتاج تأكيد», and offers no «تأكيد الحلقة»', async () => {
  await open('سلمى');
  expect(screen.getByText(t.lessons.noConfirm.scheduled)).toBeTruthy();
  expect(screen.queryByText(t.enums.lessonStatus.scheduled)).toBeNull();
  expect(screen.queryByRole('button', { name: a.confirm })).toBeNull();
});

test('before the end: «ألغتها الإدارة» by default, or the teacher / the student, sent as `by`', async () => {
  mockApiSend.mockResolvedValue({ id: 'l2', status: 'excused' });
  await open('سلمى');
  await fireEvent.press(screen.getByRole('button', { name: a.cancel }));
  const admin = radio(t.enums.lessonStatus.cancelled_by_admin);
  expect(admin.props.accessibilityState).toMatchObject({ checked: true });
  await fireEvent.press(radio(c.byStudent));
  await fireEvent.press(screen.getByRole('button', { name: a.confirmCancel }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('POST', '/sales/lessons/l2/cancel', { by: 'student' }));
});

test('the default sends by admin with the trimmed reason', async () => {
  mockApiSend.mockResolvedValue({ id: 'l2', status: 'cancelled_by_admin' });
  await open('سلمى');
  await fireEvent.press(screen.getByRole('button', { name: a.cancel }));
  await fireEvent.changeText(screen.getByLabelText(a.reason), ' سفر ');
  await fireEvent.press(screen.getByRole('button', { name: a.confirmCancel }));
  const body = { reason: 'سفر', by: 'admin' };
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('POST', '/sales/lessons/l2/cancel', body));
});

test('after the end: «إلغاء الحلقة» stays, the teacher or the student only', async () => {
  mockApiSend.mockResolvedValue({ id: 'l0', status: 'cancelled_by_teacher' });
  await open('ريم');
  expect(screen.queryByText(t.lessons.sheet.readOnly)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: a.cancel }));
  expect(screen.queryByRole('radio', { name: t.enums.lessonStatus.cancelled_by_admin })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: a.confirmCancel }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('POST', '/sales/lessons/l0/cancel', { by: 'teacher' }));
});

test('a held lesson: «لم تنعقد الحلقة؟» posts by teacher, then says it is done', async () => {
  mockApiSend.mockResolvedValue({ id: 'l9', status: 'cancelled_by_teacher' });
  await open('هند');
  expect(screen.getByText(c.title)).toBeTruthy();
  expect(screen.getByText(c.hint)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: c.byTeacher }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('POST', '/sales/lessons/l9/cancel', { by: 'teacher' }));
  expect(await screen.findByText(c.done)).toBeTruthy();
});

test('by student; a lesson not held automatically answers 409 not_auto_held, said in words', async () => {
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'not_auto_held' }));
  await open('هند');
  await fireEvent.press(screen.getByRole('button', { name: c.byStudent }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('POST', '/sales/lessons/l9/cancel', { by: 'student' }));
  expect(await screen.findByText(t.lessons.error.not_auto_held)).toBeTruthy();
});
