import { THREAD_FULL_MS } from '@ab/client-core';
import type { MessageStatus } from '@ab/shared';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { cachedThread, delivered, detail, inbound, PHONE } from '@/inbox/shared/thread-fixtures';
import { threadKey, threadMessages, threadPath } from './thread-cache';
import { useThread } from './use-thread';

// docs/43 AU12 (BUG8): a page poll may answer with an older status than a delta merged while it
// was out; that tick never goes back (✓✓ → ✓). A poll asked after the cache last moved is the
// newest truth and replaces it (43-1); failed / a retry back to queued always come through.

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('@/core/ui/connecting/use-screen-focus', () => ({ useScreenFocused: () => true }));

const PATH = threadPath(PHONE);
const EMPTY_DELTA = { messages: [], has_more: false, pending: [] };

/** The page poll answers m2 with `status`; every delta answers nothing new. */
function servePage(status: MessageStatus) {
  const page = detail([inbound, { ...delivered, status }]);
  mockApiFetch.mockImplementation(async (path: string) => (path === PATH ? page : EMPTY_DELTA));
}

async function openWith(cached: MessageStatus) {
  servePage('delivered');
  const client = createTestQueryClient();
  const hook = await renderHook(() => useThread(PHONE), { wrapper: queryWrapper(client) });
  await waitFor(() => expect(hook.result.current.data).toBeDefined());
  const page = detail([inbound, { ...delivered, status: cached }]);
  await act(async () => void client.setQueryData(threadKey(PHONE), cachedThread(page)));
  // The cache itself (what every screen reads), not a render of it.
  const m2 = () => threadMessages(client.getQueryData(threadKey(PHONE))).find((m) => m.id === 'm2');
  return { client, m2 };
}

beforeEach(() => {
  jest.useFakeTimers();
  mockApiFetch.mockReset();
});
afterEach(() => jest.useRealTimers());

test('a delta that lands while the page poll is out keeps its ✓✓ read over the older answer', async () => {
  const { client, m2 } = await openWith('delivered');
  let answer: (page: unknown) => void = () => undefined;
  mockApiFetch.mockImplementation((path: string) =>
    path === PATH ? new Promise((resolve) => (answer = resolve)) : Promise.resolve(EMPTY_DELTA),
  );
  await act(() => jest.advanceTimersByTimeAsync(THREAD_FULL_MS)); // the page poll is out
  await act(() => jest.advanceTimersByTimeAsync(5));
  const read = detail([inbound, { ...delivered, status: 'read' }]);
  await act(async () => void client.setQueryData(threadKey(PHONE), cachedThread(read)));
  await act(async () => answer(detail([inbound, { ...delivered, status: 'sent' }])));
  expect(m2()?.status).toBe('read');
});

test('a page poll asked after the cache last moved replaces the tick, even a lower one', async () => {
  const { m2 } = await openWith('delivered');
  servePage('queued'); // the server re-queued it (a retry after failed)
  await act(() => jest.advanceTimersByTimeAsync(THREAD_FULL_MS));
  await waitFor(() => expect(m2()?.status).toBe('queued'));
});

test('a page poll further along wins', async () => {
  const { m2 } = await openWith('sent');
  servePage('read');
  await act(() => jest.advanceTimersByTimeAsync(THREAD_FULL_MS));
  await waitFor(() => expect(m2()?.status).toBe('read'));
});

test('failed → queued (a retry) and failed → sent by hand come through', async () => {
  const { m2 } = await openWith('failed');
  servePage('queued');
  await act(() => jest.advanceTimersByTimeAsync(THREAD_FULL_MS));
  await waitFor(() => expect(m2()?.status).toBe('queued'));
  servePage('sent_manually');
  await act(() => jest.advanceTimersByTimeAsync(THREAD_FULL_MS));
  await waitFor(() => expect(m2()?.status).toBe('sent_manually'));
});
