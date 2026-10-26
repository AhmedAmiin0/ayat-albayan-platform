import { fireEvent, screen } from '@testing-library/react-native';
import { GRID, held } from '@/edit-time/testing/fixtures';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { pending } from './testing/fixtures';
import { TodayScreen } from './screens/TodayScreen';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: jest.fn(),
}));
// The «جلسات مباشرة» section repeats the live card; it has its own tests (src/live).
jest.mock('@/live/LiveSessions', () => ({ LiveSessions: () => null }));
// The bell reads its own API (notifications/BellButton.test); here it would take the day's mocked answers.
jest.mock('@/notifications/BellButton', () => ({ BellButton: () => null }));

beforeEach(() => {
  mockApiFetch.mockReset();
  jest.useFakeTimers({ now: new Date('2026-10-01T13:20:00Z'), advanceTimers: true });
});
afterEach(() => jest.useRealTimers());

function serve(day: unknown[]) {
  mockApiFetch.mockImplementation(async (path: string) => {
    if (path.startsWith('/lessons/day')) return day;
    if (path.startsWith('/booking/slots')) return GRID;
    return null;
  });
}

test('an open card offers «عدّل الوقت» beside «غيّر الموعد», and it opens the edit sheet over Today', async () => {
  serve([{ ...pending, time_edit_mode: 'move' }]);
  await renderWithQuery(<TodayScreen />);
  await screen.findByText('يوسف أحمد');
  expect(screen.getByRole('button', { name: t.lessons.rescheduleSubmit })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.editTime.action }));
  expect(await screen.findByRole('header', { name: t.editTime.title })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.common.close }));
  expect(screen.queryByRole('header', { name: t.editTime.title })).toBeNull();
});

test('an ended lesson opens the correction sheet from its line', async () => {
  serve([held]);
  await renderWithQuery(<TodayScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: `${t.editTime.action} — جودى خالد` }));
  expect(await screen.findByRole('header', { name: t.editTime.correctTitle })).toBeTruthy();
});

test('without the API’s mode (a cache from before) there is no «عدّل الوقت»', async () => {
  serve([pending]);
  await renderWithQuery(<TodayScreen />);
  await screen.findByText('يوسف أحمد');
  expect(screen.queryByRole('button', { name: t.editTime.action })).toBeNull();
});
