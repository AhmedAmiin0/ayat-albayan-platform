import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { SLOTS, SUN_17 } from '@/teaching/reschedule/fixtures';
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

const move = (who: string) => ({ name: `${t.lessons.rescheduleSubmit} — ${who}` });

test('an open lesson’s sheet offers «غيّر الموعد»; a held lesson’s does not', async () => {
  serve([done, pending]);
  await renderWithQuery(<TodayScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: t.today.details }));
  expect(await screen.findByRole('button', move('يوسف أحمد'))).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.common.close }));
  await fireEvent.press(screen.getByRole('button', { name: 'انتهت حلقة واحدة اليوم' }));
  await fireEvent.press(screen.getByRole('button', { name: /^10:00، جودى خالد/ }));
  await screen.findByRole('header', { name: 'جودى خالد' });
  expect(screen.queryByRole('button', move('جودى خالد'))).toBeNull();
});

test('«غيّر الموعد» in the details opens the reschedule sheet; the move lands and Today refetches', async () => {
  serve([pending]);
  const moved = lesson({ id: 'new', starts_at: SUN_17, ends_at: '2026-10-04T14:45:00.000Z' });
  mockApiSend.mockResolvedValue(moved);
  await renderWithQuery(<TodayScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: t.today.details }));
  await fireEvent.press(await screen.findByRole('button', move('يوسف أحمد')));
  expect(await screen.findByRole('header', { name: t.lessons.rescheduleTitle })).toBeTruthy();

  await fireEvent.press(await screen.findByRole('radio', { name: 'الأحد 4 أكتوبر' }));
  await fireEvent.press(screen.getByRole('radio', { name: '17:00' }));
  const [submit] = screen.getAllByRole('button', { name: t.lessons.rescheduleSubmit });
  if (!submit) throw new Error('no submit in the sheet');
  await fireEvent.press(submit);
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/lessons/l-pending/reschedule', { scope: 'one', startsAt: SUN_17 });
  expect(await screen.findByText(t.reschedule.guardianNote)).toBeTruthy();
  await waitFor(() => expect(dayCalls()).toBe(2));

  await fireEvent.press(screen.getByRole('button', { name: t.reschedule.done }));
  expect(screen.queryByRole('header', { name: t.lessons.rescheduleTitle })).toBeNull();
});
