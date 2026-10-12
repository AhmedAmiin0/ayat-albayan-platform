import type { NotificationItem, NotificationsPage } from '@ab/shared';
import { t } from '@/lib/i18n';
import { bellBadge, bellLabel, markedRead } from './notifications-cache';

const row = (id: string, read_at: string | null = null): NotificationItem => ({
  id, kind: 'new_message', title: 'x', body: 'y', data: {}, created_at: '2026-10-12T08:00:00Z', read_at,
});
const page = (items: NotificationItem[], unread: number): NotificationsPage => ({ items, total: items.length, page: 1, pageSize: 20, unread });
const AT = '2026-10-12T09:00:00.000Z';

test('the badge: none at 0, the count up to nine, «9+» above', () => {
  expect(bellBadge(0)).toBeNull();
  expect(bellBadge(-1)).toBeNull();
  expect(bellBadge(1)).toBe('1');
  expect(bellBadge(9)).toBe('9');
  expect(bellBadge(10)).toBe('9+');
  expect(bellBadge(250)).toBe('9+');
});

test('the spoken name says the count only when there is one', () => {
  expect(bellLabel(0)).toBe(t.bell.mobile.open);
  expect(bellLabel(12)).toBe(t.bell.mobile.openUnread.replace('{n}', '12'));
});

test('marking some rows read stamps them and lowers the count by what changed', () => {
  const next = markedRead(page([row('a'), row('b'), row('c', AT)], 5), { ids: ['a', 'c'], at: AT });
  expect(next?.items.map((i) => i.read_at)).toEqual([AT, null, AT]);
  expect(next?.unread).toBe(4); // c was already read
});

test('marking all clears the count, even rows beyond this page', () => {
  const next = markedRead(page([row('a'), row('b')], 30), { at: AT });
  expect(next?.items.every((i) => i.read_at === AT)).toBe(true);
  expect(next?.unread).toBe(0);
});

test('nothing cached: nothing to edit', () => {
  expect(markedRead(undefined, { at: AT })).toBeUndefined();
});
