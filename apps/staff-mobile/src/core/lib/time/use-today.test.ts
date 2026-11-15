import { act, renderHook } from '@testing-library/react-native';
import { useToday } from './use-today';

beforeEach(() => {
  jest.useFakeTimers({
    now: new Date(2026, 9, 26, 23, 58),
    doNotFake: ['setTimeout', 'clearTimeout', 'setImmediate', 'clearImmediate', 'nextTick', 'queueMicrotask'],
  });
});
afterEach(() => jest.useRealTimers());

test('the same Date through the day\'s minute ticks, a new one after midnight', async () => {
  const { result } = await renderHook(() => useToday());
  const first = result.current;
  await act(async () => jest.advanceTimersByTime(60_000));
  expect(result.current).toBe(first);
  await act(async () => jest.advanceTimersByTime(2 * 60_000));
  expect(result.current).not.toBe(first);
  expect(result.current.getDate()).toBe(27);
});
