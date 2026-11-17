import { act, renderHook } from '@testing-library/react-native';
import { useElapsed } from './use-elapsed';

test('the recorder’s own clock while on; 0 once off', async () => {
  jest.useFakeTimers();
  let ms = 1200;
  const read = () => ms;
  const { result, rerender } = await renderHook(({ on }: { on: boolean }) => useElapsed(on, read), {
    initialProps: { on: true },
  });
  expect(result.current).toBe(1200);
  ms = 3400;
  await act(async () => jest.advanceTimersByTime(250));
  expect(result.current).toBe(3400);
  await rerender({ on: false });
  expect(result.current).toBe(0);
  jest.useRealTimers();
});

test('no clock from the app: counted from the start here', async () => {
  jest.useFakeTimers();
  const { result } = await renderHook(() => useElapsed(true, undefined));
  await act(async () => jest.advanceTimersByTime(1000));
  expect(result.current).toBeGreaterThanOrEqual(1000);
  jest.useRealTimers();
});
