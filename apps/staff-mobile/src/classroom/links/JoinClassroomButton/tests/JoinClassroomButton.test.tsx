import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Linking, StyleSheet } from 'react-native';
import { ApiError, t } from '@ab/mobile-kit';
import { lesson } from '@/today/testing/fixtures';
import { JoinClassroomButton } from '@/classroom/links/JoinClassroomButton/JoinClassroomButton';

const mockApiSend = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));

// Lesson 16:00-16:45 Riyadh (13:00Z): opens 12:45Z, closes 15:45Z.
const LESSON_ID = '0a5c2b1e-6c3e-4d61-9a43-1b2f9b8e7d10';
const row = lesson({ id: LESSON_ID });
const JOIN = { url: 'wss://lk', token: 'tok', room: 'lesson-x', role: 'teacher' };
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
  mockApiSend.mockResolvedValue(JOIN);
  await render(<JoinClassroomButton lesson={row} />);
  await fireEvent.press(button());
  await waitFor(() => expect(openURL).toHaveBeenCalledTimes(1));
  expect(mockApiSend).toHaveBeenCalledWith('POST', `/lessons/${LESSON_ID}/room/join`, undefined);
  expect(openURL).toHaveBeenCalledWith(`https://app.ayatalbayan.com/classroom/${LESSON_ID}`);
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
  let finish: (answer: typeof JOIN) => void = () => undefined;
  mockApiSend.mockReturnValue(new Promise<typeof JOIN>((resolve) => (finish = resolve)));
  await render(<JoinClassroomButton lesson={row} />);
  const press = button().props.onClick as () => void;
  await act(async () => {
    press();
    press();
  });
  expect(mockApiSend).toHaveBeenCalledTimes(1);
  expect(screen.getByText(t.classroom.joining)).toBeTruthy();
  await act(async () => finish(JOIN));
  await waitFor(() => expect(openURL).toHaveBeenCalledTimes(1));
});

test('a cancelled lesson has no button', async () => {
  at('2026-10-01T13:00:00.000Z');
  await render(<JoinClassroomButton lesson={lesson({ id: 'x', status: 'cancelled_by_admin' })} />);
  expect(screen.queryByText(t.classroom.enter)).toBeNull();
});

test('the button takes the full width, so its label is never clipped to «Join the»', async () => {
  at('2026-10-01T12:45:00.000Z');
  await render(<JoinClassroomButton lesson={row} />);
  expect(StyleSheet.flatten(screen.getByTestId('join-classroom').props.style).alignSelf).toBe('stretch');
});
