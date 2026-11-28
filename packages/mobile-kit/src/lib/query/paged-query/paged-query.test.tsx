import { act, renderHook } from '@testing-library/react-native';
import { usePagedQuery } from './paged-query';
import type { InfinitePages } from './paged-query.types';

interface Page {
  items: string[];
}
const rowsOf = (p: Page) => p.items;
const query = (over: Partial<InfinitePages<Page>> = {}): InfinitePages<Page> => ({
  data: { pages: [{ items: ['a', 'b'] }, { items: ['c'] }] },
  hasNextPage: true,
  isFetchingNextPage: false,
  isError: false,
  isPending: false,
  fetchNextPage: jest.fn(async () => undefined),
  refetch: jest.fn(async () => undefined),
  ...over,
});

test('every page, in order, as one list of rows', async () => {
  const { result } = await renderHook(() => usePagedQuery(query(), rowsOf));
  expect(result.current.items).toEqual(['a', 'b', 'c']);
});

test('the end asks for the next page when there is one', async () => {
  const q = query();
  const { result } = await renderHook(() => usePagedQuery(q, rowsOf));
  result.current.loadMore();
  expect(q.fetchNextPage).toHaveBeenCalledTimes(1);
});

test('no next page, or one already on its way: the end asks for nothing', async () => {
  const last = query({ hasNextPage: false });
  const busy = query({ isFetchingNextPage: true });
  const a = await renderHook(() => usePagedQuery(last, rowsOf));
  const b = await renderHook(() => usePagedQuery(busy, rowsOf));
  a.result.current.loadMore();
  b.result.current.loadMore();
  expect(last.fetchNextPage).not.toHaveBeenCalled();
  expect(busy.fetchNextPage).not.toHaveBeenCalled();
  expect(b.result.current.loadingMore).toBe(true);
});

test('a pull refetches and spins until it ends', async () => {
  const q = query();
  const { result } = await renderHook(() => usePagedQuery(q, rowsOf));
  await act(async () => result.current.refresh());
  expect(q.refetch).toHaveBeenCalledTimes(1);
  expect(result.current.pulling).toBe(false);
});

test('failed only when there are no rows to keep; loading before the first page', async () => {
  const cold = query({ data: undefined, isError: true });
  const warm = query({ isError: true });
  const first = query({ data: undefined, isPending: true });
  expect((await renderHook(() => usePagedQuery(cold, rowsOf))).result.current.failed).toBe(true);
  expect((await renderHook(() => usePagedQuery(warm, rowsOf))).result.current.failed).toBe(false);
  expect((await renderHook(() => usePagedQuery(first, rowsOf))).result.current).toEqual(
    expect.objectContaining({ items: [], loading: true, failed: false }),
  );
});
