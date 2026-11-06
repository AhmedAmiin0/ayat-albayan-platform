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

test('a list answer still saying pending shows the ✓ its chat already merged', async () => {
  mockApiFetch.mockResolvedValue(page('queued'));
  const client = createTestQueryClient();
  client.setQueryData(threadKey(PHONE), chatWith('sent'));
  const { result } = await renderHook(() => useThreadList({ search: '', unread: false }), {
    wrapper: queryWrapper(client),
  });
  await waitFor(() => expect(result.current.items[0]?.last_status).toBe('sent'));
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

test('a list marked stale while hidden (a send) reads again when it shows, joining a read in flight', async () => {
  const client = createTestQueryClient();
  client.setQueryData(KEY, listCache([row('queued')]));
  const refetch = jest.spyOn(client, 'refetchQueries').mockResolvedValue(undefined);
  const invalidate = jest.spyOn(client, 'invalidateQueries');
  const hook = await catchUp(client);
  refreshLists(client); // nothing on screen: marked stale only (docs/43 AU2)
  expect(invalidate).toHaveBeenCalledWith({ queryKey: threadListKey, refetchType: 'none' });
  expect(refetch.mock.calls.filter(([f]) => f?.queryKey?.[1] === 'list')).toEqual([]);
  await hook.rerender({ focused: true });
  expect(refetch).toHaveBeenCalledWith({ queryKey: KEY, exact: true }, { cancelRefetch: false });
  // On screen, a refresh re-reads at once; hidden again, it waits.
  refreshLists(client);
  expect(invalidate).toHaveBeenLastCalledWith({ queryKey: ['chat-lists'] });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: threadListKey, refetchType: 'active' });
  await hook.rerender({ focused: false });
  invalidate.mockClear();
  refreshLists(client);
  expect(invalidate).toHaveBeenCalledWith({ queryKey: threadListKey, refetchType: 'none' });
  await hook.unmount();
});
