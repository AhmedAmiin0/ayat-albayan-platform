import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { useNow } from './use-now';

const remove = jest.fn();
let change: (s: AppStateStatus) => void = () => undefined;

beforeEach(() => {
  // Only the clock and the interval are fake, so the timer count is the hook's own.
  jest.useFakeTimers({
    now: new Date('2026-10-26T20:59:00Z'),
    doNotFake: ['setTimeout', 'clearTimeout', 'setImmediate', 'clearImmediate', 'nextTick', 'queueMicrotask'],
  });
  remove.mockClear();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
    change = handler as (s: AppStateStatus) => void;
    return { remove };
  });
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test('ticks once a minute', async () => {
  const { result } = await renderHook(() => useNow());
  await act(async () => jest.advanceTimersByTime(60_000));
  expect(result.current.toISOString()).toBe('2026-10-26T21:00:00.000Z');
});

test('back to the foreground it reads the clock at once; going to the background does not', async () => {
  const { result } = await renderHook(() => useNow());
  jest.setSystemTime(new Date('2026-10-27T05:00:00Z'));
  await act(async () => change('background'));
  expect(result.current.toISOString()).toBe('2026-10-26T20:59:00.000Z');
  await act(async () => change('active'));
  expect(result.current.toISOString()).toBe('2026-10-27T05:00:00.000Z');
});

test('unmount clears the interval and removes the AppState listener', async () => {
  const { unmount } = await renderHook(() => useNow());
  expect(jest.getTimerCount()).toBe(1);
  await act(async () => unmount());
  expect(jest.getTimerCount()).toBe(0);
  expect(remove).toHaveBeenCalledTimes(1);
});
