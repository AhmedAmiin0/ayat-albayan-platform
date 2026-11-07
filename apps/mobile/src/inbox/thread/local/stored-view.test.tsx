import { act, renderHook, waitFor } from '@testing-library/react-native';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { memoryPort } from '@/test/node-sql';
import { PHONE, thread } from '@/inbox/shared/thread-fixtures';
import { useThread } from '@/inbox/thread/hooks/use-thread';
import { createMessageStore } from '@/inbox/thread/store/message-store';
import { applyAs, id, plan, row } from '@/inbox/thread/store/store-fixtures';
import { storeReader } from './store-session';
import { storedPage, viewOf } from './stored-view';

// docs/43 43-7: the chat reads the phone store: on screen before its GET, its ticks, new rows.

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('@/core/ui/connecting/use-screen-focus', () => ({ useScreenFocused: () => false }));

const mine = (n: number, status: 'sent' | 'read' = 'sent') => row({ n, phone: PHONE, status });
const page = (...messages: ReturnType<typeof mine>[]) => ({
  thread,
  messages,
  has_more: false,
  lessons: [],
  people: { guardian: null, lead: null, students: [] },
});

async function storeWith(...rows: ReturnType<typeof mine>[]) {
  const store = createMessageStore(memoryPort().port);
  await store.open('user-a');
  await applyAs(store, plan(rows, { threads: [{ ...thread, last_message_id: id(rows.length) }] }));
  storeReader.attach(store, 'user-a');
  return store;
}

afterEach(() => storeReader.detach());

test('storedPage: the rows oldest → newest, one page, no older one', () => {
  const out = storedPage([mine(2), mine(1)], thread);
  expect(out.pages[0]?.messages.map((m) => m.id)).toEqual([id(1), id(2)]);
  expect([out.pages[0]?.has_more, out.pageParams]).toEqual([false, [null]]);
  expect(viewOf(undefined, [], null)).toBeUndefined();
});

test('before its GET answers, the chat shows the stored rows (offline open)', async () => {
  await storeWith(mine(1), mine(2));
  mockApiFetch.mockReturnValue(new Promise(() => undefined));
  const { result } = await renderHook(() => useThread(PHONE), {
    wrapper: queryWrapper(createTestQueryClient()),
  });
  await waitFor(() => expect(result.current.data?.pages[0]?.messages).toHaveLength(2));
  expect(result.current.data?.pages[0]?.thread?.phone_e164).toBe(thread.phone_e164);
});

test('the GET answered: its pages, with the store’s tick and a row only a sync brought', async () => {
  const store = await storeWith(mine(1, 'read'));
  mockApiFetch.mockResolvedValue(page(mine(1, 'sent')));
  const { result } = await renderHook(() => useThread(PHONE), {
    wrapper: queryWrapper(createTestQueryClient()),
  });
  await waitFor(() => expect(result.current.data?.pages[0]?.messages[0]?.status).toBe('read'));
  await act(async () => {
    await applyAs(store, plan([mine(5)]));
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
  expect(result.current.data?.pages[0]?.messages.map((m) => m.id)).toEqual([id(1), id(5)]);
});

test('thread pages never go to disk (the store keeps the chat)', async () => {
  mockApiFetch.mockResolvedValue(page(mine(1)));
  const client = createTestQueryClient();
  await renderHook(() => useThread(PHONE), { wrapper: queryWrapper(client) });
  const query = client.getQueryCache().find({ queryKey: ['threads', PHONE] });
  expect(query?.meta?.noPersist).toBe(true);
});
