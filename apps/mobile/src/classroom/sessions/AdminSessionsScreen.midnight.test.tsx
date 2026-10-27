import { act, fireEvent, screen } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { dayLabel } from '@/calendar/lib/week';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { AdminSessionsScreen } from './AdminSessionsScreen';

// The owner (2026-10-27): the screen stays mounted for days, so the day must follow the clock.
const mockApiFetch = jest.fn();
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  apiSend: jest.fn(),
}));

/** 23:59 on 26 Oct in Riyadh (UTC+3). */
const BEFORE_MIDNIGHT = new Date('2026-10-26T20:59:00Z');

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});
beforeEach(() => {
  mockApiFetch.mockReset().mockResolvedValue([]);
  jest.useFakeTimers({ now: BEFORE_MIDNIGHT });
});

const header = (date: string) => screen.findByRole('header', { name: dayLabel(date) });

test('mounted at 23:59 on 26 Oct, the screen shows 27 Oct after midnight', async () => {
  await renderWithQuery(<AdminSessionsScreen />);
  expect(await header('2026-10-26')).toBeTruthy();
  await act(async () => jest.advanceTimersByTime(60_000));
  expect(await header('2026-10-27')).toBeTruthy();
  expect(screen.getByRole('button', { name: t.schedule.today })).toBeDisabled();
});

test('a day the user picked stays after midnight', async () => {
  await renderWithQuery(<AdminSessionsScreen />);
  expect(await header('2026-10-26')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.schedule.prevDay }));
  expect(await header('2026-10-25')).toBeTruthy();
  await act(async () => jest.advanceTimersByTime(60_000));
  expect(await header('2026-10-25')).toBeTruthy();
});

test('back from the background over midnight, the day is the new today at once', async () => {
  const handlers: ((s: AppStateStatus) => void)[] = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
    handlers.push(handler as (s: AppStateStatus) => void);
    return { remove: jest.fn() };
  });
  await renderWithQuery(<AdminSessionsScreen />);
  expect(await header('2026-10-26')).toBeTruthy();
  // The interval was paused in the background: the clock jumps 8 hours with no tick.
  jest.setSystemTime(new Date('2026-10-27T04:59:00Z'));
  await act(async () => handlers.forEach((h) => h('active')));
  expect(await header('2026-10-27')).toBeTruthy();
});
