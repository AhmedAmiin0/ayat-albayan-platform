import { createTestQueryClient } from '@/test/query';
import { listCache, message, PHONE, thread } from '@/inbox/shared/thread-fixtures';
import { patchLists, replaceListRows } from './list-edits';
import type { ThreadListCache } from './thread-list-cache';

// The stuck «pending» in the chats list: the list row a send wrote with its
// provisional id takes the API row's id and tick, and an event's tick moves cached lists at once.

const ALL = ['threads', 'list', { search: '', unread: false }];
const UNREAD = ['threads', 'list', { search: '', unread: true }];
const top = (client: ReturnType<typeof createTestQueryClient>, key: unknown[]) =>
  client.getQueryData<ThreadListCache>(key)?.pages[0]?.items[0];

test('a send answered: every cached list row with the provisional id takes the API row', () => {
  const client = createTestQueryClient();
  const sending = { ...thread, last_message_id: 'tmp-1', last_status: 'queued' as const };
  client.setQueryData(ALL, listCache([sending]), { updatedAt: 1000 });
  client.setQueryData(UNREAD, listCache([sending]), { updatedAt: 2000 });
  const row = message({ id: 'srv-1', status: 'sent', direction: 'outbound', body: 'hi' });
  replaceListRows(client, 'tmp-1', row);
  for (const key of [ALL, UNREAD]) {
    expect([top(client, key)?.last_message_id, top(client, key)?.last_status]).toEqual(['srv-1', 'sent']);
  }
  expect(client.getQueryState(ALL)?.dataUpdatedAt).toBe(1000); // an edit, not a read
});

test('an event with rows moves the tick of every cached list at once, never back', () => {
  const client = createTestQueryClient();
  client.setQueryData(ALL, listCache([{ ...thread, last_status: 'sent' }]), { updatedAt: 1000 });
  patchLists(client, [{ id: thread.last_message_id, s: 'read', d: 'outbound', at: '' }]);
  expect(top(client, ALL)?.last_status).toBe('read');
  patchLists(client, [{ id: thread.last_message_id, s: 'delivered', d: 'outbound', at: '' }]);
  expect(top(client, ALL)?.last_status).toBe('read');
  expect(top(client, ALL)?.phone_e164).toBe(PHONE);
  expect(client.getQueryState(ALL)?.dataUpdatedAt).toBe(1000);
});
