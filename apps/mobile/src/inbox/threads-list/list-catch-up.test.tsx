import type { MessageStatus, ThreadView } from '@ab/shared';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { cachedThread, delivered, detail, inbound, listCache, PHONE, thread } from '@/inbox/shared/thread-fixtures';
import { refreshLists, threadListKey } from '@/inbox/thread/hooks/inbox-sync';
import { threadKey } from '@/inbox/thread/hooks/thread-cache';
import type { ThreadListCache } from '@/inbox/thread/hooks/thread-list-cache';
import { useListCatchUp } from './list-catch-up';
import { useThreadList } from './use-thread-list';

// docs/43 §2 (the owner's «pending in the list»): the list row follows the tick its chat merged.

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
let mockFocused = true;
jest.mock('@/core/ui/connecting/use-screen-focus', () => ({ useScreenFocused: () => mockFocused }));

const KEY = ['threads', 'list', { search: '', unread: false }];
const row = (last_status: MessageStatus): ThreadView => ({ ...thread, last_status });
const chatWith = (status: MessageStatus) =>
  cachedThread(detail([inbound, { ...delivered, status }]));
const page = (status: MessageStatus) => ({ items: [row(status)], total: 1, page: 1, pageSize: 25 });
type Client = ReturnType<typeof createTestQueryClient>;
const listed = (client: Client) => client.getQueryData<ThreadListCache>(KEY)?.pages[0]?.items[0];

beforeEach(() => {
  mockFocused = true;
  mockApiFetch.mockReset();
});

const mountList = (client: Client) =>
  renderHook(() => useThreadList({ search: '', unread: false }), { wrapper: queryWrapper(client) });

test('a list answer still saying pending shows the ✓ a newer chat read already merged', async () => {
  mockApiFetch.mockReturnValue(new Promise(() => undefined)); // its own refetch never answers
  const client = createTestQueryClient();
  client.setQueryData(KEY, listCache([row('queued')]), { updatedAt: 1000 });
  client.setQueryData(threadKey(PHONE), chatWith('sent'));
  const { result } = await mountList(client);
  await waitFor(() => expect(result.current.items[0]?.last_status).toBe('sent'));
});

test('a chat copy older than the list never lifts it (a delivered message the server re-queued)', async () => {
  mockApiFetch.mockReturnValue(new Promise(() => undefined));
  const client = createTestQueryClient();
  client.setQueryData(threadKey(PHONE), chatWith('delivered'), { updatedAt: 500 });
  client.setQueryData(KEY, listCache([row('queued')]), { updatedAt: 1000 });
  const { result } = await mountList(client);
  await waitFor(() => expect(result.current.items).toHaveLength(1));
  expect(result.current.items[0]?.last_status).toBe('queued');
});

test('the list answer wins when it is further along, or failed', async () => {
  mockApiFetch.mockResolvedValue(page('read'));
  const client = createTestQueryClient();
  client.setQueryData(threadKey(PHONE), chatWith('sent'));
  const wrapper = queryWrapper(client);
  const { result } = await renderHook(() => useThreadList({ search: '', unread: false }), { wrapper });
  await waitFor(() => expect(result.current.items[0]?.last_status).toBe('read'));
  mockApiFetch.mockResolvedValue(page('failed'));
  await act(async () => {
    await result.current.refetch();
  });
  await waitFor(() => expect(result.current.items[0]?.last_status).toBe('failed'));
});

async function catchUp(client: Client) {
  const wrapper = queryWrapper(client);
  const initialProps = { focused: false };
  return renderHook((props: { focused: boolean }) => useListCatchUp(KEY, props.focused), {
    wrapper,
    initialProps,
  });
}

test('back on screen: the chat\'s tick lands in the cache at once, keeping the list\'s time', async () => {
  const client = createTestQueryClient();
  client.setQueryData(KEY, listCache([row('queued')]), { updatedAt: 1000 });
  const refetch = jest.spyOn(client, 'refetchQueries');
  const hook = await catchUp(client);
  client.setQueryData(threadKey(PHONE), chatWith('delivered'));
  expect(listed(client)?.last_status).toBe('queued'); // hidden: nothing written
  await hook.rerender({ focused: true });
  expect(listed(client)?.last_status).toBe('delivered');
  expect(client.getQueryState(KEY)?.dataUpdatedAt).toBe(1000);
  expect(refetch).not.toHaveBeenCalled(); // not stale: no read
});

test('a list that missed a change while hidden reads again when it shows; shown, it reads at once', async () => {
  const client = createTestQueryClient();
  client.setQueryData(KEY, listCache([row('queued')]), { updatedAt: 1000 });
  const refetch = jest.spyOn(client, 'refetchQueries').mockResolvedValue(undefined);
  const invalidate = jest.spyOn(client, 'invalidateQueries');
  const listReads = () => refetch.mock.calls.filter(([f]) => f?.queryKey?.[1] === 'list');
  const read = [{ queryKey: KEY, exact: true }, { cancelRefetch: false }];
  const hook = await catchUp(client);
  refreshLists(client); // nothing on screen: marked only (docs/43 AU2)
  expect(invalidate).toHaveBeenCalledWith({ queryKey: threadListKey, refetchType: 'none' });
  expect(listReads()).toEqual([]);
  client.setQueryData(threadKey(PHONE), chatWith('sent')); // the lift on return keeps the time
  await hook.rerender({ focused: true });
  expect(listed(client)?.last_status).toBe('sent');
  expect(listReads()).toEqual([read]);
  refetch.mockClear();
  refreshLists(client); // on screen: read now
  expect(listReads()).toEqual([read]);
  await hook.rerender({ focused: false });
  refetch.mockClear();
  refreshLists(client); // hidden again: it waits
  expect(listReads()).toEqual([]);
  await hook.unmount();
});
