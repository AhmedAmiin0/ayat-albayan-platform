import { act, renderHook } from '@testing-library/react-native';
import { usePagedActions, withTracked } from './paged-result';

test('withTracked adds fields without reading the result (no spread of tracked getters)', () => {
  const read: string[] = [];
  const result = new Proxy({ data: 1, isFetching: false }, { get: (t, k) => (read.push(String(k)), Reflect.get(t, k)) });
  const out = withTracked(result, { items: [1] });
  expect(read).toEqual([]);
  expect(out.items).toEqual([1]);
  expect(out.data).toBe(1);
  expect(read).toEqual(['data']);
});

test('loadMore asks for the next page only when there is one and none is on its way; both stay stable', async () => {
  const fetchNextPage = jest.fn(async () => undefined);
  const refetch = jest.fn(async () => undefined);
  const base = { hasNextPage: true, isFetchingNextPage: false, fetchNextPage, refetch };
  const { result, rerender } = await renderHook((p: typeof base) => usePagedActions(p), { initialProps: base });
  const first = result.current;
  await act(async () => first.loadMore());
  expect(fetchNextPage).toHaveBeenCalledTimes(1);
  await rerender({ ...base });
  expect(result.current.loadMore).toBe(first.loadMore);
  expect(result.current.refresh).toBe(first.refresh);
  await rerender({ ...base, isFetchingNextPage: true });
  await act(async () => result.current.loadMore());
  expect(fetchNextPage).toHaveBeenCalledTimes(1);
});
