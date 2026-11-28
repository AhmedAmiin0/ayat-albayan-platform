import { renderHook, waitFor } from '@testing-library/react-native';

import { createTestQueryClient, queryWrapper } from '@/test/query';
import { thread } from '@/inbox/shared/thread-fixtures';
import { useThreadList } from '@/inbox/threads-list/use-thread-list/use-thread-list';

const mockApiFetch = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (...a: unknown[]) => mockApiFetch(...a),
}));
jest.mock('@ab/mobile-kit/ui/connecting/use-screen-focus', () => ({
  useScreenFocused: () => true,
}));

const FILTERS = { search: 'هدى', unread: true, list: 'vip', status: 'new' } as const;

async function read(answer: unknown) {
  mockApiFetch.mockReset().mockResolvedValue(answer);
  const client = createTestQueryClient();
  const { result } = await renderHook(() => useThreadList(FILTERS), {
    wrapper: queryWrapper(client),
  });
  const listError = () =>
    client.getQueryCache().find({ queryKey: ['threads', 'list'], exact: false })?.state.error;
  return { result, listError };
}

test('reads GET /threads with the filters and the first page, and keeps its chats', async () => {
  const { result } = await read({ items: [thread], total: 1, page: 1, pageSize: 25 });
  await waitFor(() => expect(result.current.total).toBe(1));
  expect(mockApiFetch).toHaveBeenCalledWith(
    '/threads?search=%D9%87%D8%AF%D9%89&unread=true&list=vip&status=new&page=1&pageSize=25',
    { signal: expect.any(AbortSignal) },
  );
  expect(result.current.items).toEqual([thread]);
});

test('a chat row without a lead stage it knows fails the read', async () => {
  const row = { ...thread, lead_status: 'unknown' };
  const { listError } = await read({ items: [row], total: 1, page: 1, pageSize: 25 });
  await waitFor(() => expect(listError()).toMatchObject({ body: { code: 'bad_response' } }));
});
