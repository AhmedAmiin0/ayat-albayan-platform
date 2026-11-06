import type { ThreadView } from '@ab/shared';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { delivered, detail, inbound, listCache, message, PHONE, thread } from '@/inbox/shared/thread-fixtures';
import { missedChange } from '@/inbox/thread/live';
import { refreshInbox, refreshLists, threadListKey, useInboxRead } from './inbox-sync';
import type { ThreadListCache } from './thread-list-cache';
import { useSendMessage, useThread } from './use-thread';

const mockApiSend = jest.fn();
const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
  apiFetch: (...mockArgs: unknown[]) => mockApiFetch(...mockArgs),
}));

const other: ThreadView = { ...thread, phone_e164: '+966500000001', display_name: 'سارة' };
const ALL = ['threads', 'list', { search: '', unread: false }];
const UNREAD = ['threads', 'list', { search: '', unread: true }];
const HIDDEN_LISTS = { queryKey: threadListKey, refetchType: 'none' };
const top = (client: ReturnType<typeof createTestQueryClient>, key: unknown[]) =>
  client.getQueryData<ThreadListCache>(key)?.pages[0]?.items[0];

beforeEach(() => jest.clearAllMocks());

test('refreshInbox: the thread (and its search window), every chats list, the tab badge and «القوائم»; no phone → every chat', async () => {
  const client = createTestQueryClient();
  const spy = jest.spyOn(client, 'invalidateQueries');
  await refreshInbox(client, PHONE);
  const keys = spy.mock.calls.map(([filters]) => filters?.queryKey);
  expect(keys).toEqual([threadListKey, ['threads', 'nav-count'], ['chat-lists'], ['threads', PHONE], ['thread-at', PHONE]]);
  spy.mockClear();
  await refreshInbox(client);
  expect(spy.mock.calls.map(([filters]) => filters?.queryKey)).toEqual([['chat-lists'], ['threads']]);
});

test('a send moves the chat to the top of every cached list at once, then marks the lists stale', async () => {
  let answer: (row: unknown) => void = () => undefined;
  mockApiSend.mockReturnValue(new Promise((resolve) => (answer = resolve)));
  const client = createTestQueryClient();
  client.setQueryData(ALL, listCache([other, thread]));
  client.setQueryData(UNREAD, listCache([other]));
  const spy = jest.spyOn(client, 'invalidateQueries');
  const { result } = await renderHook(() => useSendMessage(PHONE), { wrapper: queryWrapper(client) });
  await act(async () => result.current.mutate({ id: 'p1', out: { kind: 'text', text: 'وصلت' } }));
  // Before the API answers: on top, with the provisional row as its last message.
  await waitFor(() => expect(top(client, ALL)).toMatchObject({ phone_e164: PHONE, last_body: 'وصلت', last_status: 'queued' }));
  expect(top(client, UNREAD)).toBe(other); // a list without the chat waits for its refetch
  expect(spy).not.toHaveBeenCalledWith(expect.objectContaining({ queryKey: threadListKey }));
  await act(async () => answer(message({ id: 'p1', body: 'وصلت', status: 'sent' })));
  // The list is under the chat: marked stale, not read again until it shows (docs/43 AU2).
  await waitFor(() => expect(spy).toHaveBeenCalledWith(HIDDEN_LISTS));
  expect(spy).toHaveBeenCalledWith({ queryKey: ['threads', PHONE] });
});

function useOpenChat(phone: string) {
  const query = useThread(phone);
  useInboxRead(phone, query);
  return query;
}

test('opening a chat clears its unread badge once the API answered; a refetch with nothing new refetches no list', async () => {
  mockApiFetch.mockResolvedValue(detail([inbound, delivered]));
  const client = createTestQueryClient();
  client.setQueryData(ALL, listCache([other, { ...thread, unread_count: 2 }]));
  const spy = jest.spyOn(client, 'invalidateQueries');
  const { result } = await renderHook(() => useOpenChat(PHONE), { wrapper: queryWrapper(client) });
  await waitFor(() => expect(client.getQueryData<ThreadListCache>(ALL)?.pages[0]?.items[1]?.unread_count).toBe(0));
  expect(spy).toHaveBeenCalledWith({ queryKey: ['threads', 'nav-count'] });
  expect(spy).not.toHaveBeenCalledWith({ queryKey: ['threads', PHONE] }); // the thread is not fetched twice
  spy.mockClear();
  await act(async () => void (await result.current.refetch()));
  expect(spy).not.toHaveBeenCalled();
  // A newer received message in the open chat reads it again.
  const later = message({ id: 'm4', direction: 'inbound', body: 'تمام', created_at: '2026-10-02T08:20:00Z' });
  mockApiFetch.mockResolvedValue(detail([inbound, delivered, later]));
  await act(async () => void (await result.current.refetch()));
  await waitFor(() => expect(spy).toHaveBeenCalledWith(HIDDEN_LISTS));
});

test('a saved copy shown before the API answers reads nothing', async () => {
  mockApiFetch.mockReturnValue(new Promise(() => undefined));
  const client = createTestQueryClient();
  client.setQueryData(['threads', PHONE], { pages: [detail([inbound])], pageParams: [undefined] });
  client.setQueryData(ALL, listCache([{ ...thread, unread_count: 2 }]));
  await renderHook(() => useOpenChat(PHONE), { wrapper: queryWrapper(client) });
  expect(top(client, ALL)?.unread_count).toBe(2);
});

test('a send and an opened chat keep the lists\' read time (the mark survives)', async () => {
  mockApiFetch.mockResolvedValue(detail([inbound, delivered]));
  mockApiSend.mockReturnValue(new Promise(() => undefined));
  const client = createTestQueryClient();
  client.setQueryData(ALL, listCache([other, { ...thread, unread_count: 2 }]), { updatedAt: 1000 });
  refreshLists(client); // an earlier change while the list is hidden (a send's settle, an event)
  const wrapper = queryWrapper(client);
  await renderHook(() => useOpenChat(PHONE), { wrapper });
  const unread = () => client.getQueryData<ThreadListCache>(ALL)?.pages[0]?.items[1]?.unread_count;
  await waitFor(() => expect(unread()).toBe(0));
  const send = await renderHook(() => useSendMessage(PHONE), { wrapper });
  await act(async () => send.result.current.mutate({ id: 'p2', out: { kind: 'text', text: 'تم' } }));
  await waitFor(() => expect(top(client, ALL)).toMatchObject({ phone_e164: PHONE, last_body: 'تم' }));
  expect(client.getQueryState(ALL)?.dataUpdatedAt).toBe(1000);
  expect(missedChange(client, ALL)).toBe(true); // back on screen it still reads again
});
