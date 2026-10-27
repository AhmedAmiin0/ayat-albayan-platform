import { INBOX_FALLBACK_MS, INBOX_LIST_REFRESH_MS } from '@ab/client-core';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { inboxLive } from '../thread/live';
import { useThreadList } from './use-thread-list';

// The chats tab re-reads its list while focused, so unread counts and order update (owner 2026-10-27).

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
let mockFocused = true;
jest.mock('@/core/ui/connecting/use-screen-focus', () => ({ useScreenFocused: () => mockFocused }));

const tick = () => act(() => jest.advanceTimersByTimeAsync(INBOX_LIST_REFRESH_MS));

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
afterEach(async () => {
  await act(async () => inboxLive.setLive(false));
  jest.useRealTimers();
});

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

test('realtime SUBSCRIBED: the chats tab re-reads every 60 s only; dropped: every 30 s again', async () => {
  await act(async () => inboxLive.setLive(true));
  await mount(true);
  await tick();
  expect(mockApiFetch).toHaveBeenCalledTimes(1);
  await act(() => jest.advanceTimersByTimeAsync(INBOX_FALLBACK_MS - INBOX_LIST_REFRESH_MS));
  expect(mockApiFetch).toHaveBeenCalledTimes(2);
  await act(async () => inboxLive.setLive(false));
  await tick();
  expect(mockApiFetch).toHaveBeenCalledTimes(3);
});

test('the forward picker never watches or forgets the chats tab’s live state', async () => {
  const watch = jest.spyOn(inboxLive, 'watch');
  const forget = jest.spyOn(inboxLive, 'forget');
  const client = createTestQueryClient();
  const hook = await renderHook(() => useThreadList({ search: '', unread: false }), { wrapper: queryWrapper(client) });
  await hook.unmount();
  expect([watch.mock.calls.length, forget.mock.calls.length]).toEqual([0, 0]);
});
