import { act, renderHook } from '@testing-library/react-native';
import { useCountdown } from './use-countdown';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('counts down a second at a time and stops at zero', async () => {
  const { result } = await renderHook(() => useCountdown());
  expect(result.current.left).toBe(0);
  await act(async () => result.current.start(2));
  expect(result.current.left).toBe(2);
  await act(async () => jest.advanceTimersByTime(1000));
  expect(result.current.left).toBe(1);
  await act(async () => jest.advanceTimersByTime(5000));
  expect(result.current.left).toBe(0);
});
