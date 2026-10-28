import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { TreeBaseProvider } from '@/core/nav/tree-base';
import { fakeNow } from '@/test/fake-now';
import { renderWithQuery } from '@/test/query';
import { SAT_17, SLOTS } from '@/teaching/reschedule/fixtures';
import { scheduleLesson, teacher } from '../testing/fixtures';
import { SalesScheduleScreen } from '../screens/SalesScheduleScreen';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...args: unknown[]) => mockApiSend(...args),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() }, useLocalSearchParams: () => ({}) }));

// «Now» Thursday 1 Oct 16:20 Riyadh. Hers: سلمى at 18:00 (mine). Another family's: يوسف at 19:00.
const NOW = new Date('2026-10-01T13:20:00Z');
const MINE = scheduleLesson({
  id: 'l2', starts_at: '2026-10-01T15:00:00.000Z', ends_at: '2026-10-01T15:45:00.000Z', status: 'scheduled',
  students: [{ id: 'st3', code: 'AB-0200', name: 'سلمى', mine: true }],
});
const OTHERS = scheduleLesson({ id: 'l3', starts_at: '2026-10-01T16:00:00.000Z', ends_at: '2026-10-01T16:45:00.000Z' });

beforeEach(() => {
  mockApiFetch.mockReset().mockImplementation(async (path: string) =>
    path === '/sales/teachers' ? [teacher()] : path.startsWith('/sales/booking/slots') ? SLOTS : { date: '2026-10-01', lessons: [MINE, OTHERS] });
  mockApiSend.mockReset();
  fakeNow(NOW);
});
afterEach(() => jest.useRealTimers());

const open = async (who: string) => {
  // The sales tree (SalesTabs wraps its screens in TreeBaseProvider '/sales').
  await renderWithQuery(<TreeBaseProvider value="/sales"><SalesScheduleScreen /></TreeBaseProvider>);
  await fireEvent.press(await screen.findByRole('button', { name: t.lessons.sheet.openRow.replace('{names}', who) }));
  await screen.findByRole('header', { name: who });
};
const a = t.sales.lessonActions;

test('her student\'s lesson: «تغيير الموعد» and «إلغاء الحلقة», not «للاطلاع فقط»; the name opens «تفاصيل الطالب»', async () => {
  await open('سلمى');
  expect(screen.getByRole('button', { name: a.reschedule })).toBeTruthy();
  expect(screen.getByRole('button', { name: a.cancel })).toBeTruthy();
  expect(screen.queryByText(t.lessons.sheet.readOnly)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: t.lessons.sheet.openStudent.replace('{name}', 'سلمى') }));
  expect(router.push).toHaveBeenCalledWith('/sales/students/st3');
});

test('another family\'s lesson (owner 2026-10-28): both actions, no «للاطلاع فقط», the name opens «تفاصيل الطالب»', async () => {
  await open('يوسف أحمد');
  expect(screen.getByRole('button', { name: a.reschedule })).toBeTruthy();
  expect(screen.getByRole('button', { name: a.cancel })).toBeTruthy();
  expect(screen.queryByText(t.lessons.sheet.readOnly)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: t.lessons.sheet.openStudent.replace('{name}', 'يوسف أحمد') }));
  expect(router.push).toHaveBeenCalledWith(expect.stringMatching(/^\/sales\/students\//));
});

test('cancel without a reason posts {} to her route; the lesson reads cancelled', async () => {
  mockApiSend.mockResolvedValue({ id: 'l2', status: 'cancelled_by_admin' });
  await open('سلمى');
  await fireEvent.press(screen.getByRole('button', { name: a.cancel }));
  expect(screen.getByText(a.cancelTitle)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: a.confirmCancel }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('POST', '/sales/lessons/l2/cancel', {}));
  expect(await screen.findByText(a.cancelled)).toBeTruthy();
});

test('a typed reason is sent trimmed', async () => {
  mockApiSend.mockResolvedValue({ id: 'l2', status: 'cancelled_by_admin' });
  await open('سلمى');
  await fireEvent.press(screen.getByRole('button', { name: a.cancel }));
  await fireEvent.changeText(screen.getByLabelText(a.reason), '  سفر الأسرة ');
  await fireEvent.press(screen.getByRole('button', { name: a.confirmCancel }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('POST', '/sales/lessons/l2/cancel', { reason: 'سفر الأسرة' }));
});

test('reschedule: her scoped slots, one lesson only, then the admin\'s success panel', async () => {
  mockApiSend.mockResolvedValue({ id: 'new', starts_at: SAT_17, status: 'scheduled' });
  await open('سلمى');
  await fireEvent.press(screen.getByRole('button', { name: a.reschedule }));
  await fireEvent.press(await screen.findByRole('radio', { name: '17:00' }));
  expect(mockApiFetch).toHaveBeenCalledWith(expect.stringMatching(/^\/sales\/booking\/slots\?teacherId=t1&.*studentIds=st3.*&lessonId=l2/));
  expect(screen.queryByRole('radio', { name: t.lessons.scope.rule })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: t.lessons.rescheduleSubmit }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('POST', '/sales/lessons/l2/reschedule', { startsAt: SAT_17 }));
  expect(await screen.findByText(t.lessons.rescheduled)).toBeTruthy();
});

test('«تم» after a move closes «تفاصيل الحلقة» too: no old time with live actions left behind', async () => {
  mockApiSend.mockResolvedValue({ id: 'new', starts_at: SAT_17, status: 'scheduled' });
  await open('سلمى');
  await fireEvent.press(screen.getByRole('button', { name: a.reschedule }));
  await fireEvent.press(await screen.findByRole('radio', { name: '17:00' }));
  await fireEvent.press(screen.getByRole('button', { name: t.lessons.rescheduleSubmit }));
  await fireEvent.press(await screen.findByRole('button', { name: t.reschedule.done }));
  await waitFor(() => expect(screen.queryByRole('header', { name: 'سلمى' })).toBeNull());
  expect(screen.queryByRole('button', { name: a.reschedule })).toBeNull();
  expect(screen.queryByRole('button', { name: a.cancel })).toBeNull();
});

test('a refusal from the API says why (409 lesson_ended)', async () => {
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'lesson_ended' }));
  await open('سلمى');
  await fireEvent.press(screen.getByRole('button', { name: a.reschedule }));
  await fireEvent.press(await screen.findByRole('radio', { name: '17:00' }));
  await fireEvent.press(screen.getByRole('button', { name: t.lessons.rescheduleSubmit }));
  expect(await screen.findByText(t.lessons.error.lesson_ended)).toBeTruthy();
});

test('a lesson that has ended offers nothing: «للاطلاع فقط»', async () => {
  const ended = { ...MINE, id: 'l0', starts_at: '2026-10-01T12:00:00.000Z', ends_at: '2026-10-01T12:45:00.000Z', students: [{ id: 'st4', code: 'AB-0201', name: 'ريم', mine: true }] };
  mockApiFetch.mockImplementation(async (path: string) => (path === '/sales/teachers' ? [teacher()] : { date: '2026-10-01', lessons: [ended] }));
  await open('ريم');
  expect(screen.queryByRole('button', { name: a.reschedule })).toBeNull();
  expect(screen.queryByRole('button', { name: a.cancel })).toBeNull();
  expect(screen.getByText(t.lessons.sheet.readOnly)).toBeTruthy();
});
