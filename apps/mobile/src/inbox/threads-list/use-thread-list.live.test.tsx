import { INBOX_REFRESH_MS } from '@ab/client-core';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { useThreadList } from './use-thread-list';

// The chats tab re-reads its list while focused, so unread counts and order update (owner 2026-10-27).

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
let mockFocused = true;
jest.mock('@/core/ui/connecting/use-screen-focus', () => ({ useScreenFocused: () => mockFocused }));

const tick = () => act(() => jest.advanceTimersByTimeAsync(INBOX_REFRESH_MS));

async function mount(live: boolean) {
  const client = createTestQueryClient();
  const hook = await renderHook(() => useThreadList({ search: '', unread: false, live }), { wrapper: queryWrapper(client) });
  await waitFor(() => expect(hook.result.current.data).toBeDefined());
}

beforeEach(() => {
  jest.useFakeTimers();
  mockFocused = true;
  mockApiFetch.mockReset().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 25 });
});
afterEach(() => jest.useRealTimers());

test('the focused chats tab re-reads once per interval', async () => {
  await mount(true);
  await tick();
  expect(mockApiFetch).toHaveBeenCalledTimes(2);
  await tick();
  expect(mockApiFetch).toHaveBeenCalledTimes(3);
});

test('a blurred chats tab and the forward picker never poll', async () => {
  mockFocused = false;
  await mount(true);
  mockFocused = true;
  await mount(false);
  await tick();
  await tick();
  expect(mockApiFetch).toHaveBeenCalledTimes(2);
});
