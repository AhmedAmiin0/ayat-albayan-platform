import type { ThreadView } from '@ab/shared';
import { cachedThread, delivered, detail, inbound, listCache, message, PHONE, thread } from '../../shared/thread-fixtures';
import { clearUnread, newestInbound, type ThreadListCache, touchList } from './thread-list-cache';

const other: ThreadView = { ...thread, phone_e164: '+966500000001', display_name: 'سارة' };
const third: ThreadView = { ...thread, phone_e164: '+966500000002', display_name: 'مريم' };

const sent = message({ id: 'p1', body: 'وصلت الرسالة', created_at: '2026-10-02T09:00:00Z' });
const phones = (data: ThreadListCache | undefined) => data?.pages.map((p) => p.items.map((th) => th.phone_e164));

test('a send moves its chat to the top of the newest page with the new last message', () => {
  const next = touchList(listCache([other, third], [thread]), sent);
  expect(phones(next)).toEqual([[PHONE, other.phone_e164, third.phone_e164], []]);
  expect(next?.pages[0]?.items[0]).toMatchObject({
    last_message_id: 'p1',
    last_body: 'وصلت الرسالة',
    last_direction: 'outbound',
    last_status: 'queued',
    last_message_at: '2026-10-02T09:00:00Z',
    display_name: thread.display_name,
  });
});

test('a list without the chat (another filter, a search) and an empty cache stay as they are', () => {
  const data = listCache([other]);
  expect(touchList(data, sent)).toBe(data);
  expect(touchList(undefined, sent)).toBeUndefined();
});

test('an opened chat loses its unread badge; nothing to clear returns the same object', () => {
  const data = listCache([other, { ...thread, unread_count: 3 }]);
  const next = clearUnread(data, PHONE);
  expect(next?.pages[0]?.items.map((th) => th.unread_count)).toEqual([0, 0]);
  expect(next?.pages[0]?.items[0]).toBe(other);
  expect(clearUnread(next, PHONE)).toBe(next);
  expect(clearUnread(undefined, PHONE)).toBeUndefined();
});

test('the newest received message is read from the newest page', () => {
  expect(newestInbound(cachedThread(detail([inbound, delivered])))).toBe('m1');
  expect(newestInbound(cachedThread(detail([delivered])))).toBe('');
  expect(newestInbound(undefined)).toBe('');
});
