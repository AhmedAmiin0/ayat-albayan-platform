import { act, renderHook, waitFor } from '@testing-library/react-native';

import { createTestQueryClient, queryWrapper } from '@/test/query';
import { ApiError } from '@ab/mobile-kit';
import { usePagedList } from './use-paged-list';

const mockApiFetch = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
}));

beforeEach(() => mockApiFetch.mockReset());

const lead = (id: string) => ({ id, status: 'new' });

test('first page: items, total, filters and page in the request', async () => {
  mockApiFetch.mockResolvedValue({ items: [lead('a'), lead('b')], total: 3, page: 1, pageSize: 2 });
  const { result } = await renderHook(
    () => usePagedList({ path: '/leads', params: { status: 'new', q: undefined }, pageSize: 2 }),
    { wrapper: queryWrapper(createTestQueryClient()) },
  );
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(mockApiFetch).toHaveBeenCalledWith('/leads?status=new&page=1&pageSize=2');
  expect(result.current.items.map((r) => r.id)).toEqual(['a', 'b']);
  expect(result.current.total).toBe(3);
  expect(result.current.hasNextPage).toBe(true);
});

test('fetchNextPage appends the next page and stops at the end', async () => {
  mockApiFetch
    .mockResolvedValueOnce({ items: [lead('a'), lead('b')], total: 3, page: 1, pageSize: 2 })
    .mockResolvedValueOnce({ items: [lead('c')], total: 3, page: 2, pageSize: 2 });
  const client = createTestQueryClient();
  const { result } = await renderHook(() => usePagedList({ path: '/leads', pageSize: 2 }), {
    wrapper: queryWrapper(client),
  });
  await waitFor(() => expect(result.current.hasNextPage).toBe(true));
  await act(async () => {
    await result.current.fetchNextPage();
  });
  expect(mockApiFetch).toHaveBeenLastCalledWith('/leads?page=2&pageSize=2');
  await waitFor(() => expect(result.current.items.map((r) => r.id)).toEqual(['a', 'b', 'c']));
  expect(result.current.hasNextPage).toBe(false);
  expect(client.getQueryData(['leads', 'list', {}])).toBeDefined();
});

test('loadMore fetches the next page once, and nothing past the end', async () => {
  mockApiFetch
    .mockResolvedValueOnce({ items: [lead('a')], total: 2, page: 1, pageSize: 1 })
    .mockResolvedValueOnce({ items: [lead('b')], total: 2, page: 2, pageSize: 1 });
  const { result } = await renderHook(() => usePagedList({ path: '/leads', pageSize: 1 }), {
    wrapper: queryWrapper(createTestQueryClient()),
  });
  await waitFor(() => expect(result.current.hasNextPage).toBe(true));
  await act(async () => result.current.loadMore());
  await act(async () => result.current.loadMore()); // a second onEndReached while page 2 loads
  await waitFor(() => expect(result.current.items.map((r) => r.id)).toEqual(['a', 'b']));
  await act(async () => result.current.loadMore());
  expect(mockApiFetch).toHaveBeenCalledTimes(2);
  expect(mockApiFetch).toHaveBeenLastCalledWith('/leads?page=2&pageSize=1');
});

test('refresh refetches the loaded pages', async () => {
  mockApiFetch.mockResolvedValue({ items: [lead('a')], total: 1, page: 1, pageSize: 25 });
  const { result } = await renderHook(() => usePagedList({ path: '/leads' }), {
    wrapper: queryWrapper(createTestQueryClient()),
  });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  await act(async () => result.current.refresh());
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(2));
});

test('empty list is empty, not pending', async () => {
  mockApiFetch.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 25 });
  const { result } = await renderHook(() => usePagedList({ path: '/students' }), {
    wrapper: queryWrapper(createTestQueryClient()),
  });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.items).toEqual([]);
  expect(result.current.total).toBe(0);
});

test('a list with its own read asks it for each page with the signal, never by path', async () => {
  const read = jest.fn(async ({ page }: { page: number; pageSize: number }, _: AbortSignal) => ({
    items: [lead(`p${page}`)],
    total: 2,
    page,
    pageSize: 1,
  }));
  const { result } = await renderHook(
    () => usePagedList({ path: '/students', params: { teacher: 't' }, pageSize: 1, read }),
    { wrapper: queryWrapper(createTestQueryClient()) },
  );
  await waitFor(() => expect(result.current.hasNextPage).toBe(true));
  await act(async () => result.current.loadMore());
  await waitFor(() => expect(result.current.items.map((r) => r.id)).toEqual(['p1', 'p2']));
  expect(read.mock.calls.map(([at]) => at)).toEqual([
    { page: 1, pageSize: 1 },
    { page: 2, pageSize: 1 },
  ]);
  expect(read.mock.calls[0]?.[1]).toBeInstanceOf(AbortSignal);
  expect(mockApiFetch).not.toHaveBeenCalled();
});

test('a read of its own that gets a bad answer shows as the list error', async () => {
  const bad = new ApiError(200, { code: 'bad_response', path: '/teachers', issues: [] });
  const read = jest.fn(async () => Promise.reject(bad));
  const { result } = await renderHook(
    () => {
      const list = usePagedList({ path: '/teachers', read });
      return { error: list.error, items: list.items };
    },
    { wrapper: queryWrapper(createTestQueryClient()) },
  );
  await waitFor(() => expect(result.current.error).toBe(bad));
  expect(result.current.items).toEqual([]);
});
