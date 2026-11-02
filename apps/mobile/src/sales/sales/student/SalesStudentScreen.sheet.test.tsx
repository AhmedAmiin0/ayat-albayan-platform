import type { SalesStudentLesson } from '@ab/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { fakeNow } from '@/test/fake-now';
import { renderWithQuery } from '@/test/query';
import { SAT_17, SLOTS } from '@/teaching/reschedule/fixtures';
import { details, upcoming } from './fixtures';
import { SalesStudentScreen } from './SalesStudentScreen';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...args: unknown[]) => mockApiSend(...args),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() }, useLocalSearchParams: () => ({ id: 'st1' }) }));
jest.mock('@/core/lib/clock/device-clock', () => ({ deviceUses24: () => true }));

// «Now» Thursday 1 Oct 13:00 Riyadh; the student's lessons Friday 2 Oct and Sunday 4 Oct, 18:00 Riyadh.
const FRI = upcoming('u1', '2026-10-02T15:00:00.000Z');
const SUN = upcoming('u2', '2026-10-04T15:00:00.000Z');
const a = t.sales.lessonActions;
const DETAILS = '/sales/students/st1';
const withLessons = (lessons: SalesStudentLesson[]) => details({ schedule: { student_tz: 'Africa/Cairo', weekly: [], upcoming: lessons } });
const rows = () => screen.queryAllByRole('button', { name: /^تفاصيل الحلقة — يوسف أحمد · / });
const reads = () => mockApiFetch.mock.calls.filter(([p]) => p === DETAILS).length;

/** The details answer `first`, then `after` once a change refetched them. */
const serve = (first: SalesStudentLesson[], after: SalesStudentLesson[] = first) =>
  mockApiFetch.mockImplementation(async (path: string) =>
    path.startsWith('/sales/booking/slots') ? SLOTS : withLessons(reads() > 1 ? after : first));

const first = <T,>(all: readonly T[]): T => {
  if (!all[0]) throw new Error('none found');
  return all[0];
};

const open = async (day: RegExp) => {
  await renderWithQuery(<SalesStudentScreen />);
  await fireEvent.press(first(await screen.findAllByRole('button', { name: day })));
  return screen.findByText(t.lessons.details);
};

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiSend.mockReset();
  fakeNow(new Date('2026-10-01T10:00:00Z'));
});
afterEach(() => jest.useRealTimers());

test('the sheet from «الجدول»: the tapped lesson\'s date, no link line, the student\'s own name plain', async () => {
  serve([FRI, SUN]);
  await open(/ · .*4 أكتوبر 18:00$/);
  expect(screen.getAllByText(/4 أكتوبر/).length).toBeGreaterThan(1);
  expect(screen.queryByText(t.lessons.joinLink)).toBeNull();
  expect(screen.queryByText(t.lessons.noLink)).toBeNull();
  expect(screen.queryByText(t.lessons.viaClassroom)).toBeNull();
  expect(screen.queryByRole('button', { name: t.lessons.sheet.openStudent.replace('{name}', 'يوسف أحمد') })).toBeNull();
  expect(screen.getAllByText('يوسف أحمد').length).toBeGreaterThan(0);
  expect(router.push).not.toHaveBeenCalled();
});

test('cancel from the sheet reads «تفاصيل الطالب» again: the cancelled lesson leaves «الحلقات القادمة»', async () => {
  serve([FRI, SUN], [SUN]);
  mockApiSend.mockResolvedValue({ id: 'u1', status: 'cancelled_by_admin' });
  await open(/2 أكتوبر 18:00$/);
  await fireEvent.press(screen.getByRole('button', { name: a.cancel }));
  await fireEvent.press(screen.getByRole('button', { name: a.confirmCancel }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('POST', '/sales/lessons/u1/cancel', {}));
  expect(await screen.findByText(a.cancelled)).toBeTruthy();
  await waitFor(() => expect(reads()).toBe(2));
  await fireEvent.press(screen.getByRole('button', { name: t.common.close }));
  await waitFor(() => expect(rows()).toHaveLength(1));
  expect(within(first(rows())).getByText('18:00')).toBeTruthy();
});

test('reschedule from the sheet reads «تفاصيل الطالب» again: the moved lesson leaves, the new one shows', async () => {
  const moved = upcoming('n1', SAT_17);
  serve([FRI], [moved]);
  mockApiSend.mockResolvedValue({ id: 'n1', starts_at: SAT_17, status: 'scheduled' });
  await open(/2 أكتوبر 18:00$/);
  await fireEvent.press(screen.getByRole('button', { name: a.reschedule }));
  await fireEvent.press(first(await screen.findAllByRole('radio', { name: /^17:00/ })));
  await fireEvent.press(screen.getByRole('button', { name: t.lessons.rescheduleSubmit }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('POST', '/sales/lessons/u1/reschedule', { startsAt: SAT_17 }));
  await fireEvent.press(await screen.findByRole('button', { name: t.reschedule.done }));
  await waitFor(() => expect(reads()).toBe(2));
  await waitFor(() => expect(rows()).toHaveLength(1));
  expect(screen.getByRole('button', { name: /3 أكتوبر 17:00$/ })).toBeTruthy();
  expect(screen.queryByRole('button', { name: /2 أكتوبر 18:00$/ })).toBeNull();
});

test('a cancelled lesson (an old answer) opens read-only: no action', async () => {
  serve([{ ...FRI, status: 'cancelled_by_admin' }]);
  await open(/2 أكتوبر 18:00$/);
  expect(screen.getAllByText(t.enums.lessonStatus.cancelled_by_admin).length).toBeGreaterThan(0);
  expect(screen.getByText(t.lessons.sheet.readOnly)).toBeTruthy();
  expect(screen.queryByRole('button', { name: a.reschedule })).toBeNull();
  expect(screen.queryByRole('button', { name: a.cancel })).toBeNull();
});
