import { act, renderHook, waitFor } from '@testing-library/react-native';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { usePagedPages } from './use-paged-pages';

const row = (id: string) => ({ id });

test('asks the loader page by page and joins the rows in order', async () => {
  const loadPage = jest
    .fn()
    .mockResolvedValueOnce({ items: [row('a'), row('b')], total: 3, page: 1, pageSize: 2 })
    .mockResolvedValueOnce({ items: [row('c')], total: 3, page: 2, pageSize: 2 });
  const { result } = await renderHook(
    () => {
      const list = usePagedPages({ queryKey: ['rows'], loadPage });
      return { list, hasNext: list.hasNextPage, items: list.items, total: list.total };
    },
    { wrapper: queryWrapper(createTestQueryClient()) },
  );
  await waitFor(() => expect(result.current.hasNext).toBe(true));
  await act(async () => {
    await result.current.list.fetchNextPage();
  });
  await waitFor(() => expect(result.current.items.map((r) => r.id)).toEqual(['a', 'b', 'c']));
  expect(loadPage.mock.calls.map(([page]) => page)).toEqual([1, 2]);
  expect(result.current.total).toBe(3);
  expect(result.current.hasNext).toBe(false);
});

test('a failed page leaves no rows and no total', async () => {
  const loadPage = jest.fn().mockRejectedValue(new Error('offline'));
  const { result } = await renderHook(
    () => {
      const list = usePagedPages({ queryKey: ['rows'], loadPage });
      return { isError: list.isError, items: list.items, total: list.total };
    },
    { wrapper: queryWrapper(createTestQueryClient()) },
  );
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.items).toEqual([]);
  expect(result.current.total).toBe(0);
});
