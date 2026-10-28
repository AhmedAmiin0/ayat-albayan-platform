import { QueryClient } from '@tanstack/react-query';
import { thread } from '../../shared/thread-fixtures';
import { chatWindowOpen } from './chat-window';
import { threadKey } from './thread-cache';

const PHONE = '+966501112223';
const NOW = new Date('2026-10-28T10:00:00Z');
// gcTime Infinity: no gc timer keeps the worker alive.
const newClient = () => new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });

function cached(lastInbound: string | null) {
  const client = newClient();
  const page = { thread: { ...thread, last_inbound_at: lastInbound }, messages: [], has_more: false, lessons: [] };
  client.setQueryData(threadKey(PHONE), { pages: [page], pageParams: [undefined] });
  return client;
}

test('open within 24 h of the family’s last message, closed after; an unknown chat reads closed', () => {
  expect(chatWindowOpen(cached('2026-10-28T09:00:00Z'), PHONE, NOW)).toBe(true);
  expect(chatWindowOpen(cached('2026-10-27T09:00:00Z'), PHONE, NOW)).toBe(false);
  expect(chatWindowOpen(cached(null), PHONE, NOW)).toBe(false);
  expect(chatWindowOpen(newClient(), PHONE, NOW)).toBe(false);
});
