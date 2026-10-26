import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { lesson } from '@/today/fixtures';
import { JoinClassroomButton } from './JoinClassroomButton';

const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));

// Lesson 16:00-16:45 Riyadh (13:00Z): opens 12:45Z, closes 15:45Z.
const row = lesson({ id: 'l-1' });
const at = (iso: string) => jest.setSystemTime(new Date(iso));
const button = () => screen.getByRole('button', { name: t.classroom.enter });
const off = () => button().props.accessibilityState.disabled as boolean;
let openURL: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask'] });
  openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
});
afterEach(() => jest.useRealTimers());

test('before the window it is off with «تُفتح الساعة 15:45»', async () => {
  at('2026-10-01T12:00:00.000Z');
  await render(<JoinClassroomButton lesson={row} />);
  expect(off()).toBe(true);
  expect(screen.getByText(t.classroom.opensAt.replace('{time}', '15:45'))).toBeTruthy();
});

test('inside the window it is on; after it, off with «انتهت الحلقة»', async () => {
  at('2026-10-01T12:45:00.000Z');
  await render(<JoinClassroomButton lesson={row} />);
  expect(off()).toBe(false);
  await act(async () => {
    at('2026-10-01T15:46:00.000Z');
    jest.advanceTimersByTime(60_000);
  });
  expect(off()).toBe(true);
  expect(screen.getByText(t.classroom.closedHint)).toBeTruthy();
});

test('the minute timer opens it when the time comes, and is cleared on unmount', async () => {
  at('2026-10-01T12:44:30.000Z');
  const { unmount } = await render(<JoinClassroomButton lesson={row} />);
  expect(off()).toBe(true);
  await act(async () => {
    jest.advanceTimersByTime(60_000);
  });
  expect(off()).toBe(false);
  await unmount();
  expect(jest.getTimerCount()).toBe(0);
});

test('a press asks the API for this lesson, then opens the web classroom', async () => {
  at('2026-10-01T13:00:00.000Z');
  mockApiSend.mockResolvedValue({});
  await render(<JoinClassroomButton lesson={row} />);
  await fireEvent.press(button());
  await waitFor(() => expect(openURL).toHaveBeenCalledTimes(1));
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/lessons/l-1/room/join');
  expect(openURL).toHaveBeenCalledWith('https://app.ayatalbayan.com/classroom/l-1');
});

test.each([
  'classroom_not_configured',
  'join_not_open_yet',
  'join_closed',
  'forbidden',
  'lesson_not_found',
])('a %s refusal shows its message and opens nothing', async (code) => {
  at('2026-10-01T13:00:00.000Z');
  mockApiSend.mockRejectedValue(new ApiError(403, { code, message: code }));
  await render(<JoinClassroomButton lesson={row} />);
  await fireEvent.press(button());
  const message: Record<string, string> = t.classroom.error;
  expect(await screen.findByText(message[code] ?? '')).toBeTruthy();
  expect(openURL).not.toHaveBeenCalled();
  expect(off()).toBe(false);
});

test('a double press makes one call', async () => {
  at('2026-10-01T13:00:00.000Z');
  let finish: () => void = () => undefined;
  mockApiSend.mockReturnValue(new Promise<void>((resolve) => (finish = resolve)));
  await render(<JoinClassroomButton lesson={row} />);
  const press = button().props.onClick as () => void;
  await act(async () => {
    press();
    press();
  });
  expect(mockApiSend).toHaveBeenCalledTimes(1);
  expect(screen.getByText(t.classroom.joining)).toBeTruthy();
  await act(async () => finish());
  await waitFor(() => expect(openURL).toHaveBeenCalledTimes(1));
});

test('a cancelled lesson has no button', async () => {
  at('2026-10-01T13:00:00.000Z');
  await render(<JoinClassroomButton lesson={lesson({ id: 'x', status: 'cancelled_by_admin' })} />);
  expect(screen.queryByText(t.classroom.enter)).toBeNull();
});
