import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { SLOTS, SUN_17 } from '@/reschedule/fixtures';
import { renderWithQuery } from '@/test/query';
import { done, lesson, pending } from './testing/fixtures';
import { TodayScreen } from './screens/TodayScreen';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...args: unknown[]) => mockApiSend(...args),
}));
// The «جلسات مباشرة» section repeats the live card; it has its own tests (src/live).
jest.mock('@/live/LiveSessions', () => ({ LiveSessions: () => null }));
// The bell reads its own API (notifications/BellButton.test); here it would take the day's mocked answers.
jest.mock('@/notifications/BellButton', () => ({ BellButton: () => null }));

const dayCalls = () =>
  mockApiFetch.mock.calls.filter(([path]: [string]) => path.startsWith('/lessons/day')).length;

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiSend.mockReset();
  jest.useFakeTimers({ now: new Date('2026-10-01T13:20:00Z'), advanceTimers: true });
});
afterEach(() => jest.useRealTimers());

function serve(day: unknown[]) {
  mockApiFetch.mockImplementation(async (path: string) => {
    if (path.startsWith('/lessons/day')) return day;
    if (path.startsWith('/booking/slots')) return SLOTS;
    return null;
  });
}

test('an open card offers «غيّر الموعد»; a held lesson does not', async () => {
  serve([done, pending]);
  await renderWithQuery(<TodayScreen />);
  await screen.findByText('يوسف أحمد');
  expect(screen.getAllByRole('button', { name: t.lessons.rescheduleSubmit })).toHaveLength(1);
});

test('«غيّر الموعد» opens the sheet over Today; the move lands and Today refetches', async () => {
  serve([pending]);
  const moved = lesson({ id: 'new', starts_at: SUN_17, ends_at: '2026-10-04T14:45:00.000Z' });
  mockApiSend.mockResolvedValue(moved);
  await renderWithQuery(<TodayScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: t.lessons.rescheduleSubmit }));
  expect(await screen.findByRole('header', { name: t.lessons.rescheduleTitle })).toBeTruthy();

  await fireEvent.press(await screen.findByRole('radio', { name: 'الأحد 4 أكتوبر' }));
  await fireEvent.press(screen.getByRole('radio', { name: '17:00' }));
  const [, submit] = screen.getAllByRole('button', { name: t.lessons.rescheduleSubmit });
  if (!submit) throw new Error('no submit in the sheet');
  await fireEvent.press(submit);
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/lessons/l-pending/reschedule', { scope: 'one', startsAt: SUN_17 });
  expect(await screen.findByText(t.reschedule.guardianNote)).toBeTruthy();
  await waitFor(() => expect(dayCalls()).toBe(2));

  await fireEvent.press(screen.getByRole('button', { name: t.reschedule.done }));
  expect(screen.queryByRole('header', { name: t.lessons.rescheduleTitle })).toBeNull();
});
