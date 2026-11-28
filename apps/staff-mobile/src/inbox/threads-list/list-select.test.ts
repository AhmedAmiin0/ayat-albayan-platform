import type { SyncMessage, ThreadView } from '@ab/shared';
import { createTestQueryClient } from '@/test/query';
import { listCache, message, PHONE, thread } from '@/inbox/shared/thread-fixtures';
import { withStoredList } from './list-select';

// The late chats list: what the phone store already holds shows before the
// list's own read answers.

const KEY = ['threads', 'list', { search: '', unread: false }];
const OTHER = '+966500000001';
const at = (n: number) => new Date(Date.UTC(2026, 10, 28, 10, n)).toISOString();
const chat = (phone: string, n: number, over: Partial<ThreadView> = {}): ThreadView => ({
  ...thread,
  phone_e164: phone,
  last_message_id: `m${n}`,
  last_message_at: at(n),
  unread_count: 0,
  ...over,
});
type ChatOf = (phone: string) => readonly SyncMessage[];
const none: ChatOf = () => [];

function select(threads: ReadonlyMap<string, ThreadView>, chatOf: ChatOf = none) {
  const client = createTestQueryClient();
  const data = listCache([chat(OTHER, 2), chat(PHONE, 1, { last_status: 'queued' })]);
  return withStoredList(client, KEY, { threads, chat: chatOf })(data).pages[0]?.items ?? [];
}

test('a newer stored chat goes to the top with its preview and unread count', () => {
  const held = chat(PHONE, 5, { last_body: 'جديد', last_direction: 'inbound', unread_count: 3 });
  const items = select(new Map([[PHONE, held]]));
  expect(items.map((th) => th.phone_e164)).toEqual([PHONE, OTHER]);
  expect([items[0]?.last_body, items[0]?.unread_count]).toEqual(['جديد', 3]);
});

test('an older stored chat changes nothing', () => {
  const items = select(new Map([[PHONE, chat(PHONE, 0, { unread_count: 7 })]]));
  expect(items.map((th) => [th.phone_e164, th.unread_count])).toEqual([
    [OTHER, 0],
    [PHONE, 0],
  ]);
});

test("the row's tick comes from the stored message of its last message, the further along", () => {
  const stored = { ...message({ id: 'm1', status: 'delivered' }), updated_at: at(1) };
  const items = select(new Map(), (phone) => (phone === PHONE ? [stored] : []));
  expect(items[1]?.last_status).toBe('delivered');
});

test('a failed stored message never hides the list’s own tick (retry guard)', () => {
  const stored = { ...message({ id: 'm1', status: 'failed' }), updated_at: at(1) };
  const items = select(new Map(), () => [stored]);
  expect(items[1]?.last_status).toBe('queued');
});
