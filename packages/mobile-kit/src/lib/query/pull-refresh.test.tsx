import { act, renderHook } from '@testing-library/react-native';
import { usePullRefresh } from './pull-refresh';

test('spins from the pull until its refetch settles, and never for a refetch it did not start', async () => {
  let settle: () => void = () => undefined;
  const refetch = jest.fn(() => new Promise<void>((resolve) => (settle = resolve)));
  const { result } = await renderHook(() => usePullRefresh(refetch));
  expect(result.current.refreshing).toBe(false);
  await act(async () => result.current.onRefresh());
  expect(refetch).toHaveBeenCalledTimes(1);
  expect(result.current.refreshing).toBe(true);
  await act(async () => settle());
  expect(result.current.refreshing).toBe(false);
});

test('a failed refetch still stops the spinner', async () => {
  const refetch = jest.fn(async () => Promise.reject(new Error('offline')));
  const { result } = await renderHook(() => usePullRefresh(refetch));
  await act(async () => result.current.onRefresh());
  expect(result.current.refreshing).toBe(false);
});
